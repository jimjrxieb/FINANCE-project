// ============================================================================
// PAYMENT CONTROLLER - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - SQL injection (PCI 6.5.1)
// - Storing CVV/PIN (PCI 3.2.2, 3.2.3)
// - No input validation (PCI 6.5.1)
// - Logging card data (PCI 10.1)
// - No access control (PCI 7.1)
// ============================================================================

const Payment = require('../models/Payment');
const { pool, executeRawQuery } = require('../config/database');

// ============================================================================
// PROCESS PAYMENT (CRITICAL VIOLATIONS)
// ============================================================================

/**
 * Process a payment transaction
 * ❌ Contains multiple CRITICAL PCI-DSS violations
 */
async function processPayment(req, res) {
    try {
        const { merchantId, cardNumber, cvv, pin, expiryDate, cardholderName, amount } = req.body;

        // ❌ PCI 6.5.1: No input validation
        // ❌ Should validate: amount > 0, card format, expiry date, etc.

        // ❌ PCI 10.1: CRITICAL - Logging full card data including CVV and PIN!
        console.log('Processing payment:', {
            card: cardNumber,
            cvv: cvv,
            pin: pin,
            amount: amount,
            merchant: merchantId
        });

        // ❌ PCI 6.5.1: No card number format validation
        // ❌ PCI 3.3: Displaying full card number (should only show last 4)

        // Validate card using Luhn algorithm (but still log it)
        if (!Payment.validateCardNumber(cardNumber)) {
            return res.status(400).json({
                error: 'Invalid card number',
                // ❌ PCI 6.5.5: Detailed error disclosure
                details: `Card ${cardNumber} failed Luhn validation`
            });
        }

        // ❌ CRITICAL VIOLATION: Storing CVV and PIN in database!
        // ❌ PCI 3.2.2: CVV storage is STRICTLY FORBIDDEN after authorization
        // ❌ PCI 3.2.3: PIN storage is STRICTLY FORBIDDEN
        // ❌ PCI 3.4: No encryption at rest

        const payment = await Payment.create({
            merchant_id: merchantId,
            card_number: cardNumber,  // ❌ Storing full PAN
            cvv: cvv,                 // ❌ FORBIDDEN!
            pin: pin,                 // ❌ FORBIDDEN!
            expiry_date: expiryDate,
            cardholder_name: cardholderName,
            amount: amount
        });

        // ❌ PCI 10.2: Not logging transaction approval/decline

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            payment: payment.toJSON(),  // ❌ Returns CVV and PIN in response!
            // ❌ PCI 6.5.5: Information disclosure
            debug: {
                cardValidation: 'Luhn check passed',
                databaseId: payment.id
            }
        });

    } catch (error) {
        // ❌ PCI 6.5.5: Detailed error messages
        console.error('Payment processing error:', {
            error: error.message,
            stack: error.stack,
            requestBody: req.body  // ❌ Logging card data in error!
        });

        res.status(500).json({
            error: 'Payment processing failed',
            details: error.message,
            stack: error.stack  // ❌ Exposing stack trace to client
        });
    }
}

// ============================================================================
// LIST ALL PAYMENTS (NO ACCESS CONTROL)
// ============================================================================

/**
 * List payments - FIXED VERSION
 * ✅ Requires merchant ID
 * ✅ Returns only merchant's own payments
 * ✅ Masks all sensitive data
 */
