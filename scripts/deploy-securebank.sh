#!/bin/bash
# ============================================================================
# SecureBank Master Deployment Script
# ============================================================================
# Complete deployment workflow with security scanning, fixing, and validation
# ============================================================================

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         SECUREBANK SECURE DEPLOYMENT WORKFLOW                ║"
echo "║                                                              ║"
echo "║  Scan → Fix → Mutate → Deploy → Validate                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# ============================================================================
# STEP 1: Run CI/CD Scanners
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 1: SCANNING (CI/CD Security Scanners)                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

echo "→ Running CI scanners (SAST, secrets, dependencies)..."
cd secops/1-scanners/ci
./scan-code-sast.sh || echo "⚠️  SAST scan warnings"
./scan-secrets.sh || echo "⚠️  Secrets scan warnings"
./scan-dependencies.sh || echo "⚠️  Dependency scan warnings"
cd "$PROJECT_ROOT"

echo
echo "→ Running CD scanners (IaC, Kubernetes)..."
cd secops/1-scanners/cd
./scan-iac.sh || echo "⚠️  IaC scan warnings"
./scan-kubernetes.sh || echo "⚠️  Kubernetes scan warnings"
cd "$PROJECT_ROOT"

echo
echo "✅ Scanning complete - results in secops/2-findings/raw/"
echo

# ============================================================================
# STEP 2: Run Automated Fixers
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 2: FIXING (Automated Security Remediation)            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

cd secops/3-fixers
python3 run_all_fixers.py

if [ $? -ne 0 ]; then
    echo "❌ Fixers failed - aborting deployment"
    exit 1
fi

cd "$PROJECT_ROOT"

echo
echo "✅ Fixes applied - reports in secops/6-reports/fix-results/"
echo

# ============================================================================
# STEP 3: Deploy OPA Gatekeeper (Runtime Mutators)
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 3: MUTATORS (OPA Gatekeeper Deployment)               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "⚠️  kubectl not found - skipping Gatekeeper deployment"
    echo "   For full deployment, ensure Kubernetes cluster is accessible"
else
    # Check if cluster is accessible
    if kubectl cluster-info &> /dev/null; then
        cd secops/4-mutators
        ./deploy-gatekeeper.sh

        cd "$PROJECT_ROOT"
        echo
        echo "✅ OPA Gatekeeper deployed - runtime policies active"
        echo
    else
        echo "⚠️  No Kubernetes cluster accessible - skipping Gatekeeper"
        echo "   To deploy to Kubernetes:"
        echo "   1. Start Docker Desktop Kubernetes, OR"
        echo "   2. Create kind cluster: kind create cluster"
    fi
fi

# ============================================================================
# STEP 4: Deploy Infrastructure (Terraform to LocalStack)
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 4: INFRASTRUCTURE (Terraform → LocalStack)            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

if command -v terraform &> /dev/null; then
    echo "→ Deploying AWS infrastructure to LocalStack..."

    cd infrastructure/terraform

    # Initialize if needed
    if [ ! -d ".terraform" ]; then
        terraform init
    fi

    # Plan
    terraform plan -out=tfplan

    # Apply (if LocalStack is running)
    if curl -s http://localhost:4566/_localstack/health &> /dev/null; then
        echo "→ LocalStack detected, applying infrastructure..."
        terraform apply tfplan
        echo "✅ Infrastructure deployed to LocalStack"
    else
        echo "⚠️  LocalStack not running - skipping infrastructure deployment"
        echo "   Start LocalStack: docker-compose up -d localstack"
    fi

    cd "$PROJECT_ROOT"
else
    echo "⚠️  Terraform not installed - skipping infrastructure deployment"
fi

echo

# ============================================================================
# STEP 5: Deploy Application to Kubernetes
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 5: APPLICATION (SecureBank → Kubernetes)              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    echo "→ Deploying SecureBank application..."

    kubectl apply -f infrastructure/k8s/deployment.yaml
    kubectl apply -f infrastructure/k8s/service.yaml

    echo
    echo "⏳ Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod \
      -l app=securebank-backend \
      --timeout=120s || echo "⚠️  Pods not ready yet"

    echo
    echo "✅ Application deployed to Kubernetes"
    echo
    echo "Pods:"
    kubectl get pods -l app=securebank-backend
    echo
else
    echo "⚠️  Kubernetes not accessible - skipping application deployment"
fi

# ============================================================================
# STEP 6: Validation
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STEP 6: VALIDATION (Security & Compliance Checks)          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

echo "→ Validating deployment security..."

# Check if validators exist
if [ -f "secops/5-validators/validate-deployment.sh" ]; then
    cd secops/5-validators
    ./validate-deployment.sh
    cd "$PROJECT_ROOT"
else
    echo "⚠️  Validators not yet implemented"
    echo "   Manual validation required:"
    echo "   - Check Gatekeeper constraints: kubectl get constraints -A"
    echo "   - Verify pod security contexts: kubectl get pods -o yaml"
    echo "   - Review scan results: ls -la secops/2-findings/raw/"
fi

echo

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT COMPLETE                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo
echo "📊 Results:"
echo "  - Scan Results:    secops/2-findings/raw/"
echo "  - Fix Reports:     secops/6-reports/fix-results/"
echo "  - Compliance:      secops/6-reports/compliance/"
echo
echo "🔍 Verify deployment:"
echo "  kubectl get pods -A"
echo "  kubectl get constraints -A"
echo "  kubectl describe pod <pod-name> | grep securityContext"
echo
echo "🎯 Next steps:"
echo "  1. Review fix reports in secops/6-reports/fix-results/"
echo "  2. Verify Gatekeeper policies: kubectl get constraints -A"
echo "  3. Test application: curl http://localhost:3000/health"
echo "  4. Generate compliance reports: cd secops/6-reports && ./generate-all-reports.sh"
echo
