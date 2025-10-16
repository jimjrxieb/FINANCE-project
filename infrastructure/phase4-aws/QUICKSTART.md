# Phase 4 Neobank - Quick Start Guide

Get Phase 4 backend up and running in 5 minutes.

---

## Prerequisites

- PostgreSQL database running
- Node.js and npm installed
- `.env` file configured in `backend/` directory

---

## Step 1: Apply Database Migration (30 seconds)

```bash
cd backend/database
./apply-phase4-migration.sh
```

This creates 7 new tables:
- `cards` - Card-on-file management
- `api_keys` - Merchant API keys
- `merchant_transactions` - B2B payments
- `p2p_transfers` - Peer-to-peer transfers
- `fraud_alerts` - Fraud detection
- `scheduled_payments` - Recurring payments
- `webhook_deliveries` - Merchant notifications

**Expected Output**:
```
╔════════════════════════════════════════════════════════════════╗
║  🎉 Phase 4 Migration Completed Successfully!                 ║
╚════════════════════════════════════════════════════════════════╝

✅ 7 new tables created
✅ Phase 4 neobank features ready to use
```

---

## Step 2: Start Backend Server (10 seconds)

```bash
cd ../..  # back to backend directory
npm start
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════════╗
║  🚀 SecureBank API Server Running                             ║
╠════════════════════════════════════════════════════════════════╣
║  Server:      http://0.0.0.0:3000                             ║
║  Environment: development                                      ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Step 3: Test Phase 4 APIs (2 minutes)

### Test 1: View Available Endpoints

```bash
curl http://localhost:3000/
```

You should see `phase4_endpoints` array in response.

### Test 2: Admin Dashboard Stats (NO AUTH - VULNERABLE)

```bash
curl http://localhost:3000/api/v1/admin/dashboard/stats
```

**Expected Response**:
```json
{
  "total_users": 10,
  "total_merchants": 5,
  "total_transactions": 250,
  "total_p2p_transfers": 50,
  "total_fraud_alerts": 3,
  "system_health": "operational"
}
```

### Test 3: List All Users (NO AUTH - VULNERABLE)

```bash
curl http://localhost:3000/api/v1/admin/users/list
```

**Expected Response**: Array of all users with password hashes exposed.

### Test 4: Get Full User Details (EXPOSES PAN/CVV - CRITICAL)

```bash
curl http://localhost:3000/api/v1/admin/users/1/full-details
```

**Expected Response**:
```json
{
  "user": {
    "id": 1,
    "username": "merchant1",
    "email": "merchant1@example.com",
    "cards": [
      {
        "id": 1,
        "card_number": "4532015112830366",  // ❌ FULL PAN
        "cvv": "123",                        // ❌ CVV
        "expiry_month": 12,
        "expiry_year": 2025,
        "cardholder_name": "John Doe",
        "billing_zip": "10001",
        "pin_hash": "$2b$10$...",            // ❌ PIN HASH
        "is_active": true
      }
    ],
    "p2p_transfers": [...],
    "fraud_alerts": [...]
  }
}
```

**⚠️ CRITICAL VULNERABILITY**: This endpoint exposes full PAN and CVV without authentication!

### Test 5: Send P2P Transfer (SQL INJECTION VULNERABLE)

```bash
curl -X POST http://localhost:3000/api/v1/p2p/send \
  -H "Content-Type: application/json" \
  -d '{
    "sender_user_id": 1,
    "recipient_email": "user@example.com",
    "amount": 100.00,
    "memo": "Test transfer"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "transfer_id": 123,
  "amount": 100.00,
  "fee": 0.00,
  "status": "completed"
}
```

### Test 6: Check Transaction for Fraud

```bash
curl -X POST http://localhost:3000/api/v1/fraud/check-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "amount": 10000.00,
    "merchant": "Luxury Cars Inc",
    "location": "Dubai, UAE"
  }'
