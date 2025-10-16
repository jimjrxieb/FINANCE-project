// ============================================================================
// ENHANCED MERCHANT PAYMENT PROCESSING API CONTROLLER
// ============================================================================
// B2B payment API for merchant partners (like Stripe, Square)
// Allows merchants to charge customers, process refunds, and manage subscriptions
//
// ❌ INTENTIONALLY VULNERABLE - Contains 35+ security flaws for GP-Copilot demo
// ============================================================================

const { getPool } = require('../config/database');
const axios = require('axios');

// ============================================================================
// HELPER: AUTHENTICATE MERCHANT VIA API KEY
// ============================================================================

/**
 * Extract API key from Authorization header and validate
 * ❌ VULNERABILITY: No timing-safe comparison
 * ❌ VULNERABILITY: API keys stored in plaintext in database
 * ❌ VULNERABILITY: SQL injection in lookup query
 */
async function authenticateMerchant(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Missing or invalid Authorization header',
            message: 'Expected: Authorization: Bearer {api_key}',
            hint: 'Get your API key from the merchant dashboard'
        });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '

    try {
        // ❌ VULNERABILITY: SQL injection in API key lookup
        const query = `SELECT * FROM api_keys WHERE api_key = '${apiKey}' AND is_active = true`;
        const result = await getPool().query(query);

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid API key',
                message: 'The provided API key is invalid or has been revoked',
                api_key_provided: apiKey // ❌ VULNERABILITY: Exposing API key in error
            });
        }

        const apiKeyRecord = result.rows[0];

        // ❌ VULNERABILITY: No rate limiting check
        // Should check: apiKeyRecord.rate_limit_per_hour

        // Attach merchant info to request object
        req.merchant_id = apiKeyRecord.merchant_id;
        req.api_key_id = apiKeyRecord.id;
        req.api_key = apiKey; // ❌ VULNERABILITY: Storing API key in request object

        next();
    } catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            message: error.message, // ❌ VULNERABILITY: Exposing error details
            stack: error.stack // ❌ CRITICAL: Exposing stack trace
        });
    }
}

// ============================================================================
// HELPER: SEND WEBHOOK NOTIFICATION
// ============================================================================

/**
 * Send webhook notification to merchant
 * ❌ VULNERABILITY: No HMAC signature
 * ❌ VULNERABILITY: No retry logic
 * ❌ VULNERABILITY: No timeout handling
 * ❌ VULNERABILITY: SQL injection
 */
async function sendWebhookNotification(merchant_id, event_type, data) {
    try {
        // Get merchant webhook URL
        // ❌ VULNERABILITY: SQL injection
        const query = `SELECT webhook_url FROM merchants WHERE id = ${merchant_id}`;
        const result = await getPool().query(query);

        if (result.rows.length === 0 || !result.rows[0].webhook_url) {
            console.log(`No webhook URL configured for merchant ${merchant_id}`);
            return { status: 'no_webhook' };
        }

        const webhookUrl = result.rows[0].webhook_url;

        // Prepare webhook payload
        // ❌ VULNERABILITY: No HMAC signature for verification
        const payload = {
            event: event_type,
            timestamp: new Date().toISOString(),
            data: data
            // ❌ MISSING: signature field
        };

        // Send webhook
        // ❌ VULNERABILITY: No timeout, could hang forever
        // ❌ VULNERABILITY: No retry logic
        // ❌ VULNERABILITY: Could be used for SSRF attacks
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SecureBank-Webhooks/1.0'
                // ❌ MISSING: X-Webhook-Signature header
            }
        });

        // Log webhook delivery
        // ❌ VULNERABILITY: SQL injection
        const logQuery = `
            INSERT INTO webhook_deliveries
            (merchant_id, event_type, payload, response_status, delivered_at)
            VALUES (${merchant_id}, '${event_type}', '${JSON.stringify(payload)}', ${response.status}, NOW())
        `;
        await getPool().query(logQuery);

        return {
            status: 'sent',
            response_status: response.status
        };

    } catch (error) {
        console.error('Webhook delivery failed:', error.message);

        // Log failed delivery
        try {
            // ❌ VULNERABILITY: SQL injection
            const logQuery = `
                INSERT INTO webhook_deliveries
                (merchant_id, event_type, payload, response_status, error_message, delivered_at)
                VALUES (${merchant_id}, '${event_type}', '{}', 0, '${error.message}', NOW())
            `;
            await getPool().query(logQuery);
        } catch (logError) {
            console.error('Failed to log webhook error:', logError);
        }

        return {
            status: 'failed',
            error: error.message
        };
    }
}

