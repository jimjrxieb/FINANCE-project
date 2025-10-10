// ============================================================================
// MERCHANT CONTROLLER - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - No RBAC (PCI 7.1)
// - SQL injection (PCI 6.5.1)
// - No access control (PCI 7.2)
// ============================================================================

const Merchant = require('../models/Merchant');
const Payment = require('../models/Payment');
const { executeRawQuery } = require('../config/database');

// ============================================================================
// LIST ALL MERCHANTS (NO ACCESS CONTROL)
// ============================================================================

async function listMerchants(req, res) {
    try {
        // ❌ PCI 7.1: Anyone can list all merchants
        // ❌ No authentication required
        // ❌ Should only allow admins

        const merchants = await Merchant.findAll();

        // ❌ Returns password hashes and API keys for all merchants!
        res.json({
            count: merchants.length,
            merchants: merchants.map(m => m.toJSON())
        });

    } catch (error) {
        console.error('List merchants error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// GET MERCHANT BY ID (NO ACCESS CONTROL)
// ============================================================================

async function getMerchantById(req, res) {
    try {
        const { id } = req.params;

        // ❌ PCI 7.1: No access control
        // ❌ Any merchant can view any other merchant's details

        const merchant = await Merchant.findById(id);

        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // ❌ Returns password hash and API key
        res.json(merchant.toJSON());

    } catch (error) {
        console.error('Get merchant error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// GET MERCHANT TRANSACTIONS (SQL INJECTION + NO RBAC)
// ============================================================================

async function getMerchantTransactions(req, res) {
    try {
        const { id } = req.params;

        // ❌ PCI 7.1: Not verifying that requester is this merchant
        // ❌ Any merchant can view any other merchant's transactions

        // ❌ PCI 6.5.1: SQL INJECTION - Direct string interpolation!
        const query = `
            SELECT * FROM payments
            WHERE merchant_id = '${id}'
            ORDER BY created_at DESC
        `;

        console.log('⚠️  SQL INJECTION VULNERABLE QUERY:', query);

        const transactions = await executeRawQuery(query);

        // ❌ Returns full card data including CVV/PIN
        res.json({
            merchantId: id,
            count: transactions.length,
            transactions: transactions
        });

    } catch (error) {
        // ❌ PCI 6.5.5: Exposing database errors
        console.error('Database error:', error);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message,
            query: `SELECT * FROM payments WHERE merchant_id = '${req.params.id}'`
        });
    }
}

// ============================================================================
// GET MERCHANT STATS (NO ACCESS CONTROL)
// ============================================================================

async function getMerchantStats(req, res) {
    try {
        const { id } = req.params;

        // ❌ PCI 7.1: No authentication or authorization

        // ❌ SQL Injection vulnerable
        const statsQuery = `
            SELECT
                COUNT(*) as total_transactions,
                SUM(amount) as total_revenue,
                AVG(amount) as average_transaction,
                MAX(amount) as largest_transaction
            FROM payments
            WHERE merchant_id = '${id}'
        `;

        const stats = await executeRawQuery(statsQuery);

        // Also get recent transactions with full card data
        const recentQuery = `
            SELECT * FROM payments
            WHERE merchant_id = '${id}'
            ORDER BY created_at DESC
            LIMIT 10
        `;

        const recentTransactions = await executeRawQuery(recentQuery);

        res.json({
            merchantId: id,
            stats: stats[0],
            // ❌ Including full card data in recent transactions
            recentTransactions: recentTransactions
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// UPDATE MERCHANT (NO AUTHORIZATION)
// ============================================================================

async function updateMerchant(req, res) {
    try {
        const { id } = req.params;
        const { email, username } = req.body;

        // ❌ PCI 7.1: Not checking if requester is the merchant being updated
        // ❌ Any merchant can update any other merchant

        // ❌ PCI 6.5.1: SQL injection via email/username
        const query = `
            UPDATE merchants
            SET email = '${email}', username = '${username}'
            WHERE id = ${id}
            RETURNING *
        `;

        console.log('⚠️  SQL INJECTION in UPDATE:', query);

        const result = await executeRawQuery(query);

        // ❌ PCI 10.2: Not logging account modifications

        res.json({
            success: true,
            merchant: result[0]
        });

    } catch (error) {
        console.error('Update merchant error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// DELETE MERCHANT (NO AUTHORIZATION)
// ============================================================================

async function deleteMerchant(req, res) {
    try {
        const { id } = req.params;

        // ❌ PCI 7.1: Anyone can delete any merchant!
        // ❌ No confirmation required
        // ❌ PCI 10.2: Not logging account deletion

        const query = `DELETE FROM merchants WHERE id = ${id} RETURNING *`;
        const result = await executeRawQuery(query);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        res.json({
            success: true,
            message: 'Merchant deleted',
            deletedMerchant: result[0]
        });

    } catch (error) {
        console.error('Delete merchant error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// SEARCH MERCHANTS (SQL INJECTION)
// ============================================================================

async function searchMerchants(req, res) {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // ❌ PCI 6.5.1: SQL INJECTION
        const sqlQuery = `
            SELECT * FROM merchants
            WHERE username LIKE '%${query}%'
            OR email LIKE '%${query}%'
        `;

        console.log('⚠️  SQL INJECTION SEARCH:', sqlQuery);

        const results = await executeRawQuery(sqlQuery);

        // ❌ Returns password hashes and API keys
        res.json({
            query: query,
            count: results.length,
            merchants: results
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    listMerchants,
    getMerchantById,
    getMerchantTransactions,
    getMerchantStats,
    updateMerchant,
    deleteMerchant,
    searchMerchants
};