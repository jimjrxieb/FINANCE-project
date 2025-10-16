#!/bin/bash
# ============================================================================
# PHASE 4 DATABASE MIGRATION SCRIPT
# ============================================================================
# Applies Phase 4 neobank features to the database
# Creates 7 new tables: cards, api_keys, merchant_transactions, p2p_transfers,
#                       fraud_alerts, scheduled_payments, webhook_deliveries
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 4 Neobank Database Migration                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will create 7 new tables in your database:"
echo "  1. cards - Card-on-file management (stores full PAN/CVV - VULNERABLE)"
echo "  2. api_keys - Merchant API keys (plaintext - VULNERABLE)"
echo "  3. merchant_transactions - B2B payment tracking"
echo "  4. p2p_transfers - Peer-to-peer money movement"
echo "  5. fraud_alerts - Fraud detection system"
echo "  6. scheduled_payments - Recurring bill pay"
echo "  7. webhook_deliveries - Merchant notifications"
echo ""
echo "⚠️  WARNING: These tables contain INTENTIONAL VULNERABILITIES"
echo "    for security scanning demonstration purposes."
echo ""

# Check if database is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found"
    echo "💡 Install with: sudo apt-get install postgresql-client"
    exit 1
fi

# Get database credentials from environment
if [ -f "../../.env" ]; then
    echo "📄 Loading database configuration from .env..."
    source ../../.env
elif [ -f "../.env" ]; then
    echo "📄 Loading database configuration from .env..."
    source ../.env
else
    echo "⚠️  No .env file found, using defaults"
fi

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-securebank}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASS="${DATABASE_PASSWORD:-postgres}"

echo "🔍 Database connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Test database connection
echo "🔄 Testing database connection..."
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to database"
    echo "💡 Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi

echo ""
echo "🚀 Starting migration..."
echo ""

# Run the migration using psql
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/002_neobank_features.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  🎉 Phase 4 Migration Completed Successfully!                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "✅ 7 new tables created"
    echo "✅ Phase 4 neobank features ready to use"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart backend server: npm start"
    echo "   2. Test Phase 4 APIs: curl http://localhost:3000/api/v1/admin/dashboard/stats"
    echo "   3. Run security scan: GP-Copilot scan"
    echo ""
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  ❌ Migration Failed                                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "💡 Check error messages above for details"
    echo ""
    exit 1
fi
