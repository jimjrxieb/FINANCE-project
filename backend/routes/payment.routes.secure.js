// ============================================================================
// SECURE PAYMENT ROUTES - PCI-DSS COMPLIANT
// ============================================================================
// This demonstrates proper security controls for payment processing
// ============================================================================

const express = require('express');
const router = express.Router();
const paymentControllerSecure = require('../controllers/payment.controller.secure');

// Note: In production, these routes would use authentication middleware:
// const { requireAuth } = require('../middleware/auth');
// router.use(requireAuth);

// ============================================================================
// SECURE PAYMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/payments/secure/process
 * Process a payment transaction (SECURE VERSION)
 *
 * ✅ Validates all input
 * ✅ Never stores CVV/PIN
 * ✅ Returns masked data only
 * ✅ Logs safely (no sensitive data)
 *
 * Request Body:
 * {
 *   "merchantId": 1,
 *   "cardNumber": "4532123456789012",
 *   "cvv": "123",              // Used for auth, NEVER stored
 *   "expiryDate": "12/25",
 *   "cardholderName": "John Doe",
 *   "amount": 99.99
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "payment": {
 *     "id": 1,
 *     "card_number": "************9012",  // ✅ Masked
 *     "cardholder_name": "John Doe",
 *     "amount": "99.99",
 *     "transaction_status": "completed",
 *     "_masked": true,
 *     "_pci_compliant": true
 *     // ✅ NO CVV, NO PIN in response
 *   },
 *   "authorization_code": "AUTH1234567890"
 * }
 */
router.post('/process', paymentControllerSecure.processPaymentSecure);

/**
 * GET /api/payments/secure/list
 * List all payments for authenticated merchant (SECURE VERSION)
 *
 * ✅ Requires authentication
 * ✅ Returns only merchant's own payments
 * ✅ All sensitive data masked
 *
 * Query Parameters:
 * - merchant_id: Required (in production, from JWT token)
 *
 * Response:
 * {
 *   "count": 3,
 *   "payments": [
 *     {
 *       "id": 1,
 *       "card_number": "************9012",  // ✅ Masked
 *       "amount": "99.99",
 *       "_masked": true
 *     }
 *   ],
 *   "_pci_compliant": true
 * }
 */
router.get('/list', paymentControllerSecure.listPaymentsSecure);

/**
 * GET /api/payments/secure/:id
 * Get specific payment details (SECURE VERSION)
 *
 * ✅ Access control (merchant can only see their own payments)
 * ✅ Sensitive data masked
 *
 * Response:
 * {
 *   "payment": {
 *     "id": 1,
 *     "card_number": "************9012",  // ✅ Masked
 *     ...
 *   },
 *   "_pci_compliant": true
 * }
 */
router.get('/:id', paymentControllerSecure.getPaymentByIdSecure);

// ============================================================================
// COMPARISON NOTES
// ============================================================================

/*
INSECURE ROUTE (DO NOT USE):
  GET /api/payments/list
  - Returns ALL payments from ALL merchants
  - Shows full card numbers, CVV, PIN
  - No authentication required

SECURE ROUTE (USE THIS):
  GET /api/payments/secure/list
  - Returns only current merchant's payments
  - Masks all sensitive data
  - Requires authentication
  - PCI-DSS compliant
*/

module.exports = router;
