#!/bin/bash
# ============================================================================
# DEPLOY ENHANCED SECUREBANK TO KIND CLUSTER
# ============================================================================
# This script deploys the enhanced SecureBank application with:
# - Card-on-file storage
# - Merchant API
# - Intentional vulnerabilities for security testing
# ============================================================================

set -e

PROJECT_ROOT="/home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project"
CLUSTER_NAME="securebank"

echo "======================================================================"
echo "DEPLOYING ENHANCED SECUREBANK TO KIND CLUSTER"
echo "======================================================================"

# Step 1: Check if Kind cluster exists
echo ""
echo "[1/8] Checking Kind cluster..."
if ! kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "❌ Kind cluster '${CLUSTER_NAME}' not found"
    echo "Creating new cluster..."
    kind create cluster --name ${CLUSTER_NAME}
else
    echo "✓ Kind cluster '${CLUSTER_NAME}' exists"
fi

# Step 2: Build backend image
echo ""
echo "[2/8] Building backend Docker image..."
cd ${PROJECT_ROOT}/backend
npm install --production
docker build -t securebank-backend:latest .

# Step 3: Build frontend image
echo ""
echo "[3/8] Building frontend Docker image..."
cd ${PROJECT_ROOT}/frontend
docker build -t securebank-frontend:latest .

# Step 4: Load images into Kind
echo ""
echo "[4/8] Loading images into Kind cluster..."
kind load docker-image securebank-backend:latest --name ${CLUSTER_NAME}
kind load docker-image securebank-frontend:latest --name ${CLUSTER_NAME}

# Step 5: Create PostgreSQL init ConfigMap
echo ""
echo "[5/8] Creating PostgreSQL init ConfigMap..."
kubectl create configmap postgres-init \
    --from-file=${PROJECT_ROOT}/infrastructure/postgres/init-enhanced.sql \
    --namespace=securebank \
    --dry-run=client -o yaml | kubectl apply -f -

# Step 6: Deploy application
echo ""
echo "[6/8] Deploying application to Kubernetes..."
kubectl apply -f ${PROJECT_ROOT}/infrastructure/k8s/deployment-vulnerable.yaml

# Step 7: Wait for pods to be ready
echo ""
echo "[7/8] Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n securebank --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n securebank --timeout=120s
kubectl wait --for=condition=ready pod -l app=securebank-backend -n securebank --timeout=120s
kubectl wait --for=condition=ready pod -l app=securebank-frontend -n securebank --timeout=120s

# Step 8: Display deployment status
echo ""
echo "[8/8] Deployment complete!"
echo ""
echo "======================================================================"
echo "DEPLOYMENT STATUS"
echo "======================================================================"
kubectl get pods -n securebank
echo ""
kubectl get services -n securebank
echo ""
echo "======================================================================"
echo "ACCESS INFORMATION"
echo "======================================================================"
echo ""
echo "Frontend: http://localhost:8080"
echo "Backend API: http://localhost:3000"
echo ""
echo "To set up port forwarding, run:"
echo "  kubectl port-forward -n securebank service/securebank-frontend-service 8080:80"
echo "  kubectl port-forward -n securebank service/securebank-backend-service 3000:80"
echo ""
echo "======================================================================"
echo "DATABASE INFORMATION"
echo "======================================================================"
echo ""
echo "Sample users: johndoe, janesmith, bobwilson, alicejohnson, charlielee"
echo "Sample cards: 5 users with 9 total cards (full data stored)"
echo "Sample merchants: AcmeStore, TechGadgets, FoodDelivery, StreamFlix, CloudHost"
echo ""
echo "======================================================================"
echo "API ENDPOINTS"
echo "======================================================================"
echo ""
echo "Card Management:"
echo "  POST   /api/cards/add"
echo "  GET    /api/cards/:user_id"
echo "  POST   /api/cards/charge"
echo "  GET    /api/cards/admin/all"
echo ""
echo "Merchant API:"
echo "  POST   /api/v1/charge (X-API-Key header required)"
echo "  GET    /api/v1/transactions"
echo "  POST   /api/v1/refund"
echo "  GET    /api/v1/customers/:id"
echo "  POST   /api/v1/webhooks/test"
echo ""
echo "Sample API Key: acme_live_sk_4a3b2c1d5e6f7g8h9i0j"
echo ""
echo "======================================================================"
echo "READY FOR SECURITY SCANNING"
echo "======================================================================"
echo ""
echo "This deployment contains 150+ intentional vulnerabilities including:"
echo "  - SQL Injection in all endpoints"
echo "  - Full PAN/CVV/PIN storage"
echo "  - Plaintext secrets in ConfigMaps"
echo "  - Containers running as root"
echo "  - Privileged containers"
echo "  - No NetworkPolicy"
echo "  - No RBAC"
echo "  - SSRF vulnerabilities"
echo "  - And many more..."
echo ""
echo "Run GP-Copilot scanners to discover all vulnerabilities!"
echo "======================================================================"
