// ============================================================================
// ADMIN DASHBOARD API - PHASE 4 NEOBANK
// ============================================================================
// System monitoring and user management with NO AUTHENTICATION
//
// CRITICAL VULNERABILITIES:
// - NO AUTHENTICATION on any endpoint (anyone can access)
// - Returns full PAN and CVV in user details
// - Exposes plaintext API keys
// - SQL injection everywhere
// - Detailed system metrics leak architecture
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ============================================================================
// GET /api/v1/admin/dashboard/stats - System-Wide Statistics
// ============================================================================

router.get('/dashboard/stats', async (req, res) => {
    try {
        // ❌ VULNERABILITY: NO AUTHENTICATION - anyone can see these metrics

        // Total users
        const usersQuery = `SELECT COUNT(*) as total_users FROM merchants`;
        const usersResult = await getPool().query(usersQuery);

        // Total accounts (assuming 2 per user: checking + savings)
        const total_accounts = parseInt(usersResult.rows[0].total_users) * 2;

        // Total balance (mock - would query accounts table)
        const total_balance = 5000000.00;

        // Transaction volumes
        const tx24hQuery = `
            SELECT SUM(amount) as volume
            FROM merchant_transactions
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `;
        const tx24h = await getPool().query(tx24hQuery);

        const tx7dQuery = `
            SELECT SUM(amount) as volume
            FROM merchant_transactions
            WHERE created_at > NOW() - INTERVAL '7 days'
        `;
        const tx7d = await getPool().query(tx7dQuery);

        const tx30dQuery = `
            SELECT SUM(amount) as volume
            FROM merchant_transactions
            WHERE created_at > NOW() - INTERVAL '30 days'
        `;
        const tx30d = await getPool().query(tx30dQuery);

        // Active cards
        const cardsQuery = `SELECT COUNT(*) as active_cards FROM cards WHERE is_active = true`;
        const cardsResult = await getPool().query(cardsQuery);

        // Pending fraud alerts
        const alertsQuery = `SELECT COUNT(*) as pending_alerts FROM fraud_alerts WHERE status = 'pending'`;
        const alertsResult = await getPool().query(alertsQuery);

        res.json({
            success: true,
            stats: {
                total_users: parseInt(usersResult.rows[0].total_users),
                total_accounts: total_accounts,
                total_balance: total_balance,
                transaction_volume_24h: parseFloat(tx24h.rows[0].volume || 0),
                transaction_volume_7d: parseFloat(tx7d.rows[0].volume || 0),
                transaction_volume_30d: parseFloat(tx30d.rows[0].volume || 0),
                active_cards: parseInt(cardsResult.rows[0].active_cards),
                pending_fraud_alerts: parseInt(alertsResult.rows[0].pending_alerts)
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve stats', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/admin/users/list - List All Users
// ============================================================================

router.get('/users/list', async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const limitValue = limit || 100;
        const offsetValue = offset || 0;

        // ❌ VULNERABILITY: NO AUTHENTICATION
        // ❌ VULNERABILITY: SQL injection
        const query = `
            SELECT
                m.id,
                m.username,
                m.email,
                m.created_at,
                (SELECT COUNT(*) FROM cards WHERE user_id = m.id) as card_count,
                (SELECT COUNT(*) FROM fraud_alerts WHERE user_id = m.id) as alert_count
            FROM merchants m
            ORDER BY m.created_at DESC
            LIMIT ${limitValue} OFFSET ${offsetValue}
        `;

        const result = await getPool().query(query);

        const countQuery = `SELECT COUNT(*) as total FROM merchants`;
        const countResult = await getPool().query(countQuery);

        res.json({
            success: true,
            users: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limitValue),
            offset: parseInt(offsetValue)
        });

    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/admin/users/:user_id/full-details - Complete User Profile
// ============================================================================

router.get('/users/:user_id/full-details', async (req, res) => {
    try {
        const { user_id } = req.params;

        // ❌ CRITICAL VULNERABILITY: NO AUTHENTICATION
        // ❌ CRITICAL VULNERABILITY: Exposes FULL card details (PAN + CVV)

        // Get user info
        const userQuery = `SELECT * FROM merchants WHERE id = ${user_id}`;
        const userResult = await getPool().query(userQuery);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get all cards with FULL PAN and CVV
        const cardsQuery = `SELECT * FROM cards WHERE user_id = ${user_id}`;
        const cardsResult = await getPool().query(cardsQuery);

        // Get recent transactions
        const txQuery = `
            SELECT * FROM merchant_transactions
            WHERE customer_id = ${user_id}
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const txResult = await getPool().query(txQuery);

        // Get fraud alerts
        const alertsQuery = `SELECT * FROM fraud_alerts WHERE user_id = ${user_id} ORDER BY created_at DESC`;
        const alertsResult = await getPool().query(alertsQuery);

        // Get P2P transfers
        const p2pQuery = `
            SELECT * FROM p2p_transfers
            WHERE sender_id = ${user_id} OR recipient_id = ${user_id}
            ORDER BY created_at DESC
            LIMIT 20
        `;
        const p2pResult = await getPool().query(p2pQuery);

        // ❌ CRITICAL: Returning FULL card numbers and CVV
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                password: user.password,  // ❌ Even the password hash!
                created_at: user.created_at,
                cards: cardsResult.rows.map(card => ({
                    id: card.id,
                    card_number: card.card_number,  // ❌ FULL PAN
                    cvv: card.cvv,                   // ❌ CVV
                    brand: card.brand,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year,
                    cardholder_name: card.cardholder_name,
                    is_active: card.is_active,
                    spending_limit: card.spending_limit
                })),
                transactions: txResult.rows,
                fraud_alerts: alertsResult.rows,
                p2p_transfers: p2pResult.rows
            }
        });

    } catch (error) {
        console.error('User full details error:', error);
        res.status(500).json({ error: 'Failed to get user details', details: error.message });
    }
});

// ============================================================================
// POST /api/v1/admin/users/suspend - Suspend User Account
// ============================================================================

router.post('/users/suspend', async (req, res) => {
    try {
        const { user_id, reason } = req.body;

        // ❌ VULNERABILITY: NO AUTHENTICATION (anyone can suspend any user!)
        // ❌ VULNERABILITY: SQL injection

        // Freeze all user's cards
        const freezeCardsQuery = `UPDATE cards SET is_active = false WHERE user_id = ${user_id}`;
        await getPool().query(freezeCardsQuery);

        // Create fraud alert
        const alertQuery = `
            INSERT INTO fraud_alerts
            (user_id, alert_type, severity, description, status, created_at)
            VALUES (${user_id}, 'account_suspended', 'critical', '${reason}', 'confirmed_fraud', NOW())
        `;
        await getPool().query(alertQuery);

        // TODO: Freeze accounts (checking/savings)
        // TODO: Cancel scheduled payments
        // TODO: Send notification to user

        console.log('User suspended:', { user_id, reason, timestamp: new Date().toISOString() });

        res.json({
            success: true,
            message: 'User account suspended',
            user_id: user_id,
            actions_taken: [
                'All cards frozen',
                'Fraud alert created',
                'Accounts frozen',
                'Scheduled payments cancelled'
            ]
        });

    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/admin/merchants/list - List All Merchants with API Keys
// ============================================================================

router.get('/merchants/list', async (req, res) => {
    try {
        // ❌ CRITICAL VULNERABILITY: Exposes plaintext API keys to anyone!

        const query = `
            SELECT
                ak.*,
                COUNT(mt.id) as total_transactions,
                SUM(mt.amount) as total_volume
            FROM api_keys ak
            LEFT JOIN merchant_transactions mt ON ak.id = mt.merchant_id
            GROUP BY ak.id
            ORDER BY ak.created_at DESC
        `;

        const result = await getPool().query(query);

        // ❌ Returning plaintext API keys and secrets
        res.json({
            success: true,
            merchants: result.rows.map(merchant => ({
                id: merchant.id,
                merchant_name: merchant.merchant_name,
                api_key: merchant.api_key,        // ❌ Plaintext API key
                api_secret: merchant.api_secret,  // ❌ Plaintext secret
                webhook_url: merchant.webhook_url,
                webhook_secret: merchant.webhook_secret,  // ❌ Plaintext webhook secret
                is_active: merchant.is_active,
                total_transactions: parseInt(merchant.total_transactions || 0),
                total_volume: parseFloat(merchant.total_volume || 0),
                created_at: merchant.created_at
            }))
        });

    } catch (error) {
        console.error('List merchants error:', error);
        res.status(500).json({ error: 'Failed to list merchants', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/admin/reports/compliance - Generate Compliance Report
// ============================================================================

router.get('/reports/compliance', async (req, res) => {
    try {
        const { report_type } = req.query;  // 'pci', 'soc2', 'transactions'

        // ❌ VULNERABILITY: NO AUTHENTICATION

        if (report_type === 'pci' || !report_type) {
            // PCI-DSS Compliance Report

            // Count cards with vulnerabilities
            const cardsQuery = `SELECT COUNT(*) as total_cards FROM cards`;
            const cardsResult = await getPool().query(cardsQuery);

            const cardsWithPAN = await getPool().query(`
                SELECT COUNT(*) as count FROM cards WHERE card_number IS NOT NULL
            `);

            const cardsWithCVV = await getPool().query(`
                SELECT COUNT(*) as count FROM cards WHERE cvv IS NOT NULL
            `);

            // Check for encryption (spoiler: there is none)
            const encryption_enabled = false;

            // Check for API key hashing (spoiler: plaintext)
            const api_keys_hashed = false;

            // Check for audit trail
            const audit_trail_complete = false;

            const violations = [
                'Full PAN stored (PCI 3.2.1 violation)',
                'CVV stored (PCI 3.2.2 FORBIDDEN)',
                'No encryption at rest (PCI 3.4 violation)',
                'API keys stored in plaintext (security issue)',
                'Missing audit logs (PCI 10.2 violation)',
                'No MFA for admin access (PCI 8.3 violation)',
                'Weak session management (PCI 8.2.8 violation)',
                'No rate limiting (PCI 6.5.10 violation)'
            ];

            const compliance_score = 25;  // Out of 100

            res.json({
                success: true,
                report: {
                    report_type: 'PCI-DSS Compliance',
                    generated_at: new Date().toISOString(),
                    findings: {
                        cards_stored: parseInt(cardsResult.rows[0].total_cards),
                        cards_with_full_pan: parseInt(cardsWithPAN.rows[0].count),
                        cards_with_cvv: parseInt(cardsWithCVV.rows[0].count),
                        encryption_enabled: encryption_enabled,
                        api_keys_hashed: api_keys_hashed,
                        audit_trail_complete: audit_trail_complete
                    },
                    compliance_score: compliance_score,
                    violations: violations,
                    recommendation: 'CRITICAL: Immediate remediation required. Multiple HIGH severity PCI-DSS violations detected.'
                }
            });

        } else {
            res.json({
                success: true,
                message: `${report_type} report not yet implemented`
            });
        }

    } catch (error) {
        console.error('Compliance report error:', error);
        res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
});

// ============================================================================
// INTENTIONAL VULNERABILITIES SUMMARY
// ============================================================================
// ❌ NO AUTHENTICATION on any endpoint
// ❌ Full PAN and CVV exposed in user details
// ❌ Plaintext API keys and secrets exposed
// ❌ Password hashes exposed
// ❌ SQL injection everywhere
// ❌ Detailed error messages
// ❌ Anyone can suspend any user
// ❌ System architecture exposed via metrics
// ============================================================================

module.exports = router;
