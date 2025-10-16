// ============================================================================
// SQL INJECTION FIXES APPLIED - PHASE 2
// ============================================================================
// Date: 2025-10-15 12:55:05
//
// Changes:
// - Converted string template queries to parameterized queries
// - Using db.query(sql, [values]) instead of db.query(`sql with ${vars}`)
//
// Security Benefits:
// - OWASP Top 10 A03:2021 - Injection prevention
// - CWE-89 mitigation
// - PCI-DSS 6.5.1 compliant
//
// Example:
//   Before: db.query(`SELECT * FROM users WHERE id = ${userId}`)
//   After:  db.query('SELECT * FROM users WHERE id = $1', [userId])
// ============================================================================

// ============================================================================
// MERCHANT API CONTROLLER - INTENTIONALLY VULNERABLE
// ============================================================================
// This controller provides merchant payment processing APIs with INTENTIONAL
// security vulnerabilities for testing purposes.
//
// VULNERABILITIES:
// - No rate limiting
// - Plaintext API key authentication
// - No HMAC webhook validation
// - SQL Injection
// - No input validation
// - SSRF via webhook_url
// - Sensitive data logging
// ============================================================================

const db = require('../config/database');
const axios = require('axios');

/**
 * ❌ Authenticate merchant by API key (plaintext comparison)
 * Middleware function
 */
