// ============================================================================
// SQL INJECTION FIXES APPLIED - PHASE 2
// ============================================================================
// Date: 2025-10-15 12:55:00
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
// CARD MANAGEMENT CONTROLLER - INTENTIONALLY VULNERABLE
// ============================================================================
// This controller contains INTENTIONAL security vulnerabilities for testing
// and training purposes. DO NOT use in production.
//
// VULNERABILITIES:
// - SQL Injection (direct query concatenation)
// - Stores full PAN (PCI-DSS 3.2.1 violation)
// - Stores CVV (PCI-DSS 3.2.2 CRITICAL violation)
// - Stores PIN (PCI-DSS 3.2.3 CRITICAL violation)
// - No input validation
// - No rate limiting
// - Returns sensitive data in responses
// ============================================================================

const db = require('../config/database');

/**
 * ❌ CRITICAL VULNERABILITY: SQL Injection
 * Add card to user's account (stores full PAN, CVV, PIN)
 *
 * PCI-DSS Violations:
 * - Stores full card number (3.2.1)
 * - Stores CVV (3.2.2 - FORBIDDEN)
 * - Stores PIN (3.2.3 - FORBIDDEN)
 *
 * POST /api/cards/add
 * Body: { user_id, card_number, cvv, pin, exp_month, exp_year, cardholder_name }
 */