// ============================================================================
// ENDPOINT 1: POST /api/v1/charge - CHARGE CUSTOMER
// ============================================================================

/**
 * Process a payment charge for a customer
 * ❌ VULNERABILITY: No input validation (accepts negative amounts, huge amounts)
 * ❌ VULNERABILITY: No rate limiting
 * ❌ VULNERABILITY: SQL injection everywhere
 * ❌ VULNERABILITY: No balance validation
 */
async function createCharge(req, res) {
    const { customer_id, amount, description, metadata } = req.body;

    // ❌ VULNERABILITY: No input validation
    // Should validate:
    // - amount > 0
    // - amount < max_limit
    // - customer_id exists
    // - description is not malicious
    // - metadata is valid JSON

    // ❌ VULNERABILITY: No rate limiting
    // A merchant could spam thousands of charges per second

    // Calculate fee: 2.9% + $0.30 (Stripe-style pricing)
    const feePercentage = 0.029;
    const feeFixed = 0.30;
    const fee = (parseFloat(amount) * feePercentage) + feeFixed;
    const totalCharge = parseFloat(amount) + fee;

    try {
        // Start database transaction
        await getPool().query('BEGIN');

        // 1. Get customer checking account
        // ❌ VULNERABILITY: SQL injection
        const customerQuery = `
            SELECT a.* FROM accounts a
            JOIN merchants m ON a.user_id = m.user_id
            WHERE m.id = ${customer_id} AND a.account_type = 'checking'
        `;
        const customerResult = await getPool().query(customerQuery);

        if (customerResult.rows.length === 0) {
            await getPool().query('ROLLBACK');
            return res.status(404).json({
                error: 'Customer not found',
                message: `No checking account found for customer ID ${customer_id}`,
                customer_id_provided: customer_id // ❌ VULNERABILITY: Exposing input
            });
        }

        const customerAccount = customerResult.rows[0];

        // ❌ VULNERABILITY: No balance check before charging
        // Should verify: customerAccount.balance >= totalCharge

        // 2. Deduct from customer account
        // ❌ VULNERABILITY: SQL injection
        const debitQuery = `
            UPDATE accounts
            SET balance = balance - ${totalCharge}
            WHERE id = ${customerAccount.id}
        `;
        await getPool().query(debitQuery);

        // 3. Get merchant account
        // ❌ VULNERABILITY: SQL injection
        const merchantQuery = `
            SELECT a.* FROM accounts a
            JOIN merchants m ON a.user_id = m.user_id
            WHERE m.id = ${req.merchant_id} AND a.account_type = 'checking'
        `;
        const merchantResult = await getPool().query(merchantQuery);

        if (merchantResult.rows.length === 0) {
            await getPool().query('ROLLBACK');
            return res.status(500).json({
                error: 'Merchant account not found',
                message: 'Failed to locate merchant checking account',
                merchant_id: req.merchant_id // ❌ VULNERABILITY: Exposing merchant ID
            });
        }

        const merchantAccount = merchantResult.rows[0];

        // 4. Credit merchant account (amount only, platform keeps fee)
        // ❌ VULNERABILITY: SQL injection
        const creditQuery = `
            UPDATE accounts
            SET balance = balance + ${amount}
            WHERE id = ${merchantAccount.id}
        `;
        await getPool().query(creditQuery);

        // 5. Insert transaction record
        // ❌ VULNERABILITY: SQL injection
        const metadataJson = metadata ? JSON.stringify(metadata) : '{}';
        const insertQuery = `
            INSERT INTO merchant_transactions
            (merchant_id, customer_id, amount, fee, description, metadata, status, created_at)
            VALUES (
                ${req.merchant_id},
                ${customer_id},
                ${amount},
                ${fee},
                '${description}',
                '${metadataJson}',
                'succeeded',
                NOW()
            )
            RETURNING id
        `;
        const insertResult = await getPool().query(insertQuery);
        const transactionId = insertResult.rows[0].id;

        // Commit transaction
        await getPool().query('COMMIT');

        // Send webhook notification (async, don't wait)
        // ❌ VULNERABILITY: Webhook has no signature
        sendWebhookNotification(req.merchant_id, 'charge.succeeded', {
            transaction_id: transactionId,
            amount: parseFloat(amount),
            fee: fee,
            customer_id: customer_id,
            description: description,
            metadata: metadata
        }).catch(err => console.error('Webhook failed:', err));

        // Return success response
        res.json({
            transaction_id: transactionId,
            status: 'succeeded',
            amount: parseFloat(amount),
            fee: fee,
            net_amount: parseFloat(amount), // What merchant receives
            total_charge: totalCharge, // What customer was charged
            customer_id: customer_id,
            description: description,
            metadata: metadata,
            created: new Date().toISOString()
        });

    } catch (error) {
        await getPool().query('ROLLBACK');
        console.error('Charge failed:', error);

        res.status(500).json({
            error: 'Charge failed',
            message: error.message, // ❌ VULNERABILITY: Exposing error details
            details: error.stack, // ❌ CRITICAL: Exposing stack trace
            input: req.body // ❌ VULNERABILITY: Exposing input data
        });
    }
}

