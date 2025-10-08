-- ============================================================================
-- DATABASE INITIALIZATION - INTENTIONALLY INSECURE
-- ============================================================================
-- PCI-DSS Violations:
-- - Storing CVV (PCI 3.2.2 - FORBIDDEN!)
-- - Storing PIN (PCI 3.2.3 - FORBIDDEN!)
-- - No encryption at rest (PCI 3.4)
-- - Weak schema design (multiple violations)
-- ============================================================================

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),  -- ❌ PCI 8.1: No unique constraint (duplicate usernames possible)
    password VARCHAR(255), -- Will store weakly hashed passwords
    email VARCHAR(100),
    api_key VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ No unique index on username
-- ❌ No password history table (PCI 8.2.4)

-- Create payments table (CRITICAL VIOLATIONS!)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id),

    -- ❌ PCI 3.2.1: CRITICAL - Storing full PAN unencrypted!
    card_number VARCHAR(19),

    -- ❌ PCI 3.2.2: CRITICAL - Storing CVV (STRICTLY FORBIDDEN!)
    cvv VARCHAR(4),

    -- ❌ PCI 3.2.3: CRITICAL - Storing PIN (STRICTLY FORBIDDEN!)
    pin VARCHAR(6),

    expiry_date VARCHAR(7),
    cardholder_name VARCHAR(100),
    amount DECIMAL(10,2),
    transaction_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ PCI 3.4: No encryption at rest
-- ❌ PCI 3.5: No encryption key management
-- ❌ Should use pgcrypto extension for encryption:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- card_number_encrypted BYTEA

-- Create sessions table (stores card data!)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id),
    session_token VARCHAR(255),

    -- ❌ PCI 3.2: Storing card data in session storage
    card_data TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Create audit_logs table (tamperable!)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER,
    action VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ PCI 10.5: Logs are not tamper-proof
-- ❌ Regular table allows UPDATE and DELETE
-- Should use:
--   - Append-only table with triggers preventing modification
--   - Hash chain for integrity verification
--   - Separate audit database with restricted access

-- Create indexes
CREATE INDEX idx_payments_merchant ON payments(merchant_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- ❌ PCI 7.1: No row-level security policies
-- Should implement RLS to restrict access:
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY merchant_payments ON payments FOR ALL TO merchant_role
--   USING (merchant_id = current_setting('app.current_merchant_id')::int);

-- Insert default admin merchant
INSERT INTO merchants (username, password, email, api_key)
VALUES (
    'admin',
    '$2b$04$hashed_admin123',  -- ❌ PCI 2.1: Default credentials
    'admin@securebank.local',
    'sk_live_default_key_12345'  -- ❌ PCI 2.1: Default API key
)
ON CONFLICT DO NOTHING;

-- Insert sample vulnerable data for demo
INSERT INTO payments (merchant_id, card_number, cvv, pin, expiry_date, cardholder_name, amount, transaction_status)
VALUES
    (1, '4532123456789012', '123', '1234', '12/25', 'John Doe', 99.99, 'completed'),
    (1, '5555555555554444', '456', '5678', '06/26', 'Jane Smith', 149.50, 'completed'),
    (1, '378282246310005', '789', '9012', '03/27', 'Bob Johnson', 299.00, 'pending')
ON CONFLICT DO NOTHING;

-- ❌ Sample data exposes real-looking card numbers (test cards, but looks bad)
-- ❌ CVV and PIN stored in plaintext

-- Grant permissions (overly permissive)
-- ❌ PCI 7.1: Granting ALL privileges (should use least privilege)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ❌ PCI 10.2: No triggers for audit logging
-- Should create triggers:
-- CREATE TRIGGER audit_payment_access
--   AFTER SELECT ON payments
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION log_card_data_access();

-- ============================================================================
-- VIOLATION SUMMARY
-- ============================================================================
-- This schema contains the following PCI-DSS violations:
--
-- CRITICAL:
-- 1. PCI 3.2.1: Storing full PAN unencrypted
-- 2. PCI 3.2.2: Storing CVV (STRICTLY FORBIDDEN!)
-- 3. PCI 3.2.3: Storing PIN (STRICTLY FORBIDDEN!)
-- 4. PCI 3.4: No encryption at rest
--
-- HIGH:
-- 5. PCI 2.1: Default credentials
-- 6. PCI 7.1: No row-level security / RBAC
-- 7. PCI 8.1: No unique constraint on usernames
-- 8. PCI 10.5: Logs are tamperable
--
-- MEDIUM:
-- 9. PCI 8.2.4: No password history
-- 10. PCI 10.2: No automatic audit logging
--
-- Total violations: 10+
-- ============================================================================