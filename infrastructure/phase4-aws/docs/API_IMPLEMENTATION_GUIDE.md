# Phase 4 API Implementation Guide

## Quick Reference: All APIs to Build

This document provides the complete implementation blueprint for Phase 4 neobank backend APIs with intentional security vulnerabilities for GP-Copilot demonstration.

---

## Summary: Files to Create

1. ✅ `backend/database/migrations/002_neobank_features.sql` - **COMPLETE**
2. 🚧 `backend/routes/p2p.routes.js` - P2P Transfers API
3. 🚧 `backend/routes/fraud.routes.js` - Fraud Detection API
4. 🚧 `backend/routes/admin.routes.js` - Admin Dashboard API
5. 🚧 `backend/server.js` - Update to register new routes

**Note:** Merchant API already exists as `backend/routes/merchant.api.routes.js` from Phase 3

---

## File 1: P2P Transfers API

**Filename:** `backend/routes/p2p.routes.js`

**Purpose:** Peer-to-peer money transfers between users

**Intentional Vulnerabilities:**
- SQL injection in all queries
- No daily/monthly transfer limits enforced
- No authentication checks
- No balance validation before transfer

**Endpoints:**

### POST /api/v1/p2p/send
Send money to another user

**Request:**
```json
{
  "sender_id": 1,
  "recipient_email": "john@example.com",
  "amount": 100.00,
  "note": "Dinner split"
}
```

**Vulnerabilities:**
- SQL injection: `SELECT * FROM merchants WHERE email = '${recipient_email}'`
- No balance check before deducting
- No daily limit validation ($5,000/day limit not enforced)

### GET /api/v1/p2p/history/:user_id
Get transfer history

**Vulnerabilities:**
- SQL injection: `SELECT * FROM p2p_transfers WHERE sender_id = ${user_id} OR recipient_id = ${user_id}`
- No pagination (could return millions of records - DoS)
- Returns all transfers without authentication

### POST /api/v1/p2p/request
Request money from another user

**Request:**
```json
{
  "requester_id": 1,
  "payer_email": "jane@example.com",
  "amount": 50.00,
  "note": "Loan repayment"
}
```

### POST /api/v1/p2p/approve
Approve a payment request

**Request:**
```json
{
  "request_id": 123,
  "payer_id": 2
}
```

**Vulnerability:** No verification that payer_id matches the request

---

## File 2: Fraud Detection API

**Filename:** `backend/routes/fraud.routes.js`

**Purpose:** Real-time fraud detection and monitoring

**Intentional Vulnerabilities:**
- No authentication on admin endpoints
- SQL injection
- Fraud score calculation is simplistic
- No automated response to high-risk scores

**Endpoints:**

### POST /api/v1/fraud/check-transaction
Calculate fraud risk score

**Request:**
```json
{
  "user_id": 1,
  "amount": 500.00,
  "merchant_id": 10
}
```

**Fraud Score Algorithm:**
```javascript
let score = 0;
// Amount > user's average by 3x = +30 points
// More than 5 transactions in last hour = +40 points
// Amount > $500 = +20 points
// New merchant (first time) = +10 points

if (score > 50) {
  // Create fraud_alert
}

return { risk_score: score, approved: score < 70 };
```

### GET /api/v1/fraud/alerts
List all fraud alerts

**Query Params:** `?status=pending&severity=high`

**Vulnerability:** No authentication - anyone can view all alerts

### POST /api/v1/fraud/review
Review and resolve fraud alert

**Request:**
```json
{
  "alert_id": 456,
  "reviewed_by": 1,
  "status": "confirmed_fraud",
  "notes": "Suspicious pattern detected"
}
```

**Action:** If status = 'confirmed_fraud', freeze all user's cards

### GET /api/v1/fraud/user-risk/:user_id
Get user's overall risk profile

**Response:**
```json
{
  "risk_level": "medium",
  "alert_count": 3,
  "last_alert": "2025-10-15T10:30:00Z",
  "avg_transaction_amount": 125.50,
  "account_age_days": 45
}
```

