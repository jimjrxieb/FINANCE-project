-- ============================================================================
-- SECUREBANK ENHANCED DATABASE SCHEMA - INTENTIONALLY VULNERABLE
-- ============================================================================
-- This schema is designed for security testing and contains intentional
-- vulnerabilities for demonstration and training purposes.
--
-- INTENTIONAL VULNERABILITIES:
-- - Stores full card numbers (PCI-DSS 3.2.1 violation)
-- - Stores CVV codes (PCI-DSS 3.2.2 CRITICAL violation)
-- - Stores PINs (PCI-DSS 3.2.3 CRITICAL violation)
-- - No encryption at rest
-- - Plaintext API keys
-- - No audit logging
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS merchant_transactions CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;

-- ============================================================================
-- USERS TABLE - Customer accounts
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL, -- ❌ Stores plaintext passwords
    full_name VARCHAR(100),
    phone VARCHAR(20),
    ssn VARCHAR(11),  -- ❌ PII stored without encryption
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    account_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ============================================================================
-- ACCOUNTS TABLE - Bank accounts
-- ============================================================================
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    routing_number VARCHAR(9) NOT NULL,
    account_type VARCHAR(20) DEFAULT 'checking', -- checking, savings, credit
    balance DECIMAL(15, 2) DEFAULT 0.00,
    available_balance DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2),
    interest_rate DECIMAL(5, 2),
    account_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CARDS TABLE - Credit/Debit cards (CRITICAL VULNERABILITIES)
-- ============================================================================
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    account_id INTEGER REFERENCES accounts(id),
    card_number VARCHAR(19) NOT NULL, -- ❌ CRITICAL: Stores full PAN
    cvv VARCHAR(4) NOT NULL,          -- ❌ CRITICAL: Stores CVV (PCI 3.2.2 violation)
    pin VARCHAR(6),                   -- ❌ CRITICAL: Stores PIN (PCI 3.2.3 violation)
    exp_month INTEGER NOT NULL,
    exp_year INTEGER NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    card_type VARCHAR(20),            -- visa, mastercard, amex, discover
    card_brand VARCHAR(20),           -- debit, credit
    billing_address TEXT,
    billing_zip VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    card_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP
);

-- ============================================================================
-- PAYMENTS TABLE - Transaction history
-- ============================================================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES cards(id),
    account_id INTEGER REFERENCES accounts(id),
    merchant_id INTEGER,
    transaction_type VARCHAR(20), -- purchase, refund, transfer, withdrawal
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    merchant_name VARCHAR(100),
    merchant_category VARCHAR(50),
    transaction_status VARCHAR(20) DEFAULT 'pending',
    authorization_code VARCHAR(20),
    card_last_four VARCHAR(4), -- ❌ Redundant storage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ============================================================================
-- MERCHANTS TABLE - Merchant accounts
-- ============================================================================
CREATE TABLE merchants (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(100),
    tax_id VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    merchant_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- API_KEYS TABLE - Merchant API credentials (VULNERABLE)
-- ============================================================================
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id),
    merchant_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL, -- ❌ Plaintext API keys (no hashing)
    api_secret VARCHAR(255),       -- ❌ Plaintext secrets
    webhook_url TEXT,              -- ❌ No HMAC validation
    permissions TEXT,              -- ❌ Stored as plain text JSON
    rate_limit INTEGER DEFAULT 1000,
    key_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    expires_at TIMESTAMP
);

-- ============================================================================
-- MERCHANT_TRANSACTIONS TABLE - Merchant payment processing
-- ============================================================================
CREATE TABLE merchant_transactions (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id),
    customer_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES cards(id),
    api_key_id INTEGER REFERENCES api_keys(id),
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(10, 2),
    net_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    customer_email VARCHAR(100),
    customer_ip VARCHAR(45),      -- ❌ No IP address validation/sanitization
    metadata TEXT,                -- ❌ Unvalidated JSON storage
    transaction_status VARCHAR(20) DEFAULT 'pending',
    failure_reason TEXT,
    webhook_sent BOOLEAN DEFAULT false,
    webhook_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ============================================================================
-- INDEXES (Intentionally missing security-critical indexes)
-- ============================================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
-- ❌ MISSING: No index on SSN (makes searches slow, encourages full table scans)

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);

CREATE INDEX idx_cards_user_id ON cards(user_id);
-- ❌ MISSING: No index on card_number (SQL injection more impactful)

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_api_keys_merchant_id ON api_keys(merchant_id);
-- ❌ MISSING: No index on api_key (lookup performance issue)

CREATE INDEX idx_merchant_transactions_merchant_id ON merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_customer_id ON merchant_transactions(customer_id);

-- ============================================================================
-- SAMPLE DATA - For testing and demonstration
-- ============================================================================

