// ============================================================================
// P2P TRANSFERS API - PHASE 4 NEOBANK
// ============================================================================
// Peer-to-peer money transfers with intentional vulnerabilities
//
// INTENTIONAL VULNERABILITIES:
// - SQL injection in all queries
// - No daily/monthly transfer limits enforced
// - No authentication checks
// - No balance validation before transfer
// - No pagination (DoS via large result sets)
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ============================================================================
// POST /api/v1/p2p/send - Send Money to Another User
// ============================================================================

router.post('/send', async (req, res) => {
    try {
        const { sender_id, recipient_email, amount, note } = req.body;

        // ❌ VULNERABILITY: No input validation
        // ❌ VULNERABILITY: No authentication check (anyone can send from any account)

        // Look up recipient by email
        // ❌ VULNERABILITY: SQL injection
        const recipientQuery = `SELECT * FROM merchants WHERE email = '${recipient_email}'`;
        const recipientResult = await getPool().query(recipientQuery);

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Recipient not found',
                message: `No user found with email: ${recipient_email}`
            });
        }

        const recipient = recipientResult.rows[0];

        // ❌ VULNERABILITY: No balance check before deducting
        // ❌ VULNERABILITY: No daily limit validation ($5,000/day not enforced)
        // ❌ VULNERABILITY: No per-transaction limit ($2,500 not enforced)

        // Calculate simple fraud risk score
        let risk_score = 0;
        if (amount > 1000) risk_score += 30;
        if (amount > 2000) risk_score += 20;

        // ❌ VULNERABILITY: SQL injection in INSERT
        const transferQuery = `
            INSERT INTO p2p_transfers
            (sender_id, recipient_id, amount, status, note, risk_score, created_at, completed_at)
            VALUES (${sender_id}, ${recipient.id}, ${amount}, 'completed', '${note || ''}', ${risk_score}, NOW(), NOW())
            RETURNING *
        `;

        const result = await getPool().query(transferQuery);
        const transfer = result.rows[0];

        // TODO: Deduct from sender's checking account
        // TODO: Credit recipient's checking account
        // TODO: Send notification to recipient

        // ❌ VULNERABILITY: Logging sensitive transaction details
        console.log('P2P transfer completed:', {
            sender_id: sender_id,
            recipient_id: recipient.id,
            recipient_email: recipient_email,
            amount: amount,
            transfer_id: transfer.id,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            transfer_id: transfer.id,
            status: 'completed',
            recipient: {
                name: recipient.username,
                email: recipient.email
            },
            amount: amount,
            completed_at: transfer.completed_at
        });

    } catch (error) {
        console.error('P2P send error:', error);

        // ❌ VULNERABILITY: Detailed error messages
        res.status(500).json({
            error: 'Failed to send money',
            details: error.message,
            stack: error.stack
        });
    }
});

// ============================================================================
// GET /api/v1/p2p/history/:user_id - Get Transfer History
// ============================================================================

router.get('/history/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // ❌ VULNERABILITY: No authentication (anyone can view any user's transfers)
        // ❌ VULNERABILITY: SQL injection
        // ❌ VULNERABILITY: No pagination (could return millions of records - DoS)
        const query = `
            SELECT
                pt.*,
                sender.username as sender_name,
                sender.email as sender_email,
                recipient.username as recipient_name,
                recipient.email as recipient_email
            FROM p2p_transfers pt
            JOIN merchants sender ON pt.sender_id = sender.id
            JOIN merchants recipient ON pt.recipient_id = recipient.id
            WHERE pt.sender_id = ${user_id} OR pt.recipient_id = ${user_id}
            ORDER BY pt.created_at DESC
        `;

        const result = await getPool().query(query);

        // Calculate totals
        let sent = 0, received = 0;
        result.rows.forEach(transfer => {
            if (transfer.sender_id == user_id) {
                sent += parseFloat(transfer.amount);
            } else {
                received += parseFloat(transfer.amount);
            }
        });

        res.json({
            success: true,
            transfers: result.rows,
            count: result.rows.length,
            totals: {
                sent: sent,
                received: received,
                net: received - sent
            }
        });

    } catch (error) {
        console.error('P2P history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve transfer history',
            details: error.message
        });
    }
});

// ============================================================================
// POST /api/v1/p2p/request - Request Money from Another User
// ============================================================================

router.post('/request', async (req, res) => {
    try {
        const { requester_id, payer_email, amount, note } = req.body;

        // ❌ VULNERABILITY: No authentication check

        // Look up payer
        const payerQuery = `SELECT * FROM merchants WHERE email = '${payer_email}'`;
        const payerResult = await getPool().query(payerQuery);

        if (payerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payer not found' });
        }

        const payer = payerResult.rows[0];

        // Create payment request (we'll use p2p_transfers table with status = 'pending')
        const requestQuery = `
            INSERT INTO p2p_transfers
            (sender_id, recipient_id, amount, status, note, created_at)
            VALUES (${payer.id}, ${requester_id}, ${amount}, 'pending', '${note || 'Payment request'}', NOW())
            RETURNING *
        `;

        const result = await getPool().query(requestQuery);
        const request = result.rows[0];

        console.log('Payment request created:', {
            requester_id: requester_id,
            payer_id: payer.id,
            amount: amount,
            request_id: request.id
        });

        res.json({
            success: true,
            request_id: request.id,
            status: 'pending',
            payer: {
                email: payer.email,
                name: payer.username
            },
            amount: amount
        });

    } catch (error) {
        console.error('Payment request error:', error);
        res.status(500).json({ error: 'Failed to create payment request', details: error.message });
    }
});

// ============================================================================
// POST /api/v1/p2p/approve - Approve Payment Request
// ============================================================================

router.post('/approve', async (req, res) => {
    try {
        const { request_id, payer_id } = req.body;

        // ❌ VULNERABILITY: No verification that payer_id matches the request
        // ❌ VULNERABILITY: SQL injection

        // Get request details
        const requestQuery = `SELECT * FROM p2p_transfers WHERE id = ${request_id}`;
        const requestResult = await getPool().query(requestQuery);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment request not found' });
        }

        const request = requestResult.rows[0];

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Request already processed' });
        }

        // Update request to completed
        const updateQuery = `
            UPDATE p2p_transfers
            SET status = 'completed', completed_at = NOW()
            WHERE id = ${request_id}
            RETURNING *
        `;

        const result = await getPool().query(updateQuery);
        const completedTransfer = result.rows[0];

        // TODO: Process actual money transfer

        console.log('Payment request approved:', {
            request_id: request_id,
            payer_id: payer_id,
            amount: request.amount
        });

        res.json({
            success: true,
            status: 'approved',
            transfer_id: request_id,
            amount: request.amount
        });

    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ error: 'Failed to approve request', details: error.message });
    }
});

module.exports = router;