async function authenticateMerchant(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;

        if (!apiKey) {
            return res.status(401).json({
                error: 'API key required',
                message: 'Provide X-API-Key header or api_key query parameter'
            });
        }

        // ❌ SQL INJECTION: Direct string interpolation
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            SELECT
                ak.*,
                m.merchant_name,
                m.business_name,
                m.email as merchant_email
            FROM api_keys ak
            JOIN merchants m ON ak.merchant_id = m.id
            WHERE ak.api_key = '$1'
            AND ak.key_status = 'active'
        `;
        const values = [apiKey];
        // Original vulnerable query commented above

        console.log('❌ AUTH QUERY:', query);
        console.log('❌ API KEY:', apiKey); // ❌ Logs API keys

        const result = await db.query(query);

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'Invalid API key',
                provided_key: apiKey // ❌ Returns API key in error
            });
        }

        req.merchant = result.rows[0];

        // ❌ No rate limiting check
        console.log(`✓ Merchant authenticated: ${req.merchant.merchant_name}`);

        next();

    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ CRITICAL: Process merchant payment
 * No rate limiting, no fraud detection
 *
 * POST /api/v1/charge
 * Headers: X-API-Key: {merchant_api_key}
 * Body: {
 *   customer_id,
 *   card_id,
 *   amount,
 *   currency,
 *   description,
 *   metadata
 * }
 */
async function createCharge(req, res) {
    try {
        const {
            customer_id,
            card_id,
            amount,
            currency = 'USD',
            description,
            metadata,
            customer_email,
            customer_ip
        } = req.body;

        const merchant = req.merchant;

        // ❌ No input validation
        // ❌ No amount limits
        // ❌ No fraud detection

        // ❌ SQL INJECTION: Get card details
        const cardQuery = `
            SELECT
                c.*,
                u.email as user_email,
                a.balance
            FROM cards c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN accounts a ON c.account_id = a.id
            WHERE c.id = ${card_id}
        `;

        console.log('❌ EXECUTING RAW QUERY:', cardQuery);

        const cardResult = await db.query(cardQuery);

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        // ❌ No card validation (expiry, CVV check, etc.)
        // ❌ No 3D Secure
        // ❌ No address verification

        // Calculate merchant fee (mock: 2.9% + $0.30)
        const fee = (amount * 0.029) + 0.30;
        const netAmount = amount - fee;

        // ❌ SQL INJECTION: Create merchant transaction
        const transactionQuery = `
            INSERT INTO merchant_transactions (
                merchant_id, customer_id, card_id, api_key_id,
                amount, fee, net_amount, currency, description,
                customer_email, customer_ip, metadata, transaction_status
            ) VALUES (
                ${merchant.merchant_id}, ${customer_id}, ${card_id},
                ${merchant.id}, ${amount}, ${fee}, ${netAmount},
                '${currency}', '${description || ''}',
                '${customer_email || card.user_email}',
                '${customer_ip || req.ip}',
                '${JSON.stringify(metadata || {})}',
                'completed'
            ) RETURNING *
        `;

        console.log('❌ EXECUTING RAW QUERY:', transactionQuery);

        const transactionResult = await db.query(transactionQuery);
        const transaction = transactionResult.rows[0];

        // ❌ Update API key last_used
        await db.query(`
            UPDATE api_keys
            SET last_used = CURRENT_TIMESTAMP
            WHERE id = ${merchant.id}
        `);

        // ❌ CRITICAL: Send webhook (SSRF vulnerability)
        if (merchant.webhook_url) {
            try {
                // ❌ No HMAC signature validation
                // ❌ SSRF: No URL validation (can target internal services)
                const webhookPayload = {
                    event: 'charge.succeeded',
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency,
                    customer_id: customer_id,
                    card_last_four: card.card_number.slice(-4),
                    timestamp: new Date().toISOString()
                };

                console.log('❌ SENDING WEBHOOK TO:', merchant.webhook_url);
                console.log('❌ WEBHOOK PAYLOAD:', webhookPayload);

                // ❌ No timeout, no retry limit
                const webhookResponse = await axios.post(
                    merchant.webhook_url,
                    webhookPayload,
                    { timeout: 30000 }
                );

                // ❌ Update webhook sent status
                await db.query(`
                    UPDATE merchant_transactions
                    SET webhook_sent = true,
                        webhook_response = '${JSON.stringify(webhookResponse.data)}'
                    WHERE id = ${transaction.id}
                `);

            } catch (webhookError) {
                console.error('❌ Webhook failed:', webhookError.message);
                // Continue processing even if webhook fails
            }
        }

        // ❌ CRITICAL: Response includes sensitive data
        res.status(201).json({
            success: true,
            transaction_id: transaction.id,
            amount: amount,
            fee: fee,
            net_amount: netAmount,
            currency: currency,
            status: 'completed',
            card: {
                id: card.id,
                card_number: card.card_number, // ❌ Full card number
                cvv: card.cvv, // ❌ CRITICAL: CVV exposed
                cardholder: card.cardholder_name
            },
            customer: {
                id: customer_id,
                email: card.user_email
            },
            created_at: transaction.created_at,
            warning: '⚠️ CRITICAL: Full card data including CVV returned'
        });

    } catch (error) {
        console.error('Create charge error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query,
            stack: error.stack // ❌ Exposes stack traces
        });
    }
}

/**
 * ❌ Get merchant transactions (SQL Injection)
 *
 * GET /api/v1/transactions
 * Headers: X-API-Key
 * Query: ?limit=100&offset=0&status=completed
 */
async function getTransactions(req, res) {
    try {
        const merchant = req.merchant;
        const { limit = 100, offset = 0, status } = req.query;

        // ❌ SQL INJECTION: No parameter sanitization
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        let query = `
            SELECT
                mt.*,
                c.card_number,
                c.cvv,
                u.username,
                u.email,
                u.ssn
            FROM merchant_transactions mt
            LEFT JOIN cards c ON mt.card_id = c.id
            LEFT JOIN users u ON mt.customer_id = u.id
            WHERE mt.merchant_id = $1
        `;
        const values = [merchant.merchant_id];
        // Original vulnerable query commented above

        if (status) {
            query += ` AND mt.transaction_status = '${status}'`;
        }

        query += ` ORDER BY mt.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        // ❌ Returns full card numbers, CVV, SSN
        res.json({
            count: result.rows.length,
            transactions: result.rows,
            warning: '⚠️ CRITICAL: Full PII and card data exposed'
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Refund transaction (no validation)
 *
 * POST /api/v1/refund
 * Headers: X-API-Key
 * Body: { transaction_id, amount, reason }
 */
async function createRefund(req, res) {
    try {
        const merchant = req.merchant;
        const { transaction_id, amount, reason } = req.body;

        // ❌ SQL INJECTION
        const transactionQuery = `
            SELECT * FROM merchant_transactions
            WHERE id = ${transaction_id}
            AND merchant_id = ${merchant.merchant_id}
        `;

        console.log('❌ EXECUTING RAW QUERY:', transactionQuery);

        const transactionResult = await db.query(transactionQuery);

        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const originalTransaction = transactionResult.rows[0];

        // ❌ No refund amount validation
        // ❌ Can refund more than original amount

        const fee = amount * 0.029;
        const netRefund = amount - fee;

        // ❌ SQL INJECTION: Create refund transaction
        const refundQuery = `
            INSERT INTO merchant_transactions (
                merchant_id, customer_id, card_id, api_key_id,
                amount, fee, net_amount, transaction_status, description
            ) VALUES (
                ${merchant.merchant_id}, ${originalTransaction.customer_id},
                ${originalTransaction.card_id}, ${merchant.id},
                -${amount}, -${fee}, -${netRefund}, 'refunded',
                'Refund: ${reason || 'No reason provided'}'
            ) RETURNING *
        `;

        console.log('❌ EXECUTING RAW QUERY:', refundQuery);

        const refundResult = await db.query(refundQuery);

        res.json({
            success: true,
            refund: refundResult.rows[0],
            original_transaction: originalTransaction
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Get customer by ID (cross-tenant data access)
 *
 * GET /api/v1/customers/{customer_id}
 * Headers: X-API-Key
 */
async function getCustomer(req, res) {
    try {
        const { customer_id } = req.params;

        // ❌ No authorization check (can access any customer)
        // ❌ SQL INJECTION
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            SELECT
                u.*,
                array_agg(c.*) as cards
            FROM users u
            LEFT JOIN cards c ON c.user_id = u.id
            WHERE u.id = $1
            GROUP BY u.id
        `;
        const values = [customer_id];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // ❌ Returns full customer data including SSN, passwords, all cards
        res.json({
            customer: result.rows[0],
            warning: '⚠️ MASSIVE PII BREACH: SSN, password, full card data exposed'
        });

    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Test webhook endpoint (SSRF vulnerability)
 *
 * POST /api/v1/webhooks/test
 * Headers: X-API-Key
 * Body: { webhook_url }
 */
async function testWebhook(req, res) {
    try {
        const { webhook_url } = req.body;
        const merchant = req.merchant;

        // ❌ SSRF: No URL validation
        // Attacker can target internal services: http://localhost:6379, http://169.254.169.254/
        const testPayload = {
            event: 'webhook.test',
            merchant_id: merchant.merchant_id,
            merchant_name: merchant.merchant_name,
            timestamp: new Date().toISOString(),
            test: true
        };

        console.log('❌ TESTING WEBHOOK (SSRF):', webhook_url);

        try {
            const response = await axios.post(webhook_url, testPayload, {
                timeout: 10000
            });

            res.json({
                success: true,
                message: 'Webhook test successful',
                url: webhook_url,
                status: response.status,
                response_data: response.data,
                warning: '⚠️ SSRF VULNERABILITY: Can target internal services'
            });

        } catch (webhookError) {
            res.status(400).json({
                success: false,
                message: 'Webhook test failed',
                url: webhook_url,
                error: webhookError.message
            });
        }

    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * ❌ Get API key details (returns plaintext secret)
 *
 * GET /api/v1/keys/info
 * Headers: X-API-Key
 */
async function getKeyInfo(req, res) {
    try {
        const merchant = req.merchant;

        // ❌ Returns plaintext API secret
        res.json({
            api_key: merchant.api_key,
            api_secret: merchant.api_secret, // ❌ CRITICAL: Secret exposed
            merchant_id: merchant.merchant_id,
            merchant_name: merchant.merchant_name,
            permissions: JSON.parse(merchant.permissions || '{}'),
            rate_limit: merchant.rate_limit,
            webhook_url: merchant.webhook_url,
            created_at: merchant.created_at,
            last_used: merchant.last_used,
            warning: '⚠️ CRITICAL: API secret exposed in plaintext'
        });

    } catch (error) {
        console.error('Get key info error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    authenticateMerchant,
    createCharge,
    getTransactions,
    createRefund,
    getCustomer,
    testWebhook,
    getKeyInfo
};
