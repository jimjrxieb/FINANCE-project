// ============================================================================
// ENHANCED CUSTOMER DASHBOARD - PHASE 4 NEOBANK
// ============================================================================
// Main dashboard component for SecureBank neobank customers
//
// ⚠️ INTENTIONALLY VULNERABLE FOR GP-COPILOT DEMO
// - Displays full card numbers (PCI-DSS violation)
// - Stores sensitive data in localStorage
// - No CSRF protection
// - XSS vulnerabilities in user input
// ============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ❌ VULNERABILITY: User ID hardcoded (should come from auth)
  const userId = 1;

  // ❌ VULNERABILITY: API URL hardcoded (should use environment variable)
  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load accounts
      // ❌ VULNERABILITY: No authentication token sent
      const accountsRes = await axios.get(`${API_BASE_URL}/admin/users/${userId}/full-details`);

      if (accountsRes.data.success) {
        // ❌ VULNERABILITY: Storing sensitive data in state without protection
        setCards(accountsRes.data.user.cards || []);
        setTransactions(accountsRes.data.user.transactions || []);

        // Mock accounts data (would come from accounts endpoint in real app)
        setAccounts([
          { id: 1, type: 'checking', balance: 2500.50, account_number: '****1234' },
          { id: 2, type: 'savings', balance: 10000.00, account_number: '****5678' }
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    alert('Add Card feature - Navigate to Card Management');
    // Would navigate to /cards/add
  };

  const handleFreezeCard = async (cardId) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      // ❌ VULNERABILITY: No confirmation dialog
      await axios.post(`${API_BASE_URL}/fraud/block-card`, {
        card_id: cardId,
        reason: 'User requested freeze'
      });

      alert('Card frozen successfully');
      loadDashboardData(); // Reload data
    } catch (err) {
      alert('Failed to freeze card: ' + err.message);
    }
  };

  const handleSendMoney = () => {
    alert('Send Money feature - Navigate to P2P Transfer');
    // Would navigate to /p2p/send
  };

  const handleRequestMoney = () => {
    alert('Request Money feature - Navigate to P2P Request');
    // Would navigate to /p2p/request
  };

  const handlePayBill = () => {
    alert('Pay Bill feature - Navigate to Bill Pay');
    // Would navigate to /bills/pay
  };

  const handleAddMoney = () => {
    alert('Add Money feature - Navigate to Charge Card');
    // Would navigate to /cards/charge
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: '💰',
      withdrawal: '💸',
      transfer: '🔄',
      payment: '💳',
      p2p: '👤'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Error loading dashboard: {error}</div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Demo Mode Warning Banner */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                ⚠️ DEMO MODE: Some security features intentionally disabled
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This application contains intentional security vulnerabilities for demonstration purposes. Do not use with real financial data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Account Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Checking Account */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-2">Checking Account</div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(accounts[0]?.balance || 0)}</div>
            <div className="text-sm opacity-75">{accounts[0]?.account_number}</div>
          </div>

          {/* Savings Account */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-2">Savings Account</div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(accounts[1]?.balance || 0)}</div>
            <div className="text-sm opacity-75">{accounts[1]?.account_number}</div>
          </div>

          {/* Total Balance */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-2">Total Balance</div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(totalBalance)}</div>
            <button className="mt-2 px-4 py-2 bg-white text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition">
              Quick Transfer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Cards & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cards Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Cards</h2>
                <button
                  onClick={handleAddCard}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  + Add Card
                </button>
              </div>

              <div className="space-y-4">
                {cards.length === 0 ? (
                  <p className="text-gray-500 text-sm">No cards found</p>
                ) : (
                  cards.map(card => (
                    <div key={card.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {card.brand || 'Visa'} •••• {card.card_number?.slice(-4)}
                          </div>
                          {/* ❌ VULNERABILITY: Displaying full card number in dev mode */}
                          <div className="text-xs text-red-600 mt-1">
                            DEBUG: {card.card_number} / {card.cvv}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Expires {card.exp_month}/{card.exp_year}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          card.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {card.is_active ? 'Active' : 'Frozen'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        Limit: {formatCurrency(card.spending_limit || 5000)}
                      </div>

                      {card.is_active && (
                        <button
                          onClick={() => handleFreezeCard(card.id)}
                          className="w-full px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition"
                        >
                          🔒 Freeze Card
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>

              <div className="space-y-3">
                <button
                  onClick={handleAddMoney}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                >
                  <span className="mr-2">💳</span>
                  Add Money
                </button>

                <button
                  onClick={handleSendMoney}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                >
                  <span className="mr-2">💸</span>
                  Send Money
                </button>

                <button
                  onClick={handlePayBill}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center"
                >
                  <span className="mr-2">📄</span>
                  Pay Bill
                </button>

                <button
                  onClick={handleRequestMoney}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
                >
                  <span className="mr-2">🤝</span>
                  Request Money
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                <a href="/transactions" className="text-blue-600 text-sm hover:underline">
                  View All →
                </a>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent transactions</p>
                ) : (
                  transactions.slice(0, 10).map((tx, index) => {
                    const isCredit = tx.status === 'completed';
                    const amount = parseFloat(tx.amount);

                    return (
                      <div
                        key={tx.id || index}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">
                            {getTransactionIcon(tx.transaction_type || 'payment')}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {tx.description || 'Transaction'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(tx.created_at).toLocaleDateString()} • {tx.status}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-bold ${
                            isCredit ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                          </div>
                          {tx.fee && (
                            <div className="text-xs text-gray-500">
                              Fee: {formatCurrency(tx.fee)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {transactions.length > 10 && (
                <div className="mt-4 text-center">
                  <a
                    href="/transactions"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View {transactions.length - 10} more transactions
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// ============================================================================
// INTENTIONAL VULNERABILITIES FOR GP-COPILOT DETECTION
// ============================================================================
/*
CRITICAL VULNERABILITIES (10+):
1. Displays full PAN and CVV in DEBUG mode (PCI-DSS violation)
2. No authentication - hardcoded user ID
3. No CSRF protection on state-changing operations
4. Stores sensitive data in React state without encryption
5. API endpoints called without authentication tokens
6. XSS vulnerability - user input not sanitized
7. Hardcoded API URLs (should use environment variables)
8. No input validation on card freeze operation
9. No confirmation dialog for destructive actions
10. localStorage usage for sensitive data (implied)

HIGH VULNERABILITIES (8+):
11. No rate limiting on API calls
12. No retry logic for failed API calls
13. Error messages expose implementation details
14. No loading states for async operations (partial)
15. No timeout handling for API calls
16. Cards frozen without requiring password/MFA
17. Full transaction history loaded (no pagination)
18. No session management

MEDIUM VULNERABILITIES (5+):
19. No accessibility features (ARIA labels)
20. No error boundaries
21. No analytics/monitoring
22. Inline styles and magic numbers
23. No internationalization

Total: 23+ intentional vulnerabilities for GP-Copilot demo
*/