// ============================================================================
// ENDPOINT 2: POST /api/v1/refund - REFUND TRANSACTION
// ============================================================================

/**
 * Refund a previous transaction
 * ❌ VULNERABILITY: No authorization check (any merchant can refund any transaction)
 * ❌ VULNERABILITY: SQL injection
 * ❌ VULNERABILITY: No balance validation
 */
async function createRefund(req, res) {
    const { transaction_id } = req.body;

    // ❌ VULNERABILITY: No input validation
    // ❌ VULNERABILITY: No authorization check (any merchant can refund any transaction)

    try {
        await getPool().query('BEGIN');

        // 1. Find original transaction
        // ❌ VULNERABILITY: SQL injection
        const txQuery = `
            SELECT * FROM merchant_transactions
            WHERE id = ${transaction_id}
        `;
        const txResult = await getPool().query(txQuery);

        if (txResult.rows.length === 0) {
            await getPool().query('ROLLBACK');
            return res.status(404).json({
                error: 'Transaction not found',
                message: `No transaction found with ID ${transaction_id}`,
                transaction_id_provided: transaction_id
            });
        }

        const transaction = txResult.rows[0];

        // ❌ VULNERABILITY: No check if transaction.merchant_id === req.merchant_id
        // Any merchant can refund any other merchant's transaction!

        if (transaction.status === 'refunded') {
            await getPool().query('ROLLBACK');
            return res.status(400).json({
                error: 'Already refunded',
                message: 'This transaction has already been refunded',
                transaction: transaction // ❌ VULNERABILITY: Exposing transaction details
            });
        }

        // 2. Get customer account
        // ❌ VULNERABILITY: SQL injection
        const customerQuery = `
            SELECT a.* FROM accounts a
            JOIN merchants m ON a.user_id = m.user_id
            WHERE m.id = ${transaction.customer_id} AND a.account_type = 'checking'
        `;
        const customerResult = await getPool().query(customerQuery);

        if (customerResult.rows.length === 0) {
            await getPool().query('ROLLBACK');
            return res.status(404).json({
                error: 'Customer account not found',
                customer_id: transaction.customer_id
            });
        }

        const customerAccount = customerResult.rows[0];

        // 3. Credit customer (refund amount + fee)
        const refundAmount = parseFloat(transaction.amount) + parseFloat(transaction.fee);
        // ❌ VULNERABILITY: SQL injection
        const creditQuery = `
            UPDATE accounts
            SET balance = balance + ${refundAmount}
            WHERE id = ${customerAccount.id}
        `;
        await getPool().query(creditQuery);

        // 4. Get merchant account
        // ❌ VULNERABILITY: SQL injection
        const merchantQuery = `
            SELECT a.* FROM accounts a
            JOIN merchants m ON a.user_id = m.user_id
            WHERE m.id = ${transaction.merchant_id} AND a.account_type = 'checking'
        `;
        const merchantResult = await getPool().query(merchantQuery);

        if (merchantResult.rows.length === 0) {
            await getPool().query('ROLLBACK');
            return res.status(500).json({
                error: 'Merchant account not found',
                merchant_id: transaction.merchant_id
            });
        }

        const merchantAccount = merchantResult.rows[0];

        // 5. Debit merchant (amount only, platform absorbs fee loss)
        // ❌ VULNERABILITY: SQL injection
        // ❌ VULNERABILITY: No balance check before debit
        const debitQuery = `
            UPDATE accounts
            SET balance = balance - ${transaction.amount}
            WHERE id = ${merchantAccount.id}
        `;
        await getPool().query(debitQuery);

        // 6. Update transaction status
        // ❌ VULNERABILITY: SQL injection
        const updateQuery = `
            UPDATE merchant_transactions
            SET status = 'refunded', refunded_at = NOW()
            WHERE id = ${transaction_id}
        `;
        await getPool().query(updateQuery);

        await getPool().query('COMMIT');

        // Send webhook notification
        sendWebhookNotification(transaction.merchant_id, 'charge.refunded', {
            transaction_id: transaction_id,
            amount: transaction.amount,
            refund_amount: refundAmount,
            customer_id: transaction.customer_id
        }).catch(err => console.error('Webhook failed:', err));

        res.json({
            status: 'refunded',
            transaction_id: transaction_id,
            amount: parseFloat(transaction.amount),
            fee: parseFloat(transaction.fee),
            refund_amount: refundAmount,
            refunded_at: new Date().toISOString()
        });

    } catch (error) {
        await getPool().query('ROLLBACK');
        console.error('Refund failed:', error);

        res.status(500).json({
            error: 'Refund failed',
            message: error.message, // ❌ VULNERABILITY: Exposing error details
            stack: error.stack, // ❌ CRITICAL: Exposing stack trace
            input: req.body
        });
    }
}