-- Insert sample users
INSERT INTO users (username, email, password, full_name, phone, ssn, date_of_birth, address, city, state, zip_code) VALUES
('johndoe', 'john@email.com', 'password123', 'John Doe', '555-0101', '123-45-6789', '1985-06-15', '123 Main St', 'New York', 'NY', '10001'),
('janesmith', 'jane@email.com', 'password456', 'Jane Smith', '555-0102', '234-56-7890', '1990-03-22', '456 Oak Ave', 'Los Angeles', 'CA', '90001'),
('bobwilson', 'bob@email.com', 'password789', 'Bob Wilson', '555-0103', '345-67-8901', '1988-11-30', '789 Pine Rd', 'Chicago', 'IL', '60601'),
('alicejohnson', 'alice@email.com', 'password321', 'Alice Johnson', '555-0104', '456-78-9012', '1992-07-14', '321 Elm St', 'Houston', 'TX', '77001'),
('charlielee', 'charlie@email.com', 'password654', 'Charlie Lee', '555-0105', '567-89-0123', '1987-09-08', '654 Maple Dr', 'Phoenix', 'AZ', '85001');

-- Insert sample accounts
INSERT INTO accounts (user_id, account_number, routing_number, account_type, balance, available_balance, credit_limit) VALUES
(1, '1001234567890', '021000021', 'checking', 5000.00, 5000.00, NULL),
(1, '1001234567891', '021000021', 'savings', 15000.00, 15000.00, NULL),
(1, '1001234567892', '021000021', 'credit', 0.00, 5000.00, 5000.00),
(2, '1002345678901', '121000248', 'checking', 8500.00, 8500.00, NULL),
(2, '1002345678902', '121000248', 'credit', 1200.00, 3800.00, 5000.00),
(3, '1003456789012', '011401533', 'checking', 3200.00, 3200.00, NULL),
(3, '1003456789013', '011401533', 'savings', 25000.00, 25000.00, NULL),
(4, '1004567890123', '031201467', 'checking', 12000.00, 12000.00, NULL),
(5, '1005678901234', '051000017', 'checking', 6700.00, 6700.00, NULL),
(5, '1005678901235', '051000017', 'credit', 2100.00, 7900.00, 10000.00);

-- Insert sample cards (CRITICAL: Full card data stored)
INSERT INTO cards (user_id, account_id, card_number, cvv, pin, exp_month, exp_year, cardholder_name, card_type, card_brand, billing_zip) VALUES
(1, 1, '4532123456789012', '123', '1234', 12, 2025, 'John Doe', 'visa', 'debit', '10001'),
(1, 3, '5555555555554444', '456', '5678', 6, 2026, 'John Doe', 'mastercard', 'credit', '10001'),
(2, 4, '378282246310005', '7890', '9012', 3, 2027, 'Jane Smith', 'amex', 'credit', '90001'),
(2, 5, '6011111111111117', '234', '3456', 9, 2026, 'Jane Smith', 'discover', 'credit', '90001'),
(3, 6, '5105105105105100', '567', '6789', 11, 2025, 'Bob Wilson', 'mastercard', 'debit', '60601'),
(3, 7, '4111111111111111', '890', '0123', 8, 2027, 'Bob Wilson', 'visa', 'credit', '60601'),
(4, 8, '4532987654321098', '345', '4567', 5, 2026, 'Alice Johnson', 'visa', 'debit', '77001'),
(5, 9, '5555444433332222', '678', '7890', 10, 2025, 'Charlie Lee', 'mastercard', 'debit', '85001'),
(5, 10, '371449635398431', '9012', '1234', 12, 2027, 'Charlie Lee', 'amex', 'credit', '85001');

-- Insert sample merchants
INSERT INTO merchants (merchant_name, business_name, email, phone, address, city, state, zip_code) VALUES
('AcmeStore', 'Acme Online Store Inc', 'billing@acmestore.com', '555-1001', '100 Commerce Blvd', 'Seattle', 'WA', '98101'),
('TechGadgets', 'Tech Gadgets LLC', 'api@techgadgets.com', '555-1002', '200 Innovation Way', 'San Francisco', 'CA', '94102'),
('FoodDelivery', 'Fast Food Delivery Co', 'support@fooddelivery.com', '555-1003', '300 Restaurant Row', 'Austin', 'TX', '78701'),
('StreamFlix', 'StreamFlix Entertainment', 'payments@streamflix.com', '555-1004', '400 Media Dr', 'Los Angeles', 'CA', '90028'),
('CloudHost', 'Cloud Hosting Services Inc', 'billing@cloudhost.com', '555-1005', '500 Server St', 'Dallas', 'TX', '75201');

