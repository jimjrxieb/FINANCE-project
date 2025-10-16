// ============================================================================
// CARD MANAGEMENT ROUTES - INTENTIONALLY VULNERABLE
// ============================================================================

const express = require('express');
const router = express.Router();
const cardsController = require('../controllers/cards.controller');

// ❌ No authentication required on any route
// ❌ No rate limiting
// ❌ No input validation middleware

// Add new card (stores full PAN, CVV, PIN)
router.post('/add', cardsController.addCard);

// Get user's cards (returns full card data)
router.get('/:user_id', cardsController.getCards);

// Lookup card by number
router.get('/lookup', cardsController.getCardByNumber);

// Update card
router.put('/:card_id', cardsController.updateCard);

// Delete card
router.delete('/:card_id', cardsController.deleteCard);

// Charge card-on-file
router.post('/charge', cardsController.chargeCard);

// Admin: Get all cards (no auth)
router.get('/admin/all', cardsController.getAllCards);

// Search cards
router.get('/search', cardsController.searchCards);

module.exports = router;
