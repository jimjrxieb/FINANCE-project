// ============================================================================
// MERCHANT ROUTES - INTENTIONALLY INSECURE
// ============================================================================

const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchant.controller');

// ❌ PCI 7.1: No authentication on any route
// ❌ PCI 7.2: No role-based access control

// List all merchants
router.get('/', merchantController.listMerchants);

// Search merchants
router.get('/search', merchantController.searchMerchants);

// Get merchant by ID
router.get('/:id', merchantController.getMerchantById);

// Get merchant transactions (SQL injection vulnerable)
router.get('/:id/transactions', merchantController.getMerchantTransactions);

// Get merchant statistics
router.get('/:id/stats', merchantController.getMerchantStats);

// Update merchant (no authorization)
router.put('/:id', merchantController.updateMerchant);

// Delete merchant (no authorization)
router.delete('/:id', merchantController.deleteMerchant);

module.exports = router;