-- Insert sample API keys (PLAINTEXT)
INSERT INTO api_keys (merchant_id, merchant_name, api_key, api_secret, webhook_url, permissions, rate_limit) VALUES
(1, 'AcmeStore', 'acme_live_sk_4a3b2c1d5e6f7g8h9i0j', 'acme_secret_abc123xyz789', 'https://acmestore.com/webhooks/payments', '{"charges": true, "refunds": true, "customers": true}', 5000),
(2, 'TechGadgets', 'tech_live_sk_1z2y3x4w5v6u7t8s9r0q', 'tech_secret_def456uvw012', 'https://techgadgets.com/api/webhooks', '{"charges": true, "refunds": false, "customers": true}', 3000),
(3, 'FoodDelivery', 'food_live_sk_9i8u7y6t5r4e3w2q1a0s', 'food_secret_ghi789rst345', 'https://fooddelivery.com/payment-webhook', '{"charges": true, "refunds": true, "customers": false}', 10000),
(4, 'StreamFlix', 'stream_live_sk_5h4g3f2d1s0a9p8o7i6u', 'stream_secret_jkl012mno678', 'https://streamflix.com/webhooks/charge', '{"charges": true, "refunds": true, "customers": true}', 2000),
(5, 'CloudHost', 'cloud_live_sk_7k6j5h4g3f2d1s0a9z8x', 'cloud_secret_pqr345stu901', 'https://cloudhost.com/api/v1/webhooks', '{"charges": true, "refunds": true, "customers": true}', 8000);

-- Insert sample payment transactions
INSERT INTO payments (user_id, card_id, account_id, merchant_id, transaction_type, amount, fee, total_amount, merchant_name, merchant_category, transaction_status, card_last_four) VALUES
(1, 1, 1, 1, 'purchase', 99.99, 0.00, 99.99, 'AcmeStore', 'retail', 'completed', '9012'),
(1, 2, 3, 4, 'purchase', 29.99, 0.00, 29.99, 'StreamFlix', 'entertainment', 'completed', '4444'),
(2, 3, 4, 2, 'purchase', 1499.00, 0.00, 1499.00, 'TechGadgets', 'electronics', 'completed', '0005'),
(2, 4, 5, 3, 'purchase', 45.50, 2.50, 48.00, 'FoodDelivery', 'food', 'completed', '1117'),
(3, 5, 6, 1, 'purchase', 149.99, 0.00, 149.99, 'AcmeStore', 'retail', 'pending', '5100'),
(4, 7, 8, 5, 'purchase', 89.00, 0.00, 89.00, 'CloudHost', 'services', 'completed', '1098'),
(5, 8, 9, 2, 'purchase', 599.99, 0.00, 599.99, 'TechGadgets', 'electronics', 'completed', '2222'),
(1, 1, 1, 3, 'purchase', 32.75, 1.50, 34.25, 'FoodDelivery', 'food', 'completed', '9012'),
(3, 6, 7, 4, 'purchase', 29.99, 0.00, 29.99, 'StreamFlix', 'entertainment', 'failed', '1111'),
(5, 9, 10, 1, 'purchase', 275.00, 0.00, 275.00, 'AcmeStore', 'retail', 'completed', '8431');

-- Insert sample merchant transactions
INSERT INTO merchant_transactions (merchant_id, customer_id, card_id, api_key_id, amount, fee, net_amount, customer_email, customer_ip, metadata, transaction_status) VALUES
(1, 1, 1, 1, 99.99, 2.90, 97.09, 'john@email.com', '192.168.1.100', '{"order_id": "ORD-12345", "items": 3}', 'completed'),
(2, 2, 3, 2, 1499.00, 43.47, 1455.53, 'jane@email.com', '10.0.0.50', '{"product": "Laptop Pro", "warranty": true}', 'completed'),
(3, 2, 4, 3, 45.50, 1.59, 43.91, 'jane@email.com', '172.16.0.25', '{"restaurant": "Pizza Place", "delivery": true}', 'completed'),
(4, 1, 2, 4, 29.99, 0.87, 29.12, 'john@email.com', '192.168.1.100', '{"subscription": "monthly", "plan": "premium"}', 'completed'),
(5, 4, 7, 5, 89.00, 2.58, 86.42, 'alice@email.com', '10.10.10.10', '{"service": "VPS-Standard", "billing": "monthly"}', 'completed');

-- ============================================================================
-- GRANT PERMISSIONS (OVERLY PERMISSIVE)
-- ============================================================================
-- ❌ Grant all privileges to app user (excessive permissions)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- DATABASE STATISTICS
-- ============================================================================
SELECT 'Database initialized successfully!' as status;
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM accounts) as total_accounts,
    (SELECT COUNT(*) FROM cards) as total_cards,
    (SELECT COUNT(*) FROM merchants) as total_merchants,
    (SELECT COUNT(*) FROM api_keys) as total_api_keys,
    (SELECT COUNT(*) FROM payments) as total_payments,
    (SELECT COUNT(*) FROM merchant_transactions) as total_merchant_transactions;

-- Display sample card data (DEMONSTRATING VULNERABILITY)
SELECT
    c.id,
    u.username,
    c.card_number as "⚠️ FULL_CARD_NUMBER",
    c.cvv as "⚠️ CVV_STORED",
    c.pin as "⚠️ PIN_STORED",
    c.exp_month || '/' || c.exp_year as expiry,
    c.cardholder_name
FROM cards c
JOIN users u ON c.user_id = u.id
ORDER BY c.id
LIMIT 5;
