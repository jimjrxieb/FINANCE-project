-- ============================================================================
-- NEOBANK FEATURES MIGRATION - PHASE 4
-- ============================================================================
-- Date: 2025-10-15
-- Purpose: Add enhanced neobank features (cards, merchant API, P2P, fraud detection)
--
-- ⚠️ INTENTIONAL SECURITY VULNERABILITIES FOR DEMONSTRATION:
-- - Cards table stores full PAN and CVV (PCI-DSS violations)
-- - API keys stored in plaintext
-- - No encryption at rest
-- - Minimal access controls
-- ============================================================================

-- ============================================================================
-- 1. CARDS TABLE (Card-on-File Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- ❌ INSECURE: Storing full card number (PCI-DSS 3.2.1 violation)
    -- Should use tokenization (Stripe, Adyen) instead
    card_number VARCHAR(16) NOT NULL,

    -- ❌ CRITICAL: Storing CVV (PCI-DSS 3.2.2 FORBIDDEN)
    -- CVV must NEVER be stored after authorization
    cvv VARCHAR(4) NOT NULL,

    -- Card metadata
    card_type VARCHAR(20) DEFAULT 'external',  -- 'external' (linked) or 'virtual' (issued by us)
    brand VARCHAR(20) NOT NULL,  -- 'visa', 'mastercard', 'amex', 'discover'
    exp_month INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year INTEGER NOT NULL CHECK (exp_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
    cardholder_name VARCHAR(255) NOT NULL,

    -- Card status and controls
    is_active BOOLEAN DEFAULT true,
    spending_limit DECIMAL(10,2) DEFAULT 5000.00,
    last_4 VARCHAR(4) NOT NULL,  -- For display purposes

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- ❌ INSECURE: No unique constraint on card_number (allows duplicates)
    CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES merchants(id)
);

-- Indexes for performance
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_last_4 ON cards(last_4);
CREATE INDEX idx_cards_is_active ON cards(is_active);

-- ❌ INSECURE: No encryption on card_number or cvv columns
COMMENT ON COLUMN cards.card_number IS '❌ INSECURE: Full PAN stored in plaintext (PCI-DSS 3.2.1 violation)';
COMMENT ON COLUMN cards.cvv IS '❌ CRITICAL: CVV stored (PCI-DSS 3.2.2 FORBIDDEN - never store CVV)';

-- ============================================================================
-- 2. API KEYS TABLE (Merchant API Authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(255) NOT NULL,

    -- ❌ INSECURE: API keys stored in plaintext (should be hashed with bcrypt)
    api_key VARCHAR(64) NOT NULL UNIQUE,

    -- ❌ INSECURE: API secrets in plaintext (should use AWS Secrets Manager)
    api_secret VARCHAR(64),

    -- Webhook configuration
    webhook_url VARCHAR(512),
    webhook_secret VARCHAR(64),  -- ❌ INSECURE: Plaintext webhook secret

    -- Status and permissions
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"charge": true, "refund": true, "read": true}'::jsonb,

    -- Rate limiting metadata
    rate_limit_per_minute INTEGER DEFAULT 100,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,

    -- ❌ INSECURE: No API key rotation policy
    CONSTRAINT api_keys_api_key_unique UNIQUE (api_key)
);

CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_merchant_name ON api_keys(merchant_name);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

COMMENT ON COLUMN api_keys.api_key IS '❌ INSECURE: API key stored in plaintext (should be hashed)';
COMMENT ON COLUMN api_keys.api_secret IS '❌ INSECURE: API secret in plaintext (use Secrets Manager)';

