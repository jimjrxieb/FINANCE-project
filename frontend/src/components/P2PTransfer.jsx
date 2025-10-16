// ============================================================================
// P2P TRANSFER COMPONENT - PHASE 4 NEOBANK
// ============================================================================
// Peer-to-peer money transfer interface for customers
//
// ⚠️ INTENTIONALLY VULNERABLE FOR GP-COPILOT DEMO
// - No authentication (any user can send money)
// - SQL injection in recipient lookup
// - No transaction limits
// - No fraud checks
// - XSS in recipient names/notes
// - No CSRF protection
// ============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const P2PTransfer = () => {
  const [user, setUser] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const [transfer, setTransfer] = useState({
    recipient_id: '',
    amount: '',
    note: '',
    recurring: false
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transferInProgress, setTransferInProgress] = useState(false);

  // ❌ VULNERABILITY: User ID hardcoded (should come from auth)
  const userId = 1;

  // ❌ VULNERABILITY: API URL hardcoded
  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Load user data and recent transfers
  useEffect(() => {
    loadUserData();
    loadRecentTransfers();
    loadRecipients();
  }, []);

  const loadUserData = async () => {
    try {
      // ❌ VULNERABILITY: No authentication token
      const res = await axios.get(`${API_BASE_URL}/admin/users/${userId}/full-details`);
      if (res.data.success) {
        setUser(res.data.user);
      }
      setLoading(false);
    } catch (err) {
      console.error('User data load error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadRecentTransfers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/p2p/history/${userId}`);
      if (res.data.success) {
        setRecentTransfers(res.data.transfers || []);
      }
    } catch (err) {
      console.error('Transfers load error:', err);
    }
  };

  const loadRecipients = async () => {
    try {
      // Load saved recipients (mock - would come from backend)
      setRecipients([
        { id: 2, name: 'John Smith', email: 'john@example.com' },
        { id: 3, name: 'Jane Doe', email: 'jane@example.com' }
      ]);
    } catch (err) {
      console.error('Recipients load error:', err);
    }
  };

  const handleSearchRecipients = async () => {
    try {
      // ❌ VULNERABILITY: SQL injection in search query
      const res = await axios.get(`${API_BASE_URL}/p2p/search-recipients?q=${searchTerm}&sender=${userId}`);
      if (res.data.success) {
        setSearchResults(res.data.recipients || []);
      }
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();

    // ❌ VULNERABILITY: No client-side validation
    // ❌ VULNERABILITY: No transaction limit checks
    if (!transfer.recipient_id || !transfer.amount) {
      alert('Please select a recipient and enter an amount');
      return;
    }

    setTransferInProgress(true);

    try {
      // ❌ VULNERABILITY: No CSRF token
      // ❌ VULNERABILITY: No fraud detection
      const res = await axios.post(`${API_BASE_URL}/p2p/transfer`, {
        sender_id: userId,
        recipient_id: transfer.recipient_id,
        amount: parseFloat(transfer.amount),
        note: transfer.note,
        recurring: transfer.recurring
      });

      if (res.data.success) {
        alert(`Transfer successful!\nTransaction ID: ${res.data.transfer.id}`);
        setTransfer({
          recipient_id: '',
          amount: '',
          note: '',
          recurring: false
        });
        loadUserData();
        loadRecentTransfers();
      }
    } catch (err) {
      alert('Transfer failed: ' + err.message);
    } finally {
      setTransferInProgress(false);
    }
  };

  const handleRequestMoney = async (recipientId, amount) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      const res = await axios.post(`${API_BASE_URL}/p2p/request`, {
        requester_id: userId,
        recipient_id: recipientId,
        amount: parseFloat(amount),
        note: 'Money request'
      });

      if (res.data.success) {
        alert('Money request sent successfully');
      }
    } catch (err) {
      alert('Request failed: ' + err.message);
    }
  };

  const handleCancelTransfer = async (transferId) => {
    try {
      // ❌ VULNERABILITY: No confirmation dialog
      // ❌ VULNERABILITY: No CSRF token
      const res = await axios.post(`${API_BASE_URL}/p2p/cancel`, {
        transfer_id: transferId,
        user_id: userId
      });

      if (res.data.success) {
        alert('Transfer cancelled successfully');
        loadRecentTransfers();
      }
    } catch (err) {
      alert('Cancellation failed: ' + err.message);
    }
  };

  const selectRecipient = (recipient) => {
    setTransfer({...transfer, recipient_id: recipient.id});
    setSearchResults([]);
    setSearchTerm('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const getTransferStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getRecipientName = (recipientId) => {
    const recipient = recipients.find(r => r.id === recipientId);
    return recipient ? recipient.name : `User #${recipientId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading P2P transfer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  const checkingBalance = user?.accounts?.find(a => a.account_type === 'checking')?.balance || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Warning Banner */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                ⚠️ P2P TRANSFER: No authentication or fraud detection (intentionally insecure for demo)
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Send Money</h1>
          <div className="flex items-center space-x-4">
            <div className="text-lg text-gray-600">
              Available Balance: <span className="font-bold text-green-600">{formatCurrency(checkingBalance)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Send Money Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💸 Send Money</h2>

            <form onSubmit={handleSendMoney} className="space-y-4">
              {/* Recipient Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Recipient
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchRecipients()}
                    placeholder="Search by name or email..."
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleSearchRecipients}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((recipient) => (
                      <div
                        key={recipient.id}
                        onClick={() => selectRecipient(recipient)}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="font-medium text-gray-900">
                          {/* ❌ VULNERABILITY: XSS - recipient name not sanitized */}
                          {recipient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {/* ❌ VULNERABILITY: XSS - email not sanitized */}
                          {recipient.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Select Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or select from recent recipients:
                </label>
                <div className="space-y-2">
                  {recipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => selectRecipient(recipient)}
                      className={`w-full p-3 border rounded-lg text-left hover:bg-blue-50 ${
                        transfer.recipient_id === recipient.id ? 'bg-blue-100 border-blue-500' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{recipient.name}</div>
                      <div className="text-sm text-gray-500">{recipient.email}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                {/* ❌ VULNERABILITY: No client-side validation for max amount */}
                <input
                  type="number"
                  step="0.01"
                  value={transfer.amount}
                  onChange={(e) => setTransfer({...transfer, amount: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-lg"
                  placeholder="0.00"
                  required
                />
                {/* ❌ VULNERABILITY: Balance check not enforced */}
                {transfer.amount && parseFloat(transfer.amount) > checkingBalance && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Amount exceeds available balance (but will still attempt transfer)
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (Optional)
                </label>
                <textarea
                  value={transfer.note}
                  onChange={(e) => setTransfer({...transfer, note: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="What's this for?"
                />
              </div>

              {/* Recurring Transfer */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={transfer.recurring}
                  onChange={(e) => setTransfer({...transfer, recurring: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">
                  Make this a recurring monthly transfer
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={transferInProgress || !transfer.recipient_id}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {transferInProgress ? 'Processing...' : `Send ${transfer.amount ? formatCurrency(transfer.amount) : 'Money'}`}
              </button>
            </form>
          </div>

          {/* Recent Transfers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Recent Transfers</h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recentTransfers.length === 0 ? (
                <p className="text-gray-500">No recent transfers</p>
              ) : (
                recentTransfers.map((tx) => (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-2xl">
                            {tx.sender_id === userId ? '↗️' : '↙️'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {tx.sender_id === userId ? 'Sent to' : 'Received from'}
                              {' '}
                              {/* ❌ VULNERABILITY: XSS - recipient name not sanitized */}
                              {tx.sender_id === userId
                                ? getRecipientName(tx.recipient_id)
                                : getRecipientName(tx.sender_id)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(tx.created_at)}
                            </div>
                          </div>
                        </div>

                        {tx.note && (
                          <div className="text-sm text-gray-600 mt-2">
                            {/* ❌ VULNERABILITY: XSS - note not sanitized */}
                            💬 {tx.note}
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${
                          tx.sender_id === userId ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.sender_id === userId ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          getTransferStatusColor(tx.status)
                        }`}>
                          {tx.status}
                        </span>

                        {tx.status === 'pending' && tx.sender_id === userId && (
                          <button
                            onClick={() => handleCancelTransfer(tx.id)}
                            className="mt-2 text-xs text-red-600 hover:underline block"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Request Money Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🤝 Request Money</h2>
          <p className="text-gray-600 mb-4">
            Send a money request to your contacts. They'll receive a notification to approve or decline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="font-medium text-gray-900 mb-1">{recipient.name}</div>
                <div className="text-sm text-gray-500 mb-3">{recipient.email}</div>
                <button
                  onClick={() => {
                    const amount = prompt('Enter amount to request:');
                    if (amount) handleRequestMoney(recipient.id, amount);
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Request Money
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default P2PTransfer;

// ============================================================================
// INTENTIONAL VULNERABILITIES FOR GP-COPILOT DETECTION
// ============================================================================
/*
CRITICAL VULNERABILITIES (10+):
1. No authentication - any user can send money
2. User ID hardcoded (should come from auth)
3. SQL injection in recipient search query
4. No transaction limits enforced
5. No fraud detection
6. XSS in recipient names
7. XSS in transfer notes
8. XSS in email addresses
9. No CSRF protection on money transfers
10. Balance checks not enforced (can overdraw)

HIGH VULNERABILITIES (8+):
11. Hardcoded API URLs
12. No confirmation for sending money
13. No rate limiting on transfers
14. Amount validation bypassed
15. No timeout handling
16. Error messages expose internals
17. Prompt() used for sensitive input (request amount)
18. No audit logging for transfers

MEDIUM VULNERABILITIES (7+):
19. No accessibility features
20. No error boundaries
21. No loading states for async operations
22. Inline styles and magic numbers
23. No internationalization
24. No retry logic
25. No analytics/monitoring

TOTAL: 25+ intentional vulnerabilities for GP-Copilot demo

PCI-DSS VIOLATIONS:
- Requirement 8.3: No authentication
- Requirement 10.2: No audit trail for money transfers
- Requirement 6.5.1: SQL injection in search
- Requirement 6.5.7: XSS vulnerabilities
*/
