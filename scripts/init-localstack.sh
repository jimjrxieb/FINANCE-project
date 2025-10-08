#!/bin/bash
# ============================================================================
# LocalStack Initialization Script
# ============================================================================
# Creates S3 buckets and Secrets Manager entries for local development
# ============================================================================

set -e

echo "🔧 Initializing LocalStack (Mock AWS Services)..."
echo ""

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to start..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"s3"'; do
  echo "   LocalStack not ready yet, waiting..."
  sleep 2
done
echo "✅ LocalStack is ready!"
echo ""

# Configure AWS CLI to use LocalStack
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# ============================================================================
# S3 BUCKETS
# ============================================================================

echo "📦 Creating S3 buckets..."

# Payment receipts bucket
aws --endpoint-url=$AWS_ENDPOINT_URL s3 mb s3://securebank-payment-receipts-local 2>/dev/null || true

# Make bucket public (BEFORE mode - violation!)
aws --endpoint-url=$AWS_ENDPOINT_URL s3api put-bucket-acl \
  --bucket securebank-payment-receipts-local \
  --acl public-read

# Audit logs bucket
aws --endpoint-url=$AWS_ENDPOINT_URL s3 mb s3://securebank-audit-logs-local 2>/dev/null || true

echo "✅ S3 buckets created (public access enabled - BEFORE mode)"
echo ""

# ============================================================================
# SECRETS MANAGER
# ============================================================================

echo "🔐 Creating secrets in Secrets Manager..."

# Database password
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager create-secret \
  --name securebank/db/password \
  --secret-string '{
    "username": "postgres",
    "password": "StrongPassword123!",
    "host": "db",
    "port": 5432,
    "database": "securebank"
  }' 2>/dev/null || echo "   Secret securebank/db/password already exists"

# JWT secret
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager create-secret \
  --name securebank/jwt/secret \
  --secret-string '{
    "secret": "jwt-super-secret-key-2024-production"
  }' 2>/dev/null || echo "   Secret securebank/jwt/secret already exists"

echo "✅ Secrets created in Secrets Manager"
echo ""

# ============================================================================
# UPLOAD TEST RECEIPT
# ============================================================================

echo "📄 Uploading test receipt to S3..."

cat > /tmp/test-receipt.json << 'EOF'
{
  "receiptId": "TXN-LOCAL-001",
  "timestamp": "2025-10-08T00:00:00Z",
  "merchant": {
    "id": 1,
    "name": "Tony Stark",
    "email": "tony.stark@starkindustries.com",
    "company": "Stark Industries"
  },
  "payment": {
    "cardNumber": "4532015112830366",
    "cvv": "737",
    "pin": "1138",
    "cardType": "Visa",
    "cardHolder": "TONY STARK",
    "amount": 15000.00,
    "currency": "USD",
    "description": "Arc Reactor Components - Local Test"
  },
  "status": "completed"
}
EOF

aws --endpoint-url=$AWS_ENDPOINT_URL s3 cp /tmp/test-receipt.json \
  s3://securebank-payment-receipts-local/receipts/test.json \
  --acl public-read

echo "✅ Test receipt uploaded"
echo ""

# ============================================================================
# VERIFICATION
# ============================================================================

echo "🔍 Verifying LocalStack setup..."
echo ""

# List S3 buckets
echo "S3 Buckets:"
aws --endpoint-url=$AWS_ENDPOINT_URL s3 ls

# List secrets
echo ""
echo "Secrets Manager:"
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager list-secrets \
  --query 'SecretList[].Name' --output table

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 LocalStack initialization complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Access Points:"
echo "   S3 Endpoint:         http://localhost:4566"
echo "   Secrets Manager:     http://localhost:4566"
echo "   CloudWatch:          http://localhost:4566"
echo ""
echo "🧪 Test Commands:"
echo "   # View test receipt (public):"
echo "   curl http://localhost:4566/securebank-payment-receipts-local/receipts/test.json"
echo ""
echo "   # Get secret from Secrets Manager:"
echo "   aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id securebank/db/password"
echo ""
echo "📊 Monitoring:"
echo "   Prometheus:          http://localhost:9090"
echo "   Grafana:             http://localhost:3002 (admin/admin)"
echo ""
echo "🔧 Backend API:         http://localhost:3000"
echo "🌐 Frontend:            http://localhost:3001"
echo ""