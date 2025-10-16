# Phase 4: Hybrid Neobank Features

## Overview

Transform SecureBank from a basic banking app into a **full-featured hybrid neobank** combining:
- Customer-facing banking (like Chime, Cash App)
- Merchant payment processing (like Stripe, Square)
- Full PCI-DSS compliance demonstration

## Core Features

### 1. Card-on-File Management 🎴

**Customer Workflow:**
```
1. Customer adds external card (Visa/MC/Amex)
   → Frontend captures card details
   → Backend tokenizes via Stripe
   → Store token + metadata (last 4, brand, expiry)
   → NEVER store full PAN or CVV

2. Customer funds account from card
   → Select card from saved cards
   → Enter amount to add
   → Charge card via Stripe token
   → Credit checking account

3. Customer removes card
   → Delete token from Stripe
   → Remove from database
```

**API Endpoints:**
```javascript
POST   /api/v1/cards              // Add card (returns token)
GET    /api/v1/cards              // List customer's cards
DELETE /api/v1/cards/:id          // Remove card
POST   /api/v1/cards/:id/charge   // Fund account from card
```

**Database Schema:**
```sql
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    stripe_token VARCHAR(255) NOT NULL,  -- tok_abc123
    last_4 VARCHAR(4) NOT NULL,
    brand VARCHAR(20) NOT NULL,          -- visa, mastercard, amex
    exp_month INT NOT NULL,
    exp_year INT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ NO card_number column
-- ✅ NO cvv column
-- ✅ Token encrypted at rest
```

**PCI-DSS Compliance:**
- ✅ PCI 3.2: Card data tokenized via Stripe
- ✅ PCI 3.4: PAN masked (only last 4 visible)
- ✅ PCI 3.2.2: CVV never stored
- ✅ PCI 3.6: Tokens encrypted at rest (AES-256)

---

### 2. Enhanced Merchant API 🏪

**B2B Integration Workflow:**
```
1. Merchant signs up
   → Receives API key (sk_live_...)
   → API key stored hashed in Secrets Manager

2. Merchant charges customer
   POST /api/v1/charge
   {
     "amount": 450,  // $4.50 in cents
     "customer_id": "cust_john_doe",
     "description": "Coffee + Croissant"
   }

3. Backend processes charge
   → Validate API key
   → Check rate limit (100 req/min)
   → Deduct from customer account
   → Credit merchant account
   → Send webhook notification

4. Webhook sent to merchant
   POST https://merchant.com/webhooks/payment
   {
     "event": "charge.succeeded",
     "transaction_id": "txn_xyz789",
     "amount": 450,
     "signature": "sha256=abc123..."  // HMAC-SHA256
   }
```

**API Endpoints:**
```javascript
POST   /api/v1/charge              // Process payment
POST   /api/v1/refund              // Issue refund
GET    /api/v1/transactions        // Query history
GET    /api/v1/balance             // Check merchant balance
POST   /api/v1/webhooks/test       // Test webhook delivery
```

**Authentication:**
```javascript
// API key in header
Authorization: Bearer sk_live_abc123def456...

// Rate limiting (Redis)
100 requests per minute per merchant

// Webhook signature (HMAC-SHA256)
X-SecureBank-Signature: sha256=abc123...
```

**Security Features:**
- ✅ API keys hashed (bcrypt) + stored in Vault
- ✅ Rate limiting (100 req/min via API Gateway)
- ✅ Webhook HMAC signatures (prevent replay attacks)
- ✅ TLS 1.3 only
- ✅ Input validation (amount > 0, < $10,000)

---

### 3. P2P Transfers 💸

**Customer Workflow:**
```
1. Customer initiates transfer
   → Enter recipient username/email
   → Enter amount
   → Add optional memo

2. Backend validates
   → Check sufficient balance
   → Verify recipient exists
   → Check daily transfer limit

3. Process transfer
   → Deduct from sender checking
   → Credit to recipient checking
   → Create transaction records for both
   → Send notifications
```

**API Endpoints:**
```javascript
POST   /api/v1/transfers/p2p       // Send money to user
GET    /api/v1/transfers/history   // View sent/received
GET    /api/v1/transfers/limits    // Check daily limits
```

