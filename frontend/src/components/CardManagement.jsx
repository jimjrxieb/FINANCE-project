// ============================================================================
// CARD MANAGEMENT COMPONENT - PHASE 4 NEOBANK
// ============================================================================
// Comprehensive card management with add/freeze/limit controls
//
// ⚠️ INTENTIONALLY INSECURE FOR GP-COPILOT DEMO
// - Displays full card numbers and CVV
// - Stores card data in localStorage
// - No encryption
// - No PCI-DSS compliance
// ============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CardManagement = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  // ❌ VULNERABILITY: User ID hardcoded
  const userId = 1;
  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Add card form state
  const [newCard, setNewCard] = useState({
    card_number: '',
    cvv: '',
    exp_month: '',
    exp_year: '',
    cardholder_name: '',
    card_type: 'external', // external or virtual
    spending_limit: 5000,
    pin: ''
  });

  // Add money form state
  const [addMoneyForm, setAddMoneyForm] = useState({
    card_id: '',
    amount: ''
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      // ❌ VULNERABILITY: No authentication token
      const res = await axios.get(`${API_BASE_URL}/admin/users/${userId}/full-details`);

      if (res.data.success) {
        setCards(res.data.user.cards || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Load cards error:', err);
      setLoading(false);
    }
  };

  // Real-time card brand detection based on first digits
  const detectCardBrand = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (cleaned.match(/^4/)) return 'Visa';
    if (cleaned.match(/^5[1-5]/)) return 'Mastercard';
    if (cleaned.match(/^3[47]/)) return 'American Express';
    if (cleaned.match(/^6(?:011|5)/)) return 'Discover';

    return 'Unknown';
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setNewCard({
        ...newCard,
        card_number: value,
        brand: detectCardBrand(value)
      });
    }
  };

  const handleAddCard = async () => {
    try {
      // ❌ VULNERABILITY: Storing full PAN and CVV (PCI-DSS violation)
      // ❌ VULNERABILITY: No input validation
      // ❌ VULNERABILITY: No card number validation (Luhn algorithm)

      const cardData = {
        user_id: userId,
        card_number: newCard.card_number,
        cvv: newCard.cvv,
        exp_month: parseInt(newCard.exp_month),
        exp_year: parseInt(newCard.exp_year),
        cardholder_name: newCard.cardholder_name,
        brand: detectCardBrand(newCard.card_number),
        card_type: newCard.card_type,
        spending_limit: newCard.spending_limit,
        pin_hash: newCard.pin, // ❌ VULNERABILITY: Storing PIN (even hashed is forbidden!)
        is_active: true
      };

      // Mock API call (would need to create this endpoint)
      console.log('Adding card:', cardData);

      // ❌ VULNERABILITY: Storing sensitive data in localStorage
      localStorage.setItem(`card_${Date.now()}`, JSON.stringify(cardData));

      alert('Card added successfully! (Mock - backend endpoint not implemented)');

      // Reset form
      setNewCard({
        card_number: '',
        cvv: '',
        exp_month: '',
        exp_year: '',
        cardholder_name: '',
        card_type: 'external',
        spending_limit: 5000,
        pin: ''
      });

      setShowAddModal(false);
      loadCards();

    } catch (err) {
      alert('Failed to add card: ' + err.message);
    }
  };

  const handleFreezeCard = async (cardId, currentStatus) => {
    try {
      if (currentStatus) {
        // Freeze card
        await axios.post(`${API_BASE_URL}/fraud/block-card`, {
          card_id: cardId,
          reason: 'User requested freeze'
        });
        alert('Card frozen successfully');
      } else {
        // Unfreeze (mock - no backend endpoint)
        alert('Unfreeze feature not yet implemented');
      }

      loadCards();
    } catch (err) {
      alert('Failed to freeze card: ' + err.message);
    }
  };

  const handleUpdateLimit = async (cardId, newLimit) => {
    try {
      // Mock - no backend endpoint yet
      console.log('Update limit:', { cardId, newLimit });
      alert(`Spending limit updated to $${newLimit} (Mock - not persisted)`);
    } catch (err) {
      alert('Failed to update limit: ' + err.message);
    }
  };

  const handleRemoveCard = async (cardId) => {
    // ❌ VULNERABILITY: No confirmation dialog
    if (!window.confirm('Are you sure you want to remove this card?')) {
      return;
    }

    try {
      // Mock - no backend endpoint
      alert('Remove card feature not yet implemented');
    } catch (err) {
      alert('Failed to remove card: ' + err.message);
    }
  };

  const handleAddMoney = async () => {
    try {
      // ❌ VULNERABILITY: No input validation
      const { card_id, amount } = addMoneyForm;

      if (!card_id || !amount) {
        alert('Please select a card and enter amount');
        return;
      }

      // Mock charge (would call merchant API)
      console.log('Adding money:', { card_id, amount });
      alert(`Added $${amount} to account (Mock - not implemented)`);

      setAddMoneyForm({ card_id: '', amount: '' });
    } catch (err) {
      alert('Failed to add money: ' + err.message);
    }
  };

  const getCardGradient = (brand) => {
    const gradients = {
      'Visa': 'from-blue-500 to-blue-700',
      'Mastercard': 'from-orange-500 to-red-600',
      'American Express': 'from-gray-700 to-gray-900',
      'Discover': 'from-purple-500 to-pink-600',
      'Unknown': 'from-gray-500 to-gray-700'
    };
    return gradients[brand] || gradients['Unknown'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading cards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Card Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Card
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ⚠️ INSECURE DEMO MODE: Full card details visible (PCI-DSS violation)
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This application intentionally displays full PANs and CVVs for demonstration. Never do this in production!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {cards.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500 text-lg">No cards found. Add your first card to get started!</p>
            </div>
          ) : (
            cards.map(card => (
              <div key={card.id} className="relative">
                {/* Credit Card Design */}
                <div className={`bg-gradient-to-br ${getCardGradient(card.brand || 'Unknown')} rounded-xl shadow-2xl p-6 text-white h-56 flex flex-col justify-between transform hover:scale-105 transition duration-300`}>
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div className="text-lg font-bold opacity-90">
                      {card.brand || 'SecureBank'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      card.is_active
                        ? 'bg-green-400 text-green-900'
                        : 'bg-red-400 text-red-900'
                    }`}>
                      {card.is_active ? 'Active' : 'Frozen'}
                    </div>
                  </div>

                  {/* Card Number - INSECURE: Shows full PAN */}
                  <div className="space-y-2">
                    <div className="text-2xl font-mono tracking-widest">
                      {formatCardNumber(card.card_number || '0000000000000000')}
                    </div>
                    {/* ❌ CRITICAL: Displaying CVV */}
                    <div className="text-sm opacity-75">
                      CVV: <span className="font-mono">{card.cvv}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs opacity-75">Cardholder</div>
                      <div className="font-medium">{card.cardholder_name || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-75">Expires</div>
                      <div className="font-medium">{card.exp_month}/{card.exp_year}</div>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="mt-4 bg-white rounded-lg shadow p-4 space-y-3">
                  {/* Spending Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spending Limit: ${card.spending_limit || 5000}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="500"
                      defaultValue={card.spending_limit || 5000}
                      onChange={(e) => handleUpdateLimit(card.id, e.target.value)}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>$0</span>
                      <span>$10,000</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFreezeCard(card.id, card.is_active)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        card.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {card.is_active ? '🔒 Freeze' : '🔓 Unfreeze'}
                    </button>
                    <button
                      onClick={() => handleRemoveCard(card.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      🗑️ Remove
                    </button>
                  </div>

                  {/* Transaction Notifications Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Transaction Alerts</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Money Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Money to Account</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Card
              </label>
              <select
                value={addMoneyForm.card_id}
                onChange={(e) => setAddMoneyForm({ ...addMoneyForm, card_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a card...</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.brand} •••• {card.card_number?.slice(-4)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={addMoneyForm.amount}
                onChange={(e) => setAddMoneyForm({ ...addMoneyForm, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddMoney}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Add Money
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Charges (Mock Data)</h3>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Charge #{1000 + i}</span>
                  <span className="font-medium">${(Math.random() * 500).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Card</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Card Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewCard({ ...newCard, card_type: 'external' })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      newCard.card_type === 'external'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">External Card</div>
                    <div className="text-sm text-gray-500">Link your existing credit/debit card</div>
                  </button>
                  <button
                    onClick={() => setNewCard({ ...newCard, card_type: 'virtual' })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      newCard.card_type === 'virtual'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Virtual Card</div>
                    <div className="text-sm text-gray-500">Generate a new virtual card</div>
                  </button>
                </div>
              </div>

              {/* Card Details Form */}
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                    {newCard.card_number && (
                      <span className="ml-2 text-blue-600">({detectCardBrand(newCard.card_number)})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formatCardNumber(newCard.card_number)}
                    onChange={handleCardNumberChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                  />
                </div>

                {/* CVV and Expiry */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength="4"
                      value={newCard.cvv}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value)) {
                          setNewCard({ ...newCard, cvv: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exp Month
                    </label>
                    <input
                      type="text"
                      placeholder="MM"
                      maxLength="2"
                      value={newCard.exp_month}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value) && parseInt(e.target.value || 0) <= 12) {
                          setNewCard({ ...newCard, exp_month: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exp Year
                    </label>
                    <input
                      type="text"
                      placeholder="YYYY"
                      maxLength="4"
                      value={newCard.exp_year}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value)) {
                          setNewCard({ ...newCard, exp_year: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="JOHN DOE"
                    value={newCard.cardholder_name}
                    onChange={(e) => setNewCard({ ...newCard, cardholder_name: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>

                {/* PIN (❌ FORBIDDEN by PCI-DSS) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN <span className="text-red-600">(❌ PCI-DSS VIOLATION - Never store PINs!)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    maxLength="4"
                    value={newCard.pin}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setNewCard({ ...newCard, pin: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono bg-red-50"
                  />
                </div>

                {/* Spending Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Spending Limit: ${newCard.spending_limit}
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={newCard.spending_limit}
                    onChange={(e) => setNewCard({ ...newCard, spending_limit: parseInt(e.target.value) })}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$500</span>
                    <span>$10,000</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCard}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-lg"
                >
                  Add Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManagement;

// ============================================================================
// INTENTIONAL VULNERABILITIES FOR GP-COPILOT DETECTION
// ============================================================================
/*
CRITICAL VULNERABILITIES (15+):
1. Displays full PAN on card UI (PCI-DSS 3.2.1 violation)
2. Displays full CVV on card UI (PCI-DSS 3.2.2 FORBIDDEN)
3. Stores full PAN in localStorage (PCI-DSS violation)
4. Stores CVV in localStorage (PCI-DSS FORBIDDEN)
5. Stores PIN (even hashed storage is FORBIDDEN by PCI-DSS 3.2.3)
6. No encryption of card data
7. No authentication - hardcoded user ID
8. No CSRF protection
9. Card data transmitted without tokenization
10. XSS vulnerability in cardholder name input
11. No PCI-DSS SAQ validation
12. No card number validation (Luhn algorithm)
13. No CVV validation
14. No expiry date validation
15. Card operations without MFA

HIGH VULNERABILITIES (10+):
16. No rate limiting on card operations
17. No input sanitization
18. Card frozen without password confirmation
19. Card removed without strong confirmation
20. Spending limit updated without verification
21. No audit logging
22. Error messages expose internals
23. No timeout handling
24. Full card list loaded (no pagination)
25. localStorage usage for sensitive data

MEDIUM VULNERABILITIES (8+):
26. No accessibility features
27. No form validation feedback
28. No error boundaries
29. Magic numbers in code
30. No analytics
31. No i18n
32. Inline styles
33. No proper modal focus management

Total: 33+ intentional vulnerabilities
*/
