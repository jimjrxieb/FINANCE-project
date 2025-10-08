#!/bin/bash
# ============================================================================
# SECUREBANK PAYMENT PLATFORM - SETUP SCRIPT
# ============================================================================

set -e

echo "
╔════════════════════════════════════════════════════════════════╗
║  SecureBank Payment Platform - Setup                           ║
║  ⚠️  INTENTIONALLY INSECURE - DEMO ONLY ⚠️                      ║
╚════════════════════════════════════════════════════════════════╝
"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Generate SSL certificates
echo "📋 Step 1: Generating SSL certificates..."
cd infrastructure/nginx
chmod +x generate-certs.sh
./generate-certs.sh
cd ../..
echo ""

# Create .env file if it doesn't exist
echo "📋 Step 2: Creating environment configuration..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env (with intentionally weak credentials)"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi
echo ""

# Build and start containers
echo "📋 Step 3: Building Docker containers..."
docker-compose build
echo ""

echo "📋 Step 4: Starting services..."
docker-compose up -d
echo ""

# Wait for database to be ready
echo "📋 Step 5: Waiting for database to initialize..."
sleep 5

# Initialize database
echo "📋 Step 6: Running database migrations..."
docker-compose exec -T db psql -U postgres -d securebank -f /docker-entrypoint-initdb.d/init.sql || true
echo ""

echo "
╔════════════════════════════════════════════════════════════════╗
║  ✅ SecureBank Payment Platform is running!                    ║
╠════════════════════════════════════════════════════════════════╣
║  HTTP API:    http://localhost:3000                            ║
║  HTTPS API:   https://localhost:443 (self-signed cert)         ║
║  Database:    localhost:5432                                   ║
║  Redis:       localhost:6379                                   ║
║  Vault:       http://localhost:8200                            ║
╠════════════════════════════════════════════════════════════════╣
║  Default Admin:                                                ║
║    Username: admin                                             ║
║    Password: admin123                                          ║
╠════════════════════════════════════════════════════════════════╣
║  ⚠️  WARNING: Contains 30+ intentional PCI-DSS violations      ║
║  ⚠️  FOR DEMONSTRATION PURPOSES ONLY                           ║
║  ⚠️  DO NOT use with real payment data                         ║
╚════════════════════════════════════════════════════════════════╝

📖 Next steps:
   1. Test API: curl http://localhost:3000/health
   2. Login: POST http://localhost:3000/api/auth/login
   3. Review violations: cat VIOLATION-GUIDE.md
   4. Run GP-Copilot scan: jade scan --profile finance-pci-dss .

🛑 To stop: docker-compose down
📊 To view logs: docker-compose logs -f
"