### POST /api/v1/fraud/block-card
Immediately block a card for fraud

**Request:**
```json
{
  "card_id": 789,
  "reason": "Suspected stolen card"
}
```

**Actions:**
- Set card.is_active = false
- Create fraud_alert with severity = 'critical'
- Log to audit trail

---

## File 3: Admin Dashboard API

**Filename:** `backend/routes/admin.routes.js`

**Purpose:** System monitoring and user management for administrators

**Intentional Vulnerabilities:**
- NO AUTHENTICATION on any endpoint
- Returns full PAN and CVV in user details
- Exposes plaintext API keys
- Detailed system metrics leak architecture

**Endpoints:**

### GET /api/v1/admin/dashboard/stats
System-wide statistics

**Response:**
```json
{
  "stats": {
    "total_users": 1250,
    "total_accounts": 2500,
    "total_balance": 5000000.00,
    "transaction_volume_24h": 125000.00,
    "transaction_volume_7d": 850000.00,
    "transaction_volume_30d": 3200000.00,
    "active_cards": 3200,
    "pending_fraud_alerts": 5
  }
}
```

**Vulnerability:** No authentication - anyone can see these metrics

### GET /api/v1/admin/users/list
List all users with account summaries

**Query Params:** `?limit=100&offset=0`

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "checking_balance": 1250.00,
      "savings_balance": 5000.00,
      "card_count": 2,
      "alert_count": 0,
      "created_at": "2025-09-01T10:00:00Z"
    }
  ],
  "total": 1250
}
```

### GET /api/v1/admin/users/:user_id/full-details
Complete user profile (HIGHLY SENSITIVE)

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "accounts": [
      {"type": "checking", "balance": 1250.00},
      {"type": "savings", "balance": 5000.00}
    ],
    "cards": [
      {
        "id": 101,
        "card_number": "4242424242424242",  // ❌ Full PAN exposed
        "cvv": "123",                        // ❌ CVV exposed
        "brand": "visa",
        "exp_month": 12,
        "exp_year": 2027,
        "is_active": true
      }
    ],
    "transactions": [...],  // Last 50 transactions
    "fraud_alerts": [...]   // All fraud alerts
  }
}
```

**Vulnerability:** Exposes full card details without authentication

### POST /api/v1/admin/users/suspend
Suspend a user account

**Request:**
```json
{
  "user_id": 123,
  "reason": "Fraudulent activity detected"
}
```

**Actions:**
- Freeze all accounts
- Block all cards
- Create audit log entry
- Notify user (mock)

### GET /api/v1/admin/merchants/list
List all merchant accounts with API keys

**Response:**
```json
{
  "merchants": [
    {
      "id": 1,
      "merchant_name": "Coffee Shop POS",
      "api_key": "sk_live_abc123def456",  // ❌ Plaintext API key
      "api_secret": "secret_xyz789",      // ❌ Plaintext secret
      "webhook_url": "https://coffeeshop.com/webhooks",
      "is_active": true,
      "total_transactions": 1250,
      "total_volume": 125000.00
    }
  ]
}
```

**Vulnerability:** Exposes plaintext API keys to anyone

### GET /api/v1/admin/reports/compliance
Generate compliance reports

**Query Params:** `?report_type=pci|soc2|transactions&start_date=2025-01-01&end_date=2025-12-31`

**Response for PCI Report:**
```json
{
  "report": {
    "report_type": "PCI-DSS Compliance",
    "generated_at": "2025-10-15T15:30:00Z",
    "findings": {
      "cards_stored": 3200,
      "cards_with_full_pan": 3200,     // ❌ PCI 3.2.1 violation
      "cards_with_cvv": 3200,          // ❌ PCI 3.2.2 violation
      "encryption_enabled": false,     // ❌ PCI 3.4 violation
      "api_keys_hashed": false,        // ❌ Security issue
      "audit_trail_complete": false    // ❌ PCI 10.2 violation
    },
    "compliance_score": 25,  // Out of 100
    "violations": [
      "Full PAN stored (PCI 3.2.1)",
      "CVV stored (PCI 3.2.2 FORBIDDEN)",
      "No encryption at rest (PCI 3.4)",
      "Missing audit logs (PCI 10.2)"
    ]
  }
}
```

