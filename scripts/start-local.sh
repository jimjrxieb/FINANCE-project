#!/bin/bash
# ============================================================================
# Local Development Quick Start
# ============================================================================
# Starts all services and initializes LocalStack
# Usage: ./scripts/start-local.sh [BEFORE|AFTER]
# ============================================================================

set -e

SECURITY_MODE="${1:-BEFORE}"

echo "══════════════════════════════════════════════════════════"
echo "  SecureBank Platform - Local Development"
echo "  Mode: $SECURITY_MODE"
echo "══════════════════════════════════════════════════════════"
echo ""

# Set security mode
export SECURITY_MODE=$SECURITY_MODE

# Stop any running containers
echo "🧹 Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
echo "   Waiting for LocalStack..."
sleep 10

echo "   Waiting for PostgreSQL..."
until docker exec securebank-db pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "   Waiting for backend..."
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
  sleep 1
done

echo "✅ All services started!"
echo ""

# Initialize LocalStack
echo "🔧 Initializing LocalStack..."
./scripts/init-localstack.sh
echo ""

# Display status
echo "══════════════════════════════════════════════════════════"
echo "✅ SecureBank Platform is running!"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "📍 Access Points:"
echo "   Frontend:            http://localhost:3001"
echo "   Backend API:         http://localhost:3000"
echo "   Prometheus:          http://localhost:9090"
echo "   Grafana:             http://localhost:3002"
echo "   Vault:               http://localhost:8200 (token: root)"
echo "   LocalStack:          http://localhost:4566"
echo ""
echo "🔐 Security Mode: $SECURITY_MODE"
if [ "$SECURITY_MODE" = "BEFORE" ]; then
  echo "   ❌ Hardcoded secrets in use"
  echo "   ❌ S3 buckets are PUBLIC"
  echo "   ❌ Grafana: admin/admin (no auth)"
else
  echo "   ✅ Reading from Secrets Manager"
  echo "   ✅ S3 buckets are PRIVATE"
  echo "   ✅ Enhanced security controls"
fi
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f backend"
echo ""
echo "🧪 Test commands:"
echo "   # Health check"
echo "   curl http://localhost:3000/health"
echo ""
echo "   # View public receipt (BEFORE mode):"
echo "   curl http://localhost:4566/securebank-payment-receipts-local/receipts/test.json"
echo ""
echo "🛑 Stop all services:"
echo "   docker-compose down"
echo ""