**Database Schema:**
```sql
CREATE TABLE p2p_transfers (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES customers(id),
    recipient_id INT REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL,
    memo TEXT,
    status VARCHAR(20) DEFAULT 'completed',  -- completed, pending, failed
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Limits:**
- $2,500 per transaction
- $5,000 per day
- $20,000 per month

---

### 4. Interest-Bearing Savings 💰

**Feature:**
```
- Savings accounts earn 2.5% APY
- Interest calculated daily
- Paid out monthly on 1st
- Compounded monthly
```

**Cron Job:**
```javascript
// Run daily at midnight
function calculateInterest() {
  // For each savings account with balance > 0
  // daily_rate = annual_rate / 365
  // daily_interest = balance * daily_rate
  // accrued_interest += daily_interest
}

// Run monthly on 1st
function payInterest() {
  // For each savings account
  // balance += accrued_interest
  // create interest_payment transaction
  // reset accrued_interest = 0
}
```

---

### 5. Transaction Export 📊

**Compliance Requirement:**
```
- Customers can export transaction history
- Formats: CSV, PDF
- Date range filtering
- Required for tax reporting
```

**API Endpoints:**
```javascript
GET /api/v1/transactions/export?format=csv&start=2025-01-01&end=2025-12-31
```

**CSV Format:**
```csv
Date,Description,Amount,Type,Balance
2025-10-15,Coffee Shop,-4.50,debit,295.50
2025-10-15,Transfer to Savings,-200.00,transfer,95.50
2025-10-15,Added from Visa •••• 4242,500.00,deposit,595.50
```

---

### 6. Admin Fraud Dashboard 🔍

**Features:**
```
- Real-time transaction monitoring
- Anomaly detection alerts
- Suspicious activity reports (SAR)
- Customer account overview
- Transaction search/filter
```

**Fraud Detection Rules:**
```javascript
// Flag transactions if:
- Single transaction > $5,000
- 10+ transactions in 1 hour
- Geographic anomaly (IP location change)
- Failed login attempts > 5 in 10 minutes
- Card funding from new card > $1,000
```

**Admin Endpoints:**
```javascript
GET    /api/admin/dashboard/stats     // Overview stats
GET    /api/admin/transactions/search // Search all transactions
GET    /api/admin/alerts/fraud        // Fraud alerts
POST   /api/admin/accounts/:id/freeze // Freeze account
GET    /api/admin/reports/pci         // PCI-DSS compliance report
```

---

## Implementation Priority

### Phase 4a: Core Features (Week 1-2)
1. ✅ Card-on-file backend API
2. ✅ Card-on-file frontend UI
3. ✅ Enhanced merchant API
4. ✅ P2P transfers

### Phase 4b: Advanced Features (Week 3)
5. ✅ Interest-bearing savings
6. ✅ Transaction export
7. ✅ Admin fraud dashboard

### Phase 4c: AWS Migration (Week 4)
8. ✅ LocalStack testing
9. ✅ Terraform infrastructure
10. ✅ Lambda deployment
11. ✅ Production AWS deployment

---

## Database Schema Updates

```sql
-- New tables for Phase 4
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    stripe_token VARCHAR(255) NOT NULL,
    last_4 VARCHAR(4) NOT NULL,
    brand VARCHAR(20) NOT NULL,
    exp_month INT NOT NULL,
    exp_year INT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE p2p_transfers (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES customers(id),
    recipient_id INT REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL,
    memo TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE merchant_api_keys (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id),
    api_key_hash VARCHAR(255) NOT NULL,  -- bcrypt hashed
    last_4 VARCHAR(4) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, delivered, failed
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fraud_alerts (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    transaction_id INT REFERENCES transactions(id),
    alert_type VARCHAR(50) NOT NULL,  -- high_amount, rapid_transactions, etc.
    severity VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Next Steps

1. Start with **card-on-file** backend API (most critical for PCI-DSS demo)
2. Build frontend card management UI
3. Implement enhanced merchant API with webhooks
4. Add P2P transfers
5. Test everything with LocalStack
6. Deploy to AWS

Ready to start coding? Let's begin with the card-on-file API!
