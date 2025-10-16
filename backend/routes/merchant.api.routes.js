// ============================================================================
// ENHANCED MERCHANT API ROUTES - INTENTIONALLY VULNERABLE
// ============================================================================
// Phase 4: Full merchant payment processing API (Stripe/Square-like)
//
// ❌ VULNERABILITIES:
// - Weak authentication (plaintext API keys)
// - No rate limiting
// - No CORS restrictions
// - SQL injection everywhere
// - No input validation
// - SSRF in webhook test
// ============================================================================

const express = require('express');
const router = express.Router();
const merchantApiController = require('../controllers/merchant.api.controller.enhanced');

// ============================================================================
// PAYMENT PROCESSING ENDPOINTS
// ============================================================================

// POST /api/v1/charge - Charge a customer
router.post('/charge',
    merchantApiController.authenticateMerchant,
    merchantApiController.createCharge
);

// POST /api/v1/refund - Refund a transaction
router.post('/refund',
    merchantApiController.authenticateMerchant,
    merchantApiController.createRefund
);

// GET /api/v1/transactions - List merchant transactions
router.get('/transactions',
    merchantApiController.authenticateMerchant,
    merchantApiController.getTransactions
);

// POST /api/v1/recurring - Create recurring subscription
router.post('/recurring',
    merchantApiController.authenticateMerchant,
    merchantApiController.createRecurring
);

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// GET /api/v1/customers/:customer_id - Get customer details (cross-tenant access)
router.get('/customers/:customer_id',
    merchantApiController.authenticateMerchant,
    merchantApiController.getCustomer
);

// POST /api/v1/webhook/test - Test webhook delivery (SSRF vulnerability)
router.post('/webhook/test',
    merchantApiController.authenticateMerchant,
    merchantApiController.testWebhook
);

// GET /api/v1/keys/info - Get API key info (exposes plaintext secret)
router.get('/keys/info',
    merchantApiController.authenticateMerchant,
    merchantApiController.getKeyInfo
);

module.exports = router;