// ============================================================================
// ENDPOINT 3: GET /api/v1/transactions - LIST TRANSACTIONS
// ============================================================================

/**
 * Get merchant transaction history
 * ❌ VULNERABILITY: SQL injection in status filter
 * ❌ VULNERABILITY: No pagination limits (can request millions of records)
 */
async function getTransactions(req, res) {
    const { limit = 100, status } = req.query;

    // ❌ VULNERABILITY: No pagination (can request millions of records)
    // ❌ VULNERABILITY: SQL injection in status filter and limit

    try {
        // Build query with optional status filter
        let query = `
            SELECT * FROM merchant_transactions
            WHERE merchant_id = ${req.merchant_id}
        `;

        if (status) {
            // ❌ VULNERABILITY: SQL injection
            query += ` AND status = '${status}'`;
        }

        // ❌ VULNERABILITY: SQL injection in limit
        query += ` ORDER BY created_at DESC LIMIT ${limit}`;

        const result = await getPool().query(query);

        // Get total count
        // ❌ VULNERABILITY: SQL injection
        let countQuery = `
            SELECT COUNT(*) as total
            FROM merchant_transactions
            WHERE merchant_id = ${req.merchant_id}
        `;

        if (status) {
            countQuery += ` AND status = '${status}'`;
        }

        const countResult = await getPool().query(countQuery);
        const totalCount = parseInt(countResult.rows[0].total);

        res.json({
            transactions: result.rows,
            count: result.rows.length,
            total: totalCount,
            limit: parseInt(limit),
            status_filter: status || 'all'
        });

    } catch (error) {
        console.error('Transaction list error:', error);
        res.status(500).json({
            error: 'Failed to retrieve transactions',
            message: error.message, // ❌ VULNERABILITY: Exposing error details
            query_params: req.query, // ❌ VULNERABILITY: Exposing query parameters
            stack: error.stack
        });
    }
}

