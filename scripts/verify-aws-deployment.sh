#!/bin/bash
# ============================================================================
# AWS DEPLOYMENT VERIFICATION SCRIPT
# ============================================================================
# Verifies that all intentional violations are present in AWS deployment
# ============================================================================

set -e

echo "🔍 SecureBank Platform - AWS Deployment Verification"
echo "===================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS_FOUND=0
VIOLATIONS_EXPECTED=106

# ============================================================================
# CHECK AWS INFRASTRUCTURE
# ============================================================================

echo "📊 Checking AWS Infrastructure Violations..."
echo ""

# Check RDS
echo -n "❌ PCI 2.3: RDS publicly accessible... "
RDS_PUBLIC=$(aws rds describe-db-instances \
  --db-instance-identifier securebank-payment-db \
  --query 'DBInstances[0].PubliclyAccessible' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$RDS_PUBLIC" = "True" ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Public)"
  ((VIOLATIONS_FOUND++))
else
  echo -e "${GREEN}SECURE${NC} (Not public)"
fi

# Check RDS Encryption
echo -n "❌ PCI 3.4: RDS encryption disabled... "
RDS_ENCRYPTED=$(aws rds describe-db-instances \
  --db-instance-identifier securebank-payment-db \
  --query 'DBInstances[0].StorageEncrypted' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$RDS_ENCRYPTED" = "False" ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Not encrypted)"
  ((VIOLATIONS_FOUND++))
else
  echo -e "${GREEN}SECURE${NC} (Encrypted)"
fi

# Check S3 Public Access
echo -n "❌ PCI 1.2.1: S3 bucket public access... "
S3_PUBLIC=$(aws s3api get-public-access-block \
  --bucket securebank-payment-receipts-production \
  --query 'PublicAccessBlockConfiguration.BlockPublicAcls' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$S3_PUBLIC" = "False" ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Public access allowed)"
  ((VIOLATIONS_FOUND++))
else
  echo -e "${GREEN}SECURE${NC} (Public access blocked)"
fi

# Check S3 Encryption
echo -n "❌ PCI 3.4: S3 encryption disabled... "
S3_ENCRYPTION=$(aws s3api get-bucket-encryption \
  --bucket securebank-payment-receipts-production 2>&1)

if echo "$S3_ENCRYPTION" | grep -q "ServerSideEncryptionConfigurationNotFoundError"; then
  echo -e "${RED}✓ VULNERABLE${NC} (No encryption)"
  ((VIOLATIONS_FOUND++))
else
  echo -e "${GREEN}SECURE${NC} (Encryption enabled)"
fi

# Check EKS Public Endpoint
echo -n "❌ PCI 2.2.1: EKS public endpoint... "
EKS_PUBLIC=$(aws eks describe-cluster \
  --name securebank-eks \
  --query 'cluster.resourcesVpcConfig.endpointPublicAccess' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$EKS_PUBLIC" = "True" ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Public endpoint)"
  ((VIOLATIONS_FOUND++))
else
  echo -e "${GREEN}SECURE${NC} (Private endpoint)"
fi

echo ""

# ============================================================================
# CHECK KUBERNETES VIOLATIONS
# ============================================================================

echo "☸️  Checking Kubernetes Violations..."
echo ""

# Check for privileged containers
echo -n "❌ PCI 2.2.4: Privileged containers... "
PRIVILEGED=$(kubectl get pods -n securebank -o jsonpath='{.items[*].spec.containers[*].securityContext.privileged}' 2>/dev/null || echo "NOT_FOUND")

if echo "$PRIVILEGED" | grep -q "true"; then
  echo -e "${RED}✓ VULNERABLE${NC} (Privileged containers found)"
  ((VIOLATIONS_FOUND+=3))
else
  echo -e "${GREEN}SECURE${NC} (No privileged containers)"
fi

# Check for root user
echo -n "❌ PCI 2.2.4: Containers running as root... "
ROOT_USER=$(kubectl get pods -n securebank -o jsonpath='{.items[*].spec.containers[*].securityContext.runAsUser}' 2>/dev/null || echo "NOT_FOUND")

if echo "$ROOT_USER" | grep -q "0" || [ "$ROOT_USER" = "" ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Running as root)"
  ((VIOLATIONS_FOUND+=3))
else
  echo -e "${GREEN}SECURE${NC} (Running as non-root)"
fi

# Check for hostNetwork
echo -n "❌ PCI 2.2.1: hostNetwork enabled... "
HOST_NETWORK=$(kubectl get pods -n securebank -o jsonpath='{.items[*].spec.hostNetwork}' 2>/dev/null || echo "NOT_FOUND")

if echo "$HOST_NETWORK" | grep -q "true"; then
  echo -e "${RED}✓ VULNERABLE${NC} (hostNetwork enabled)"
  ((VIOLATIONS_FOUND+=2))
else
  echo -e "${GREEN}SECURE${NC} (hostNetwork disabled)"
fi

# Check for LoadBalancer services (public)
echo -n "❌ PCI 1.3.1: Public LoadBalancer services... "
LB_COUNT=$(kubectl get svc -n securebank -o jsonpath='{.items[?(@.spec.type=="LoadBalancer")].metadata.name}' 2>/dev/null | wc -w || echo "0")

if [ "$LB_COUNT" -gt 0 ]; then
  echo -e "${RED}✓ VULNERABLE${NC} ($LB_COUNT public services)"
  ((VIOLATIONS_FOUND+=LB_COUNT))
else
  echo -e "${GREEN}SECURE${NC} (No public services)"
fi

# Check for hardcoded secrets in deployments
echo -n "❌ PCI 8.2.1: Hardcoded secrets in manifests... "
HARDCODED_SECRETS=$(kubectl get deployment -n securebank -o yaml 2>/dev/null | grep -c "DB_PASSWORD" || echo "0")

if [ "$HARDCODED_SECRETS" -gt 0 ]; then
  echo -e "${RED}✓ VULNERABLE${NC} (Hardcoded secrets found)"
  ((VIOLATIONS_FOUND+=5))
else
  echo -e "${GREEN}SECURE${NC} (Using K8s secrets)"
fi

echo ""

# ============================================================================
# CHECK APPLICATION VIOLATIONS
# ============================================================================

echo "💳 Checking Application-Level Violations..."
echo ""

# Get backend service endpoint
BACKEND_URL=$(kubectl get svc securebank-backend-service -n securebank -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "localhost:3000")

# Check if API is accessible
echo -n "🔌 Testing backend API connectivity... "
if curl -s --max-time 5 "http://${BACKEND_URL}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Connected${NC}"

  # Check if database stores CVV (if we can access debug endpoint)
  echo -n "❌ PCI 3.2.2: CVV storage in database... "
  if curl -s "http://${BACKEND_URL}/debug/config" 2>/dev/null | grep -q "CVV"; then
    echo -e "${RED}✓ VULNERABLE${NC} (CVV storage detected)"
    ((VIOLATIONS_FOUND+=10))
  else
    echo -e "${YELLOW}UNKNOWN${NC} (Cannot verify)"
  fi
else
  echo -e "${YELLOW}NOT ACCESSIBLE${NC} (API may still be starting)"
fi

echo ""

# ============================================================================
# CHECK S3 DATA EXPOSURE
# ============================================================================

echo "📦 Checking S3 Data Exposure..."
echo ""

# Try to access public S3 bucket
echo -n "❌ PCI 1.2.1: Public S3 bucket access... "
PUBLIC_URL="https://securebank-payment-receipts-production.s3.amazonaws.com/"

if curl -s --max-time 5 "$PUBLIC_URL" | grep -q "ListBucketResult"; then
  echo -e "${RED}✓ VULNERABLE${NC} (Bucket is publicly listable)"
  ((VIOLATIONS_FOUND+=5))
else
  echo -e "${YELLOW}UNKNOWN${NC} (Bucket may be public but not listable)"
fi

echo ""

# ============================================================================
# CHECK MONITORING EXPOSURE
# ============================================================================

echo "📊 Checking Monitoring Stack Exposure..."
echo ""

# Check Grafana public access
GRAFANA_URL=$(kubectl get svc grafana-service -n securebank -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "NOT_FOUND")

if [ "$GRAFANA_URL" != "NOT_FOUND" ]; then
  echo -n "❌ PCI 8.3: Grafana without authentication... "
  if curl -s --max-time 5 "http://${GRAFANA_URL}" | grep -q "Grafana"; then
    echo -e "${RED}✓ VULNERABLE${NC} (Publicly accessible)"
    ((VIOLATIONS_FOUND+=3))
  else
    echo -e "${YELLOW}UNKNOWN${NC} (Cannot verify)"
  fi
fi

# Check Prometheus public access
PROM_URL=$(kubectl get svc prometheus-service -n securebank -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "NOT_FOUND")

if [ "$PROM_URL" != "NOT_FOUND" ]; then
  echo -n "❌ PCI 1.3.1: Prometheus publicly exposed... "
  if curl -s --max-time 5 "http://${PROM_URL}:9090" | grep -q "Prometheus"; then
    echo -e "${RED}✓ VULNERABLE${NC} (Publicly accessible)"
    ((VIOLATIONS_FOUND+=2))
  else
    echo -e "${YELLOW}UNKNOWN${NC} (Cannot verify)"
  fi
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "=========================================="
echo "VERIFICATION SUMMARY"
echo "=========================================="
echo ""
echo "Violations Expected: $VIOLATIONS_EXPECTED"
echo "Violations Found:    $VIOLATIONS_FOUND"
echo ""

if [ "$VIOLATIONS_FOUND" -ge 20 ]; then
  echo -e "${RED}⚠️  CRITICAL: Platform is HIGHLY VULNERABLE${NC}"
  echo -e "${RED}This deployment has sufficient violations for FIS demo${NC}"
  echo ""
  echo "✅ Ready for GP-Copilot demonstration"
  echo ""
  echo "Next steps:"
  echo "1. Access frontend: http://$(kubectl get svc securebank-frontend-service -n securebank -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)"
  echo "2. Process a test payment"
  echo "3. Run GP-Copilot scan"
  echo "4. Generate compliance report"
  exit 0
else
  echo -e "${YELLOW}⚠️  WARNING: Fewer violations than expected${NC}"
  echo "Some components may not be fully deployed yet"
  echo ""
  echo "Wait a few minutes and run this script again"
  exit 1
fi