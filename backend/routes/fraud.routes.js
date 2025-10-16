// ============================================================================
// FRAUD DETECTION API - PHASE 4 NEOBANK  
// ============================================================================
// Real-time fraud detection and monitoring with intentional vulnerabilities
//
// INTENTIONAL VULNERABILITIES:
// - No authentication on admin endpoints
// - SQL injection in all queries
// - Fraud score calculation is simplistic
// - No automated response to high-risk scores
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ============================================================================
// POST /api/v1/fraud/check-transaction - Calculate Fraud Risk Score
// ============================================================================

router.post('/check-transaction', async (req, res) => {
    try {
        const { user_id, amount, merchant_id } = req.body;

        let risk_score = 0;
        let reasons = [];

        // Get user's transaction history
        // ❌ VULNERABILITY: SQL injection
        const avgQuery = `
            SELECT AVG(amount) as avg_amount, COUNT(*) as tx_count
            FROM merchant_transactions
            WHERE customer_id = ${user_id}
            AND created_at > NOW() - INTERVAL '30 days'
        `;
        const avgResult = await getPool().query(avgQuery);
        const avg_amount = parseFloat(avgResult.rows[0].avg_amount || 0);

        // Rule 1: Amount > user's average by 3x = +30 points
        if (amount > avg_amount * 3 && avg_amount > 0) {
            risk_score += 30;
            reasons.push('Transaction amount 3x higher than average');
        }

        // Rule 2: More than 5 transactions in last hour = +40 points
        const recentQuery = `
            SELECT COUNT(*) as recent_count
            FROM merchant_transactions
            WHERE customer_id = ${user_id}
            AND created_at > NOW() - INTERVAL '1 hour'
        `;
        const recentResult = await getPool().query(recentQuery);
        if (parseInt(recentResult.rows[0].recent_count) > 5) {
            risk_score += 40;
            reasons.push('High transaction velocity (>5 in 1 hour)');
        }

        // Rule 3: Amount > $500 = +20 points
        if (amount > 500) {
            risk_score += 20;
            reasons.push('High transaction amount (>$500)');
        }

        // Rule 4: New merchant (first time) = +10 points
        if (merchant_id) {
            const merchantHistoryQuery = `
                SELECT COUNT(*) as merchant_tx_count
                FROM merchant_transactions
                WHERE customer_id = ${user_id} AND merchant_id = ${merchant_id}
            `;
            const merchantHistory = await getPool().query(merchantHistoryQuery);
            if (parseInt(merchantHistory.rows[0].merchant_tx_count) === 0) {
                risk_score += 10;
                reasons.push('New merchant (first transaction)');
            }
        }

        // Create fraud alert if score > 50
        let alert_created = false;
        if (risk_score > 50) {
            const severity = risk_score > 80 ? 'critical' : (risk_score > 65 ? 'high' : 'medium');
            
            // ❌ VULNERABILITY: SQL injection
            const alertQuery = `
                INSERT INTO fraud_alerts
                (user_id, transaction_type, alert_type, severity, description, risk_score, status, created_at)
                VALUES (${user_id}, 'merchant_charge', 'velocity', '${severity}', '${reasons.join('; ')}', ${risk_score}, 'pending', NOW())
                RETURNING *
            `;
            await getPool().query(alertQuery);
            alert_created = true;
        }

        const approved = risk_score < 70;

        console.log('Fraud check completed:', {
            user_id, amount, risk_score, approved, alert_created
        });

        res.json({
            success: true,
            risk_score: risk_score,
            approved: approved,
            alert_created: alert_created,
            reasons: reasons
        });

    } catch (error) {
        console.error('Fraud check error:', error);
        res.status(500).json({ error: 'Failed to check transaction', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/fraud/alerts - List Fraud Alerts
// ============================================================================

router.get('/alerts', async (req, res) => {
    try {
        const { status, severity } = req.query;

        // ❌ VULNERABILITY: No authentication (anyone can view all alerts)
        // ❌ VULNERABILITY: SQL injection
        let query = `
            SELECT fa.*, m.username, m.email
            FROM fraud_alerts fa
            JOIN merchants m ON fa.user_id = m.id
            WHERE 1=1
        `;

        if (status) {
            query += ` AND fa.status = '${status}'`;
        }

        if (severity) {
            query += ` AND fa.severity = '${severity}'`;
        }

        query += ` ORDER BY fa.created_at DESC LIMIT 100`;

        const result = await getPool().query(query);

        res.json({
            success: true,
            alerts: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('List alerts error:', error);
        res.status(500).json({ error: 'Failed to retrieve alerts', details: error.message });
    }
});

// ============================================================================
// POST /api/v1/fraud/review - Review and Resolve Alert
// ============================================================================

router.post('/review', async (req, res) => {
    try {
        const { alert_id, reviewed_by, status, notes } = req.body;

        // ❌ VULNERABILITY: SQL injection
        const updateQuery = `
            UPDATE fraud_alerts
            SET status = '${status}',
                reviewed_by = ${reviewed_by},
                review_notes = '${notes || ''}',
                reviewed_at = NOW()
            WHERE id = ${alert_id}
            RETURNING *
        `;

        const result = await getPool().query(updateQuery);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const alert = result.rows[0];

        // If confirmed fraud, freeze user's cards
        if (status === 'confirmed_fraud') {
            const freezeQuery = `UPDATE cards SET is_active = false WHERE user_id = ${alert.user_id}`;
            await getPool().query(freezeQuery);

            console.log('Cards frozen due to confirmed fraud:', { user_id: alert.user_id, alert_id });
        }

        res.json({
            success: true,
            message: 'Alert reviewed',
            alert: alert
        });

    } catch (error) {
        console.error('Review alert error:', error);
        res.status(500).json({ error: 'Failed to review alert', details: error.message });
    }
});

// ============================================================================
// GET /api/v1/fraud/user-risk/:user_id - Get User Risk Profile
// ============================================================================

router.get('/user-risk/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Get alert count and severity
        const alertQuery = `
            SELECT COUNT(*) as alert_count, MAX(created_at) as last_alert
            FROM fraud_alerts
            WHERE user_id = ${user_id}
        `;
        const alertResult = await getPool().query(alertQuery);

        // Get avg transaction amount
        const txQuery = `
            SELECT AVG(amount) as avg_amount, COUNT(*) as tx_count
            FROM merchant_transactions
            WHERE customer_id = ${user_id}
        `;
        const txResult = await getPool().query(txQuery);

        // Calculate account age
        const accountQuery = `SELECT created_at FROM merchants WHERE id = ${user_id}`;
        const accountResult = await getPool().query(accountQuery);
        const created_at = new Date(accountResult.rows[0].created_at);
        const account_age_days = Math.floor((new Date() - created_at) / (1000 * 60 * 60 * 24));

        // Determine risk level
        const alert_count = parseInt(alertResult.rows[0].alert_count);
        let risk_level = 'low';
        if (alert_count > 5) risk_level = 'high';
        else if (alert_count > 2) risk_level = 'medium';

        res.json({
            success: true,
            risk_level: risk_level,
            alert_count: alert_count,
            last_alert: alertResult.rows[0].last_alert,
            avg_transaction_amount: parseFloat(txResult.rows[0].avg_amount || 0),
            transaction_count: parseInt(txResult.rows[0].tx_count || 0),
            account_age_days: account_age_days
        });

    } catch (error) {
        console.error('User risk error:', error);
        res.status(500).json({ error: 'Failed to get user risk', details: error.message });
    }
});

// ============================================================================
// POST /api/v1/fraud/block-card - Block Card for Fraud
// ============================================================================

router.post('/block-card', async (req, res) => {
    try {
        const { card_id, reason } = req.body;

        // ❌ VULNERABILITY: No authentication
        // ❌ VULNERABILITY: SQL injection

        // Get card details
        const cardQuery = `SELECT * FROM cards WHERE id = ${card_id}`;
        const cardResult = await getPool().query(cardQuery);

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        // Freeze card
        const freezeQuery = `UPDATE cards SET is_active = false WHERE id = ${card_id}`;
        await getPool().query(freezeQuery);

        // Create fraud alert
        const alertQuery = `
            INSERT INTO fraud_alerts
            (user_id, alert_type, severity, description, status, created_at)
            VALUES (${card.user_id}, 'card_blocked', 'critical', '${reason}', 'confirmed_fraud', NOW())
        `;
        await getPool().query(alertQuery);

        console.log('Card blocked for fraud:', { card_id, user_id: card.user_id, reason });

        res.json({
            success: true,
            message: 'Card blocked successfully',
            card_id: card_id
        });

    } catch (error) {
        console.error('Block card error:', error);
        res.status(500).json({ error: 'Failed to block card', details: error.message });
    }
});

module.exports = router;