async function addCard(req, res) {
    try {
        const {
            user_id,
            account_id,
            card_number,
            cvv,
            pin,
            exp_month,
            exp_year,
            cardholder_name,
            card_type,
            card_brand,
            billing_address,
            billing_zip
        } = req.body;

        // ❌ SQL INJECTION: Direct string concatenation
        // Attacker can inject: user_id=1 OR 1=1--
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            INSERT INTO cards (
                user_id, account_id, card_number, cvv, pin,
                exp_month, exp_year, cardholder_name, card_type,
                card_brand, billing_address, billing_zip
            ) VALUES (
                $1, $2,
                '$3', '$4', '$5',
                $6, $7, '$8',
                '$9', '$10',
                '$11', '$12'
            ) RETURNING *
        `;
        const values = [user_id, account_id || 'NULL', card_number, cvv, pin, exp_month, exp_year, cardholder_name, card_type || 'unknown', card_brand || 'unknown', billing_address || '', billing_zip || ''];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query); // ❌ Logs sensitive data

        const result = await db.query(query);
        const card = result.rows[0];

        // ❌ Returns full card data including CVV and PIN
        res.status(201).json({
            message: 'Card added successfully',
            card: card,
            warning: '⚠️ SECURITY VIOLATION: Full card data stored and returned'
        });

    } catch (error) {
        console.error('Add card error:', error);
        // ❌ Exposes database errors
        res.status(500).json({
            error: 'Failed to add card',
            details: error.message,
            sql: error.query // ❌ Exposes SQL queries
        });
    }
}

/**
 * ❌ CRITICAL VULNERABILITY: SQL Injection + Full data exposure
 * Get all cards for a user (returns full card data)
 *
 * GET /api/cards/{user_id}
 * Returns: Full card numbers, CVV, PIN
 */
async function getCards(req, res) {
    try {
        const { user_id } = req.params;

        // ❌ SQL INJECTION: Direct parameter interpolation
        // Attacker can inject: user_id=1 UNION SELECT * FROM api_keys--
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            SELECT
                c.*,
                u.username,
                u.email,
                a.account_number,
                a.balance
            FROM cards c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN accounts a ON c.account_id = a.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `;
        const values = [user_id];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        // ❌ Returns full card data including CVV and PIN
        res.json({
            count: result.rows.length,
            cards: result.rows,
            warning: '⚠️ CRITICAL: CVV and PIN exposed in response'
        });

    } catch (error) {
        console.error('Get cards error:', error);
        res.status(500).json({
            error: 'Failed to retrieve cards',
            details: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Get card by card number (SQL Injection vulnerable)
 *
 * GET /api/cards/lookup?card_number={number}
 */
async function getCardByNumber(req, res) {
    try {
        const { card_number } = req.query;

        // ❌ SQL INJECTION
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            SELECT * FROM cards
            WHERE card_number = '$1'
        `;
        const values = [card_number];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        // ❌ Returns full card data
        res.json({
            card: result.rows[0],
            warning: '⚠️ Full card data exposed'
        });

    } catch (error) {
        console.error('Lookup error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Update card (SQL Injection vulnerable)
 *
 * PUT /api/cards/{card_id}
 */
async function updateCard(req, res) {
    try {
        const { card_id } = req.params;
        const updates = req.body;

        // ❌ SQL INJECTION: Dynamic query building
        const setClauses = Object.keys(updates)
            .map(key => `${key} = '${updates[key]}'`)
            .join(', ');

        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            UPDATE cards
            SET $1
            WHERE id = $2
            RETURNING *
        `;
        const values = [setClauses, card_id];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        res.json({
            message: 'Card updated',
            card: result.rows[0]
        });

    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Delete card (SQL Injection vulnerable)
 *
 * DELETE /api/cards/{card_id}
 */
async function deleteCard(req, res) {
    try {
        const { card_id } = req.params;

        // ❌ SQL INJECTION
        // ✅ FIXED: Converted to parameterized query (Phase 2)
        const query = `DELETE FROM cards WHERE id = $1 RETURNING *`;
        const values = [card_id];
        // Original (vulnerable): const query = `DELETE FROM cards WHERE id = ${card_id} RETURNING *`;

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        res.json({
            message: 'Card deleted',
            deleted_card: result.rows[0]
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ CRITICAL: Charge card-on-file
 * Process payment using stored card
 *
 * POST /api/cards/charge
 * Body: { card_id, amount, description }
 */
async function chargeCard(req, res) {
    try {
        const { card_id, amount, description, merchant_id } = req.body;

        // ❌ SQL INJECTION: Get card details
        const cardQuery = `
            SELECT * FROM cards WHERE id = ${card_id}
        `;

        console.log('❌ EXECUTING RAW QUERY:', cardQuery);

        const cardResult = await db.query(cardQuery);

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        // ❌ Mock payment processing (no actual validation)
        // Real vulnerability: No fraud detection, no 3DS, no address verification

        // ❌ SQL INJECTION: Insert transaction
        const transactionQuery = `
            INSERT INTO payments (
                user_id, card_id, account_id, merchant_id,
                transaction_type, amount, total_amount,
                description, transaction_status, card_last_four
            ) VALUES (
                ${card.user_id}, ${card_id}, ${card.account_id || 'NULL'},
                ${merchant_id || 'NULL'}, 'purchase', ${amount}, ${amount},
                '${description || ''}', 'completed',
                '${card.card_number.slice(-4)}'
            ) RETURNING *
        `;

        console.log('❌ EXECUTING RAW QUERY:', transactionQuery);

        const transactionResult = await db.query(transactionQuery);

        // ❌ Update last_used timestamp
        const updateQuery = `
            UPDATE cards
            SET last_used = CURRENT_TIMESTAMP
            WHERE id = ${card_id}
        `;

        await db.query(updateQuery);

        res.json({
            message: 'Charge successful',
            transaction: transactionResult.rows[0],
            charged_card: {
                card_number: card.card_number, // ❌ Returns full number
                cvv: card.cvv, // ❌ CRITICAL
                cardholder: card.cardholder_name
            },
            warning: '⚠️ CRITICAL: Full card data including CVV returned'
        });

    } catch (error) {
        console.error('Charge error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

/**
 * ❌ Get all cards in system (admin endpoint with no auth)
 *
 * GET /api/cards/admin/all
 */
async function getAllCards(req, res) {
    try {
        // ❌ No authentication check
        // ❌ No pagination (can dump entire database)

        const query = `
            SELECT
                c.*,
                u.username,
                u.email,
                u.ssn,
                a.account_number,
                a.balance
            FROM cards c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN accounts a ON c.account_id = a.id
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query);

        // ❌ Returns EVERYTHING including SSN, full cards, CVV, PIN
        res.json({
            count: result.rows.length,
            cards: result.rows,
            warning: '⚠️ MASSIVE DATA BREACH: All customer data exposed'
        });

    } catch (error) {
        console.error('Get all cards error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * ❌ Search cards (SQL Injection via LIKE)
 *
 * GET /api/cards/search?q={query}
 */
async function searchCards(req, res) {
    try {
        const { q } = req.query;

        // ❌ SQL INJECTION via LIKE clause
        // ✅ FIXED: Multi-line parameterized query (Phase 2)
        const query = `
            SELECT
                c.*,
                u.username,
                u.email
            FROM cards c
            JOIN users u ON c.user_id = u.id
            WHERE
                c.cardholder_name LIKE '%$1%'
                OR c.card_number LIKE '%$1%'
                OR u.username LIKE '%$1%'
                OR u.email LIKE '%$1%'
        `;
        const values = [q, q, q, q];
        // Original vulnerable query commented above

        console.log('❌ EXECUTING RAW QUERY:', query);

        const result = await db.query(query);

        res.json({
            count: result.rows.length,
            results: result.rows
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: error.message,
            sql: error.query
        });
    }
}

module.exports = {
    addCard,
    getCards,
    getCardByNumber,
    updateCard,
    deleteCard,
    chargeCard,
    getAllCards,
    searchCards
};