---

## File 4: Update server.js

**Location:** `backend/server.js`

**Changes Needed:**

1. Import new route files:
```javascript
const p2pRoutes = require('./routes/p2p.routes');
const fraudRoutes = require('./routes/fraud.routes');
const adminRoutes = require('./routes/admin.routes');
```

2. Register routes:
```javascript
// Phase 4 Neobank APIs
app.use('/api/v1/p2p', p2pRoutes);
app.use('/api/v1/fraud', fraudRoutes);
app.use('/api/v1/admin', adminRoutes);
```

3. Add CORS for /api/v1/* endpoints (if not already present)

---

## Common Code Patterns

### SQL Injection Pattern (Intentional)
```javascript
// ❌ VULNERABILITY: SQL Injection
const query = `SELECT * FROM table WHERE id = ${user_input}`;
const result = await getPool().query(query);
```

### Error Handling Pattern (Leaks Details)
```javascript
catch (error) {
    console.error('Error:', error);
    // ❌ VULNERABILITY: Detailed error messages
    res.status(500).json({
        error: 'Operation failed',
        details: error.message,
        stack: error.stack  // ❌ Leaks stack trace
    });
}
```

### No Authentication Pattern
```javascript
// ❌ VULNERABILITY: No authentication check
router.get('/sensitive-data', async (req, res) => {
    // Anyone can access this endpoint
    const data = await getSensitiveData();
    res.json(data);
});
```

---

## Testing the APIs

### Test P2P Transfer
```bash
curl -X POST http://localhost:3000/api/v1/p2p/send \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "recipient_email": "john@example.com",
    "amount": 100.00,
    "note": "Test transfer"
  }'
```

### Test Fraud Check
```bash
curl -X POST http://localhost:3000/api/v1/fraud/check-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "amount": 5000.00,
    "merchant_id": 10
  }'
```

### Test Admin Stats
```bash
curl http://localhost:3000/api/v1/admin/dashboard/stats
```

### Test SQL Injection
```bash
# Get all users' data using SQL injection
curl "http://localhost:3000/api/v1/p2p/history/1%20OR%201=1--"

# Expected: Returns ALL transfers from ALL users (security flaw)
```

---

## GP-Copilot Detection Targets

When these APIs are scanned with GP-Copilot, it should detect:

**SQL Injection (20+ instances):**
- All SELECT, INSERT, UPDATE, DELETE queries use string concatenation
- No parameterized queries anywhere
- User input directly concatenated into SQL

**Access Control Issues (15+ instances):**
- Admin endpoints have no authentication
- P2P transfers don't verify sender identity
- Users can view other users' data

**PCI-DSS Violations (12+ instances):**
- Full PAN returned in admin API
- CVV returned in admin API
- Cards stored without encryption
- No tokenization

**API Security Issues (10+ instances):**
- No rate limiting
- No input validation
- Detailed error messages
- Plaintext API keys

**Missing Audit Trail (5+ instances):**
- No logging of admin actions
- No transaction modification logs
- No fraud alert creation logs

**Total Expected Findings: 62+ HIGH/CRITICAL vulnerabilities**

---

## Implementation Time Estimate

- P2P Routes: ~100 lines (10 minutes)
- Fraud Routes: ~150 lines (15 minutes)
- Admin Routes: ~200 lines (20 minutes)
- Server.js Updates: ~10 lines (2 minutes)
- Testing: ~10 minutes

**Total: ~57 minutes of implementation work**

---

## Next Steps

1. Create p2p.routes.js with intentional vulnerabilities
2. Create fraud.routes.js with no authentication
3. Create admin.routes.js exposing sensitive data
4. Update server.js to register routes
5. Run database migration
6. Test each endpoint with curl
7. Verify vulnerabilities are present
8. Run GP-Copilot scan to detect all issues
9. Demonstrate auto-fix capabilities

**This completes the Phase 4 backend foundation!**
