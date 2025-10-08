// ============================================================================
// PAYMENT ROUTES - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - No authentication required (PCI 7.1)
// - No rate limiting (PCI 8.2.5)
// - No HTTPS enforcement (PCI 4.1)
// ============================================================================

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// ❌ PCI 7.1: No authentication middleware on any route!
// ❌ PCI 8.2.5: No rate limiting
// ❌ PCI 4.1: No HTTPS enforcement

// Process payment (CRITICAL VIOLATIONS)
// ❌ Anyone can process payments without authentication
router.post('/process', paymentController.processPayment);

// List all payments
// ❌ Returns ALL payments from ALL merchants
router.get('/list', paymentController.listPayments);

// Get specific payment
// ❌ No access control - anyone can view any payment
router.get('/:id', paymentController.getPaymentById);

// Get merchant payments (SQL INJECTION VULNERABLE)
// ❌ Direct SQL injection via merchantId parameter
router.get('/merchant/:merchantId', paymentController.getMerchantPayments);

// Search payments (HIGHLY VULNERABLE)
// ❌ SQL injection via query parameter
router.get('/search/query', paymentController.searchPayments);

// Export payments to CSV
// ❌ Exports full card data including CVV/PIN
router.get('/export/csv', paymentController.exportPayments);

// Refund payment
// ❌ No authorization check
router.post('/:id/refund', paymentController.refundPayment);

// Validate card number
// ❌ No authentication, exposes validation logic
router.post('/validate/card', paymentController.validateCard);

module.exports = router;