async function listPayments(req, res) {
    try {
        const { merchantId } = req.query;

        // ✅ FIXED: Require merchant authentication
        if (!merchantId) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Merchant ID is required'
            });
        }

        // ✅ FIXED: Only get payments for THIS merchant
        const payments = await Payment.findByMerchant(merchantId);

        // ✅ FIXED: Mask sensitive data before returning
        const maskedPayments = payments.map(payment => {
            const data = payment.toJSON();
            return {
                ...data,
                card_number: maskCardNumber(data.card_number),
                cvv: undefined,  // ✅ Never return CVV
                pin: undefined,  // ✅ Never return PIN
                _masked: true
            };
        });

        res.json({
            count: maskedPayments.length,
            payments: maskedPayments,
            _secure: true
        });

    } catch (error) {
        console.error('List payments error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ✅ Helper function to mask card numbers
function maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return '****';
    const last4 = cardNumber.slice(-4);
    return '*'.repeat(cardNumber.length - 4) + last4;
}

// ============================================================================
// GET PAYMENT BY ID (NO ACCESS CONTROL)
// ============================================================================

/**
 * Get a specific payment by ID
 * ❌ PCI 7.1: No access control - anyone can view any payment
 */
async function getPaymentById(req, res) {
    try {
        const { id } = req.params;

        // ❌ PCI 7.1: Not checking if requester owns this payment
        const payment = await Payment.findById(id);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // ❌ Returns full card data including CVV and PIN
        res.json(payment.toJSON());

    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// GET MERCHANT PAYMENTS (SQL INJECTION VULNERABLE)
// ============================================================================

/**
 * Get all payments for a specific merchant
 * ❌ PCI 6.5.1: CRITICAL SQL INJECTION VULNERABILITY
 */
async function getMerchantPayments(req, res) {
    try {
        const { merchantId } = req.params;

        // ❌ PCI 6.5.1: CRITICAL - Direct SQL injection!
        // No input sanitization, allows SQL injection attacks
        const query = `SELECT * FROM payments WHERE merchant_id = '${merchantId}' ORDER BY created_at DESC`;

        console.log('⚠️  Executing SQL injection vulnerable query:', query);

        // ❌ Executing raw, unparameterized query
        const payments = await executeRawQuery(query);

        // ❌ Returns full card data
        res.json({
            merchantId: merchantId,
            count: payments.length,
            payments: payments
        });

    } catch (error) {
        // ❌ PCI 6.5.5: Exposing database errors
        console.error('Database error:', error);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message,
            // ❌ Exposing query in error response
            query: `SELECT * FROM payments WHERE merchant_id = '${req.params.merchantId}'`
        });
    }
}

// ============================================================================
// SEARCH PAYMENTS (HIGHLY VULNERABLE)
// ============================================================================

/**
 * Search payments by cardholder name or card number
 * ❌ PCI 6.5.1: CRITICAL SQL INJECTION
 * ❌ PCI 7.1: No access control
 */
async function searchPayments(req, res) {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // ❌ PCI 6.5.1: CRITICAL SQL INJECTION - Direct string concatenation!
        const sqlQuery = `
            SELECT * FROM payments
            WHERE cardholder_name LIKE '%${query}%'
            OR card_number LIKE '%${query}%'
            ORDER BY created_at DESC
        `;

        console.log('⚠️  SQL INJECTION VULNERABLE SEARCH:', sqlQuery);

        const results = await executeRawQuery(sqlQuery);

        res.json({
            query: query,
            count: results.length,
            // ❌ Returns full card data including CVV/PIN
            results: results
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: error.message,
            // ❌ Exposing query details
            attemptedQuery: req.query.query
        });
    }
}

// ============================================================================
// EXPORT PAYMENTS (CSV WITH FULL CARD DATA)
// ============================================================================

/**
 * Export payments to CSV
 * ❌ PCI 3.2: Exports full card data including CVV/PIN
 */
async function exportPayments(req, res) {
    try {
        const { merchantId } = req.query;

        let payments;
        if (merchantId) {
            // ❌ SQL Injection vulnerable
            const query = `SELECT * FROM payments WHERE merchant_id = '${merchantId}'`;
            payments = await executeRawQuery(query);
        } else {
            // ❌ No access control - exports all payments
            payments = await Payment.findAll();
        }

        // ❌ PCI 3.2.1, 3.2.2, 3.2.3: Exporting full PAN, CVV, and PIN!
        const csv = [
            'ID,Merchant ID,Card Number,CVV,PIN,Expiry,Cardholder,Amount,Status,Date',
            ...payments.map(p =>
                `${p.id},${p.merchant_id},${p.card_number},${p.cvv},${p.pin},${p.expiry_date},${p.cardholder_name},${p.amount},${p.transaction_status},${p.created_at}`
            )
        ].join('\n');

        // ❌ PCI 10.1: Logging export action with data
        console.log('Exporting payments CSV with full card data:', payments.length, 'records');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
        res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// REFUND PAYMENT (NO VERIFICATION)
// ============================================================================

/**
 * Refund a payment
 * ❌ PCI 7.1: No access control
 * ❌ PCI 10.2: No audit logging
 */
async function refundPayment(req, res) {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        // ❌ PCI 7.1: Not checking if requester is authorized
        // ❌ PCI 10.2: Not logging refund action

        const payment = await Payment.findById(id);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // ❌ No validation that refund amount <= original amount
        // ❌ No check if already refunded

        const updateQuery = `
            UPDATE payments
            SET transaction_status = 'refunded', amount = ${amount || 0}
            WHERE id = ${id}
            RETURNING *
        `;

        const result = await executeRawQuery(updateQuery);

        res.json({
            success: true,
            message: 'Payment refunded',
            payment: result[0]
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// VALIDATE CARD ENDPOINT (EXPOSES VALIDATION LOGIC)
// ============================================================================

/**
 * Validate card number using Luhn algorithm
 * ❌ PCI 6.3.1: Exposing validation logic
 * ❌ PCI 10.1: Logging card numbers
 */
async function validateCard(req, res) {
    try {
        const { cardNumber } = req.body;

        // ❌ No authentication required
        const isValid = Payment.validateCardNumber(cardNumber);

        // ❌ Logging card validation attempts with full PAN
        console.log('Card validation request:', {
            card: cardNumber,
            valid: isValid
        });

        res.json({
            cardNumber: cardNumber,  // ❌ Echoing back full PAN
            isValid: isValid,
            // ❌ Exposing validation algorithm details
            algorithm: 'Luhn',
            maskedCard: Payment.maskCardNumber(cardNumber)
        });

    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    processPayment,
    listPayments,
    getPaymentById,
    getMerchantPayments,
    searchPayments,
    exportPayments,
    refundPayment,
    validateCard
};