-- ============================================================================
-- 3. MERCHANT TRANSACTIONS TABLE (B2B Payment Processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_transactions (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Transaction amounts
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    fee_amount DECIMAL(12,2) DEFAULT 0.00,
    net_amount DECIMAL(12,2),  -- amount - fee (what merchant receives)

    -- Transaction status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'succeeded', 'failed', 'refunded'
    failure_reason TEXT,

    -- Transaction details
    description TEXT,
    metadata JSONB,  -- Flexible data storage for merchant use

    -- Refund tracking
    refunded_amount DECIMAL(12,2) DEFAULT 0.00,
    refund_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,
    refunded_at TIMESTAMP,

    CONSTRAINT merchant_transactions_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES api_keys(id),
    CONSTRAINT merchant_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES merchants(id)
);

CREATE INDEX idx_merchant_transactions_merchant_id ON merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_customer_id ON merchant_transactions(customer_id);
CREATE INDEX idx_merchant_transactions_status ON merchant_transactions(status);
CREATE INDEX idx_merchant_transactions_created_at ON merchant_transactions(created_at);

-- ❌ INSECURE: No audit log for transaction modifications
COMMENT ON TABLE merchant_transactions IS '❌ INSECURE: No immutable audit trail for compliance';

-- ============================================================================
-- 4. P2P TRANSFERS TABLE (Peer-to-Peer Money Movement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS p2p_transfers (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Transfer details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0 AND amount <= 2500),  -- Daily limit per transaction
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'cancelled'
    note TEXT,

    -- Fraud detection
    risk_score INTEGER DEFAULT 0,  -- 0-100 scale
    flagged_for_review BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- ❌ INSECURE: No daily/monthly transfer limits enforced at DB level
    CONSTRAINT p2p_transfers_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES merchants(id),
    CONSTRAINT p2p_transfers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES merchants(id),
    CONSTRAINT p2p_no_self_transfer CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_p2p_transfers_sender_id ON p2p_transfers(sender_id);
CREATE INDEX idx_p2p_transfers_recipient_id ON p2p_transfers(recipient_id);
CREATE INDEX idx_p2p_transfers_status ON p2p_transfers(status);
CREATE INDEX idx_p2p_transfers_created_at ON p2p_transfers(created_at);

COMMENT ON TABLE p2p_transfers IS '❌ INSECURE: Transfer limits not enforced ($5k/day, $20k/month)';

-- ============================================================================
-- 5. FRAUD ALERTS TABLE (Fraud Detection & Monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Alert details
    transaction_id INTEGER,  -- Can reference transactions OR merchant_transactions
    transaction_type VARCHAR(50),  -- 'payment', 'p2p', 'card_charge', 'merchant_charge'
    alert_type VARCHAR(50) NOT NULL,  -- 'velocity', 'amount', 'location', 'pattern', 'new_device'
    severity VARCHAR(20) NOT NULL,  -- 'low', 'medium', 'high', 'critical'

    -- Alert description
    description TEXT NOT NULL,
    risk_score INTEGER,  -- 0-100 scale

    -- Review status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'reviewed', 'false_positive', 'confirmed_fraud'
    reviewed_by INTEGER REFERENCES merchants(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,

    -- Actions taken
    actions_taken JSONB,  -- e.g., {"card_frozen": true, "account_locked": false}

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fraud_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES merchants(id),
    CONSTRAINT fraud_alerts_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES merchants(id)
);

CREATE INDEX idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX idx_fraud_alerts_created_at ON fraud_alerts(created_at);
CREATE INDEX idx_fraud_alerts_alert_type ON fraud_alerts(alert_type);

-- ❌ INSECURE: No automatic alert expiration or archival
COMMENT ON TABLE fraud_alerts IS '❌ INSECURE: No automated response to high-severity alerts';

-- ============================================================================
-- 6. SCHEDULED PAYMENTS TABLE (Recurring Payments & Bill Pay)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Payment details
    recipient VARCHAR(255) NOT NULL,  -- Payee name or identifier
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),

    -- Scheduling
    frequency VARCHAR(20) NOT NULL,  -- 'once', 'weekly', 'biweekly', 'monthly', 'quarterly'
    next_payment_date DATE NOT NULL,
    last_payment_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'cancelled', 'completed'

    -- Payment metadata
    description TEXT,
    payment_method VARCHAR(50) DEFAULT 'checking',  -- 'checking', 'card', 'savings'

    -- Failure handling
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT scheduled_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES merchants(id)
);

CREATE INDEX idx_scheduled_payments_user_id ON scheduled_payments(user_id);
CREATE INDEX idx_scheduled_payments_next_payment_date ON scheduled_payments(next_payment_date);
CREATE INDEX idx_scheduled_payments_status ON scheduled_payments(status);

-- ❌ INSECURE: No notification before payment execution
COMMENT ON TABLE scheduled_payments IS '❌ INSECURE: No user notification before auto-debit';

-- ============================================================================
-- 7. WEBHOOK DELIVERIES TABLE (Merchant Webhook Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(50) NOT NULL,  -- 'charge.succeeded', 'charge.failed', 'refund.created'
    payload JSONB NOT NULL,

    -- Delivery details
    url VARCHAR(512) NOT NULL,
    signature VARCHAR(255),  -- ❌ INSECURE: Should use HMAC-SHA256

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'delivered', 'failed'
    response_code INTEGER,
    response_body TEXT,

    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,

    CONSTRAINT webhook_deliveries_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES api_keys(id)
);

CREATE INDEX idx_webhook_deliveries_merchant_id ON webhook_deliveries(merchant_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);

-- ❌ INSECURE: No HMAC signature verification
COMMENT ON COLUMN webhook_deliveries.signature IS '❌ INSECURE: No HMAC-SHA256 signature (prevents replay attacks)';

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample API key for testing
INSERT INTO api_keys (merchant_name, api_key, api_secret, webhook_url, is_active)
VALUES
    ('Coffee Shop POS', 'sk_live_abc123def456', 'secret_xyz789', 'https://coffeeshop.example.com/webhooks', true),
    ('Online Store', 'sk_live_store999', 'secret_store123', NULL, true)
ON CONFLICT (api_key) DO NOTHING;

-- Insert sample scheduled payment
-- (Will be populated when users create recurring payments)

-- ============================================================================
-- INTENTIONAL VULNERABILITIES SUMMARY
-- ============================================================================
-- ❌ cards.card_number: Full PAN stored (PCI-DSS 3.2.1 violation)
-- ❌ cards.cvv: CVV stored (PCI-DSS 3.2.2 FORBIDDEN)
-- ❌ api_keys.api_key: Plaintext API keys (should hash)
-- ❌ No encryption at rest on sensitive columns
-- ❌ No audit trail for transaction modifications
-- ❌ No rate limiting enforced at DB level
-- ❌ No HMAC webhook signatures
-- ❌ No automated fraud response
-- ============================================================================

COMMIT;
