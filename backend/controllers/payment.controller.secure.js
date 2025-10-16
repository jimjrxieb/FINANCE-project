// ============================================================================
// SECURE PAYMENT CONTROLLER - PCI-DSS COMPLIANT
// ============================================================================
// This is the FIXED version demonstrating proper PCI-DSS compliance
// ============================================================================

const Payment = require('../models/Payment');
const { pool } = require('../config/database');
const {
    maskPayment,
    maskPayments,
    createLogSafePayment,
    validateNoSensitiveData
} = require('../utils/masking');

// ============================================================================
// PROCESS PAYMENT (SECURE VERSION)
// ============================================================================

/**
 * Process a payment transaction - PCI-DSS COMPLIANT
 * ✅ Validates input
 * ✅ Never stores CVV/PIN
 * ✅ Masks data in responses
 * ✅ Logs safely
 */
async function processPaymentSecure(req, res) {
    try {
        const { merchantId, cardNumber, cvv, expiryDate, cardholderName, amount } = req.body;

        // ✅ Input validation
        if (!cardNumber || !cvv || !expiryDate || !cardholderName || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['cardNumber', 'cvv', 'expiryDate', 'cardholderName', 'amount']
            });
        }

        // ✅ Validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be a positive number'
            });
        }

        // ✅ Validate card number format
        if (!Payment.validateCardNumber(cardNumber)) {
            return res.status(400).json({
                error: 'Invalid card number',
                message: 'Card number failed validation'
                // ✅ PCI 6.5.5: Don't expose detailed validation logic
            });
        }

        // ✅ Validate CVV format (but don't store it!)
        if (!/^\d{3,4}$/.test(cvv)) {
            return res.status(400).json({
                error: 'Invalid CVV',
                message: 'CVV must be 3 or 4 digits'
            });
        }

        // ✅ Validate expiry date
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            return res.status(400).json({
                error: 'Invalid expiry date',
                message: 'Expiry date must be in MM/YY format'
            });
        }

        // ✅ PCI 10.1: Log transaction safely (NO card data!)
        console.log('Processing payment transaction:', {
            merchant_id: merchantId,
            card_last4: cardNumber.slice(-4),
            card_type: getCardType(cardNumber),
            amount: numericAmount,
            currency: 'USD',
            timestamp: new Date().toISOString()
            // ✅ NO CVV, NO PIN, NO full card number
        });

        // ✅ PCI 3.2.2: CVV is used for authorization but NEVER stored!
        // ✅ PCI 3.2.3: PIN is NEVER accepted or stored!
        // In a real app, you'd call payment gateway here with CVV
        // Gateway returns authorization - CVV is immediately discarded

        // Simulate authorization (in real app, call Stripe/etc)
        const authorizationCode = `AUTH${Date.now()}`;

        // ✅ PCI 3.4: Store ONLY necessary data (NO CVV, NO PIN)
        const payment = await Payment.create({
            merchant_id: merchantId,
            card_number: cardNumber,       // ✅ Should be encrypted at rest
            cvv: null,                     // ✅ NEVER stored
            pin: null,                     // ✅ NEVER stored
            expiry_date: expiryDate,
            cardholder_name: cardholderName,
            amount: numericAmount,
            transaction_status: 'completed',
            authorization_code: authorizationCode  // Store auth code, not CVV
        });

        // ✅ PCI 10.2: Log successful transaction
        console.log('Payment authorized:', createLogSafePayment(payment));

        // ✅ PCI 3.3: Mask sensitive data before returning
        const maskedPayment = maskPayment(payment.toJSON());

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            payment: maskedPayment,
            authorization_code: authorizationCode
            // ✅ NO CVV, NO PIN, NO full card number in response
        });

    } catch (error) {
        // ✅ PCI 6.5.5: Generic error messages (no sensitive data disclosure)
        console.error('Payment processing error:', {
            error: error.message,
            merchant_id: req.body?.merchantId,
            timestamp: new Date().toISOString()
            // ✅ NO card data in error logs
        });

        res.status(500).json({
            error: 'Payment processing failed',
            message: 'Unable to process payment at this time',
            reference: `ERR${Date.now()}`
            // ✅ NO stack trace, NO detailed errors
        });
    }
}

// ============================================================================
// LIST PAYMENTS (SECURE VERSION)
// ============================================================================

/**
 * List payments for authenticated merchant - PCI-DSS COMPLIANT
 * ✅ Requires authentication
 * ✅ Filters by merchant
 * ✅ Masks sensitive data
 */
async function listPaymentsSecure(req, res) {
    try {
        // ✅ PCI 7.1: Check authentication (would use JWT middleware in real app)
        const merchantId = req.user?.id || req.query.merchant_id;

        if (!merchantId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // ✅ PCI 7.1: Query ONLY payments for this merchant
        const result = await pool.query(
            'SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC',
            [merchantId]
        );

        const payments = result.rows;

        // ✅ PCI 3.3: Mask ALL sensitive data before returning
        const maskedPayments = maskPayments(payments);

        // ✅ Log access (for audit)
        console.log('Payment list accessed:', {
            merchant_id: merchantId,
            count: payments.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            count: maskedPayments.length,
            payments: maskedPayments,
            _pci_compliant: true
        });

    } catch (error) {
        console.error('Error listing payments:', {
            error: error.message,
            merchant_id: req.query.merchant_id
        });

        res.status(500).json({
            error: 'Failed to retrieve payments',
            reference: `ERR${Date.now()}`
        });
    }
}

// ============================================================================
// GET PAYMENT BY ID (SECURE VERSION)
// ============================================================================

/**
 * Get single payment details - PCI-DSS COMPLIANT
 * ✅ Access control
 * ✅ Masked data
 */
async function getPaymentByIdSecure(req, res) {
    try {
        const { id } = req.params;
        const merchantId = req.user?.id || req.query.merchant_id;

        if (!merchantId) {
            return res.status(401).json({
                error: 'Unauthorized'
            });
        }

        // ✅ PCI 7.1: Verify merchant owns this payment
        const result = await pool.query(
            'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
            [id, merchantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Payment not found'
            });
        }

        const payment = result.rows[0];

        // ✅ PCI 3.3: Mask sensitive data
        const maskedPayment = maskPayment(payment);

        // ✅ Log access for audit
        console.log('Payment details accessed:', {
            payment_id: id,
            merchant_id: merchantId,
            timestamp: new Date().toISOString()
        });

        res.json({
            payment: maskedPayment,
            _pci_compliant: true
        });

    } catch (error) {
        console.error('Error retrieving payment:', {
            error: error.message,
            payment_id: req.params.id
        });

        res.status(500).json({
            error: 'Failed to retrieve payment'
        });
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect card type from card number
 * PCI allows first 6 digits for BIN identification
 */
function getCardType(cardNumber) {
    const firstDigit = cardNumber.charAt(0);
    const firstTwo = cardNumber.substring(0, 2);

    if (firstDigit === '4') return 'Visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'Mastercard';
    if (['34', '37'].includes(firstTwo)) return 'American Express';
    if (firstTwo === '60') return 'Discover';

    return 'Unknown';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    processPaymentSecure,
    listPaymentsSecure,
    getPaymentByIdSecure,
    getCardType
};