// ============================================================================
// ENDPOINT 4: POST /api/v1/recurring - CREATE RECURRING SUBSCRIPTION
// ============================================================================

/**
 * Create a recurring subscription/scheduled payment
 * ❌ VULNERABILITY: No input validation
 * ❌ VULNERABILITY: SQL injection
 * ❌ VULNERABILITY: No customer verification
 */
async function createRecurring(req, res) {
    const { customer_id, amount, frequency, description } = req.body;

    // ❌ VULNERABILITY: No input validation
    // ❌ VULNERABILITY: No verification that customer exists
    // ❌ VULNERABILITY: No verification that customer has sufficient funds

    try {
        // Calculate next charge date based on frequency
        let nextCharge = new Date();

        switch (frequency) {
            case 'daily':
                nextCharge.setDate(nextCharge.getDate() + 1);
                break;
            case 'weekly':
                nextCharge.setDate(nextCharge.getDate() + 7);
                break;
            case 'monthly':
                nextCharge.setMonth(nextCharge.getMonth() + 1);
                break;
            case 'yearly':
                nextCharge.setFullYear(nextCharge.getFullYear() + 1);
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid frequency',
                    message: 'Frequency must be: daily, weekly, monthly, or yearly',
                    frequency_provided: frequency
                });
        }

        // Insert scheduled payment
        // ❌ VULNERABILITY: SQL injection
        const insertQuery = `
            INSERT INTO scheduled_payments
            (merchant_id, customer_id, amount, frequency, description, next_charge_date, is_active, created_at)
            VALUES (
                ${req.merchant_id},
                ${customer_id},
                ${amount},
                '${frequency}',
                '${description}',
                '${nextCharge.toISOString()}',
                true,
                NOW()
            )
            RETURNING id
        `;
        const result = await getPool().query(insertQuery);
        const subscriptionId = result.rows[0].id;

        // Send webhook notification
        sendWebhookNotification(req.merchant_id, 'subscription.created', {
            subscription_id: subscriptionId,
            customer_id: customer_id,
            amount: parseFloat(amount),
            frequency: frequency,
            next_charge: nextCharge.toISOString()
        }).catch(err => console.error('Webhook failed:', err));

        res.json({
            subscription_id: subscriptionId,
            customer_id: customer_id,
            amount: parseFloat(amount),
            frequency: frequency,
            next_charge: nextCharge.toISOString(),
            status: 'active',
            description: description,
            created: new Date().toISOString()
        });

    } catch (error) {
        console.error('Recurring payment creation failed:', error);
        res.status(500).json({
            error: 'Failed to create subscription',
            message: error.message, // ❌ VULNERABILITY: Exposing error details
            details: error.stack, // ❌ CRITICAL: Exposing stack trace
            input: req.body
        });
    }
}

// ============================================================================
// ENDPOINT 5: POST /api/v1/webhook/test - TEST WEBHOOK (Internal/Debug)
// ============================================================================

/**
 * Test webhook delivery (should be admin-only but isn't)
 * ❌ VULNERABILITY: No admin authentication
 * ❌ VULNERABILITY: No rate limiting (could be used for DDoS)
 * ❌ VULNERABILITY: Could be used for SSRF attacks
 */