```

**Expected Response**:
```json
{
  "risk_score": 85,
  "risk_level": "HIGH",
  "recommendation": "BLOCK",
  "reasons": [
    "Transaction amount 3x higher than average",
    "International transaction",
    "Different city than usual"
  ],
  "alert_created": true,
  "alert_id": 45
}
```

### Test 7: List Fraud Alerts (NO AUTH - VULNERABLE)

```bash
curl http://localhost:3000/api/v1/fraud/alerts
```

**Expected Response**: Array of all fraud alerts in the system.

### Test 8: Get Transfer History

```bash
curl http://localhost:3000/api/v1/p2p/history/1
```

**Expected Response**: Array of P2P transfers for user ID 1.

---

## Step 4: Verify Vulnerabilities (1 minute)

### SQL Injection Test

Try this SQL injection payload in the P2P recipient email:

```bash
curl -X POST http://localhost:3000/api/v1/p2p/send \
  -H "Content-Type: application/json" \
  -d '{
    "sender_user_id": 1,
    "recipient_email": "user@example.com'"'"' OR 1=1--",
    "amount": 100.00,
    "memo": "SQL Injection Test"
  }'
```

**Result**: SQL error exposed in response (proves SQL injection vulnerability).

### Missing Authentication Test

All admin endpoints work without any authentication token:

```bash
# No authentication required!
curl http://localhost:3000/api/v1/admin/users/list
curl http://localhost:3000/api/v1/admin/merchants/list
curl http://localhost:3000/api/v1/admin/dashboard/stats
```

**Result**: All endpoints return data without requiring login.

### PAN/CVV Exposure Test

```bash
curl http://localhost:3000/api/v1/admin/users/1/full-details | jq '.user.cards[0]'
```

**Result**: Full card number and CVV returned in plaintext.

---

## What's Next?

### Option 1: Build Frontend (Recommended)
Create React components to interact with these APIs:
- Dashboard with card management
- P2P transfer UI
- Merchant portal
- Admin dashboard

See [PHASE4_BACKEND_COMPLETE.md](PHASE4_BACKEND_COMPLETE.md) for frontend requirements.

### Option 2: Run GP-Copilot Security Scan
Scan the backend to detect the 95+ intentional vulnerabilities:

```bash
cd ~/linkops-industries/GP-copilot
./gp-security scan GP-PROJECTS/FINANCE-project -s bandit trivy semgrep gitleaks
```

Expected findings:
- 20+ SQL injection flaws
- 15+ missing authentication checks
- 12+ PCI-DSS violations (full PAN/CVV storage)
- 10+ access control flaws
- 38+ other security issues

### Option 3: Deploy to Kubernetes
Deploy Phase 4 backend to local Kind cluster:

```bash
cd infrastructure/k8s
kubectl apply -f deployment-local.yaml
```

---

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check .env file exists
cat backend/.env

# Test database connection
psql -h localhost -U postgres -d securebank -c "SELECT 1"
```

### Migration Errors

```bash
# Check if tables already exist
psql -h localhost -U postgres -d securebank -c "\dt"

# Drop tables if needed (CAUTION: Deletes data!)
psql -h localhost -U postgres -d securebank -c "
  DROP TABLE IF EXISTS webhook_deliveries;
  DROP TABLE IF EXISTS scheduled_payments;
  DROP TABLE IF EXISTS fraud_alerts;
  DROP TABLE IF EXISTS p2p_transfers;
  DROP TABLE IF EXISTS merchant_transactions;
  DROP TABLE IF EXISTS api_keys;
  DROP TABLE IF EXISTS cards;
"

# Re-run migration
./backend/database/apply-phase4-migration.sh
```

### Server Won't Start

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill existing process
kill -9 $(lsof -t -i :3000)

# Start server again
cd backend && npm start
```

---

## Summary

You now have:
- ✅ Phase 4 database schema (7 tables)
- ✅ Phase 4 backend APIs (15 endpoints)
- ✅ 95+ intentional vulnerabilities ready for scanning

**Total Setup Time**: ~5 minutes

**Backend Status**: 100% Complete ✅

**Next Step**: Build frontend or run GP-Copilot security scan

---

For detailed documentation, see:
- [PHASE4_BACKEND_COMPLETE.md](PHASE4_BACKEND_COMPLETE.md) - Full implementation details
- [NEOBANK_FEATURES.md](docs/NEOBANK_FEATURES.md) - Feature specifications
- [API_IMPLEMENTATION_GUIDE.md](docs/API_IMPLEMENTATION_GUIDE.md) - Complete API reference
