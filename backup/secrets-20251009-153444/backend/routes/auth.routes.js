// ============================================================================
// AUTHENTICATION ROUTES - INTENTIONALLY INSECURE
// ============================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// ❌ PCI 8.2.5: No rate limiting on authentication endpoints
// ❌ Allows unlimited login attempts (brute force attacks)

// Register new merchant
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Verify token
router.post('/verify', authController.verifyToken);

// Change password
router.post('/change-password', authController.changePassword);

// Reset password (INSECURE - no verification)
router.post('/reset-password', authController.resetPassword);

// Get API key by username (NO AUTHENTICATION!)
router.get('/api-key/:username', authController.getApiKey);

// Logout (doesn't invalidate token)
router.post('/logout', authController.logout);

module.exports = router;