async function testWebhook(req, res) {
    const { event_type, data } = req.body;

    // ❌ VULNERABILITY: No authentication check - any merchant can trigger webhooks
    // ❌ VULNERABILITY: No rate limiting - could be used for DDoS against webhook URLs
    // ❌ VULNERABILITY: Could be used for SSRF (Server-Side Request Forgery)

    try {
        const result = await sendWebhookNotification(
            req.merchant_id,
            event_type || 'test.event',
            data || { test: true, timestamp: new Date().toISOString() }
        );

        res.json({
            message: 'Webhook test sent',
            merchant_id: req.merchant_id,
            event_type: event_type || 'test.event',
            result: result
        });

    } catch (error) {
        res.status(500).json({
            error: 'Webhook test failed',
            message: error.message,
            stack: error.stack
        });
    }
}

// ============================================================================
// EXISTING ENDPOINTS (from original controller)
// ============================================================================

/**
 * Get customer details (cross-tenant access vulnerability)
 */
async function getCustomer(req, res) {
    const { customer_id } = req.params;

    try {
        // ❌ VULNERABILITY: SQL injection
        // ❌ VULNERABILITY: No authorization check (can access any customer)
        const query = `
            SELECT m.*, a.balance
            FROM merchants m
            LEFT JOIN accounts a ON m.user_id = a.user_id
            WHERE m.id = ${customer_id}
        `;
        const result = await getPool().query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Customer not found',
                customer_id: customer_id
            });
        }

        res.json({
            customer: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve customer',
            message: error.message,
            stack: error.stack
        });
    }
}

/**
 * Get API key info (exposes secret)
 */
async function getKeyInfo(req, res) {
    try {
        // ❌ VULNERABILITY: SQL injection
        // ❌ VULNERABILITY: Exposes plaintext API key
        const query = `
            SELECT * FROM api_keys
            WHERE id = ${req.api_key_id}
        `;
        const result = await getPool().query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'API key not found'
            });
        }

        res.json({
            api_key_info: result.rows[0] // ❌ CRITICAL: Exposing plaintext API key
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve API key info',
            message: error.message,
            stack: error.stack
        });
    }
}

// ============================================================================
// VULNERABILITY SUMMARY
// ============================================================================
/*
CRITICAL VULNERABILITIES (10):
1. SQL injection in all database queries
2. API keys stored in plaintext
3. No timing-safe comparison for API key validation
4. Exposing stack traces in error responses
5. No HMAC signature on webhooks
6. No authorization check in refund endpoint (any merchant can refund any transaction)
7. No balance validation before charges
8. No balance validation before refunds
9. Exposing full API key in getKeyInfo endpoint
10. SSRF vulnerability in webhook test endpoint

HIGH VULNERABILITIES (15):
11. No rate limiting on API endpoints
12. No input validation (negative amounts, huge amounts accepted)
13. No pagination limits (can request millions of records)
14. No timeout on webhook HTTP requests
15. No retry logic for webhooks
16. Detailed error messages expose database structure
17. No authentication on webhook test endpoint
18. No verification that customer exists before charging
19. No verification that merchant has funds before refund
20. No audit logging
21. No IP whitelisting
22. No API versioning strategy
23. No request signing
24. No webhook signature verification
25. No circuit breakers

MEDIUM VULNERABILITIES (10):
26. No customer consent verification for charges
27. No 3D Secure support
28. No fraud detection
29. No velocity checks
30. No geolocation validation
31. No device fingerprinting
32. No dispute/chargeback handling
33. No partial refund support
34. No subscription cancellation endpoint
35. Missing indexes on foreign keys

Total: 35+ intentional vulnerabilities
*/

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    authenticateMerchant,
    createCharge,
    createRefund,
    getTransactions,
    createRecurring,
    testWebhook,
    getCustomer,
    getKeyInfo
};
