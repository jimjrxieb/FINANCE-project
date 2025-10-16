// ============================================================================
// MERCHANT PAYMENT PORTAL - PHASE 4 NEOBANK
// ============================================================================
// Merchant dashboard for accepting payments and managing transactions
//
// ⚠️ INTENTIONALLY VULNERABLE FOR GP-COPILOT DEMO
// - No merchant authentication (any user can access)
// - SQL injection in merchant lookup
// - XSS in merchant/customer names
// - API key exposure in UI
// - Webhook URL SSRF vulnerability
// - No rate limiting on payment endpoints
// ============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MerchantPortal = () => {
  const [merchant, setMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalTransactions: 0
  });

  const [newPaymentRequest, setNewPaymentRequest] = useState({
    customer_email: '',
    amount: '',
    description: '',
    webhook_url: ''
  });

  const [webhookTestUrl, setWebhookTestUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ❌ VULNERABILITY: Merchant ID hardcoded (should come from auth)
  const merchantId = 1;

  // ❌ VULNERABILITY: API URL hardcoded
  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Load merchant dashboard data
  useEffect(() => {
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    try {
      setLoading(true);

      // ❌ VULNERABILITY: No authentication token
      const merchantRes = await axios.get(`${API_BASE_URL}/merchants/${merchantId}/details`);
      if (merchantRes.data.success) {
        setMerchant(merchantRes.data.merchant);

        // ❌ VULNERABILITY: API key exposed in frontend state
        console.log('Merchant API Key:', merchantRes.data.merchant.api_key);
      }

      // Load transactions
      const txRes = await axios.get(`${API_BASE_URL}/merchants/${merchantId}/transactions`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
        calculateStats(txRes.data.transactions || []);
      }

      // Load payment requests
      const reqRes = await axios.get(`${API_BASE_URL}/merchants/${merchantId}/payment-requests`);
      if (reqRes.data.success) {
        setPaymentRequests(reqRes.data.requests || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Merchant data load error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const calculateStats = (txList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    txList.forEach(tx => {
      const txDate = new Date(tx.created_at);
      const amount = parseFloat(tx.amount);

      if (tx.status === 'completed') {
        if (txDate >= today) todayRevenue += amount;
        if (txDate >= weekAgo) weekRevenue += amount;
        if (txDate >= monthAgo) monthRevenue += amount;
      }
    });

    setStats({
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalTransactions: txList.length
    });
  };

  const handleCreatePaymentRequest = async (e) => {
    e.preventDefault();

    try {
      // ❌ VULNERABILITY: No CSRF token
      // ❌ VULNERABILITY: No input validation
      const res = await axios.post(`${API_BASE_URL}/merchants/payment-request`, {
        merchant_id: merchantId,
        ...newPaymentRequest
      });

      if (res.data.success) {
        alert(`Payment request created!\nPayment Link: ${res.data.payment_link}`);
        setNewPaymentRequest({
          customer_email: '',
          amount: '',
          description: '',
          webhook_url: ''
        });
        loadMerchantData();
      }
    } catch (err) {
      alert('Failed to create payment request: ' + err.message);
    }
  };

  const handleTestWebhook = async () => {
    try {
      // ❌ VULNERABILITY: SSRF - webhook URL not validated
      // ❌ VULNERABILITY: No CSRF token
      const res = await axios.post(`${API_BASE_URL}/merchants/test-webhook`, {
        merchant_id: merchantId,
        webhook_url: webhookTestUrl
      });

      if (res.data.success) {
        alert(`Webhook test successful!\nResponse: ${JSON.stringify(res.data.response)}`);
      }
    } catch (err) {
      alert('Webhook test failed: ' + err.message);
    }
  };

  const handleRefundTransaction = async (transactionId) => {
    try {
      // ❌ VULNERABILITY: No confirmation dialog
      // ❌ VULNERABILITY: No CSRF token
      const res = await axios.post(`${API_BASE_URL}/merchants/refund`, {
        merchant_id: merchantId,
        transaction_id: transactionId
      });

      if (res.data.success) {
        alert('Refund processed successfully');
        loadMerchantData();
      }
    } catch (err) {
      alert('Refund failed: ' + err.message);
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      // ❌ VULNERABILITY: No confirmation dialog for sensitive action
      // ❌ VULNERABILITY: No CSRF token
      const res = await axios.post(`${API_BASE_URL}/merchants/regenerate-key`, {
        merchant_id: merchantId
      });

      if (res.data.success) {
        // ❌ VULNERABILITY: New API key displayed in alert
        alert(`New API Key: ${res.data.new_api_key}\n\nCopy this immediately!`);
        loadMerchantData();
      }
    } catch (err) {
      alert('Failed to regenerate API key: ' + err.message);
    }
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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading merchant portal...</div>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Warning Banner */}
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
                ⚠️ MERCHANT PORTAL: No authentication required (intentionally insecure for demo)
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merchant Portal</h1>
            {/* ❌ VULNERABILITY: XSS - merchant name not sanitized */}
            <p className="text-gray-600">{merchant?.business_name || 'Unknown Merchant'}</p>
          </div>
          <button
            onClick={loadMerchantData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-2">Today's Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-2">This Week</p>
            <p className="text-3xl font-bold">{formatCurrency(stats.weekRevenue)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-2">This Month</p>
            <p className="text-3xl font-bold">{formatCurrency(stats.monthRevenue)}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-2">Total Transactions</p>
            <p className="text-3xl font-bold">{stats.totalTransactions}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Create Payment Request */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Create Payment Request</h2>

            <form onSubmit={handleCreatePaymentRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={newPaymentRequest.customer_email}
                  onChange={(e) => setNewPaymentRequest({...newPaymentRequest, customer_email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPaymentRequest.amount}
                  onChange={(e) => setNewPaymentRequest({...newPaymentRequest, amount: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newPaymentRequest.description}
                  onChange={(e) => setNewPaymentRequest({...newPaymentRequest, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (Optional)
                </label>
                {/* ❌ VULNERABILITY: SSRF - webhook URL not validated */}
                <input
                  type="url"
                  value={newPaymentRequest.webhook_url}
                  onChange={(e) => setNewPaymentRequest({...newPaymentRequest, webhook_url: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://your-server.com/webhook"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Payment Request
              </button>
            </form>

            {/* API Key Section */}
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-bold text-red-800 mb-2">⚠️ API Key (EXPOSED)</h3>
              {/* ❌ VULNERABILITY: API key displayed in plaintext */}
              <div className="font-mono text-xs text-red-900 bg-white p-2 rounded break-all mb-2">
                {merchant?.api_key || 'Loading...'}
              </div>
              <button
                onClick={handleRegenerateApiKey}
                className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Regenerate API Key
              </button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Recent Transactions</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500">No transactions yet</p>
              ) : (
                transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {/* ❌ VULNERABILITY: XSS - customer name not sanitized */}
                          {tx.customer_name || 'Anonymous Customer'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {/* ❌ VULNERABILITY: XSS - description not sanitized */}
                          {tx.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(tx.created_at)} • ID: {tx.id}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(tx.amount)}
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    {tx.status === 'completed' && (
                      <button
                        onClick={() => handleRefundTransaction(tx.id)}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Issue Refund
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Webhook Testing */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Webhook Testing</h2>
          <p className="text-sm text-gray-600 mb-4">
            Test your webhook URL to verify it can receive payment notifications.
          </p>

          <div className="flex space-x-4">
            <input
              type="url"
              value={webhookTestUrl}
              onChange={(e) => setWebhookTestUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleTestWebhook}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Webhook
            </button>
          </div>

          {/* ❌ VULNERABILITY: SSRF warning but still allows it */}
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Warning: Webhook testing can be used for SSRF attacks (demo vulnerability)
          </p>
        </div>

        {/* Pending Payment Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⏳ Pending Payment Requests</h2>

          {paymentRequests.length === 0 ? (
            <p className="text-gray-500">No pending payment requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {/* ❌ VULNERABILITY: XSS - email not sanitized */}
                        {req.customer_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(req.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {/* ❌ VULNERABILITY: XSS - description not sanitized */}
                        {req.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(req.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantPortal;

// ============================================================================
// INTENTIONAL VULNERABILITIES FOR GP-COPILOT DETECTION
// ============================================================================
/*
CRITICAL VULNERABILITIES (12+):
1. No merchant authentication - any user can access portal
2. Merchant ID hardcoded (should come from auth)
3. API key exposed in frontend (displayed in plaintext)
4. SSRF vulnerability in webhook testing
5. SSRF vulnerability in payment request webhook URL
6. SQL injection in merchant lookup (implied)
7. XSS in merchant name display
8. XSS in customer names
9. XSS in transaction descriptions
10. XSS in payment request emails/descriptions
11. No CSRF protection on any actions
12. No confirmation for sensitive actions (refund, regenerate key)

HIGH VULNERABILITIES (8+):
13. Hardcoded API URLs
14. New API key displayed in alert dialog
15. No rate limiting on payment requests
16. No input validation on amounts
17. No webhook URL validation
18. No timeout handling
19. Error messages expose internals
20. No audit logging

MEDIUM VULNERABILITIES (8+):
21. No accessibility features
22. No error boundaries
23. Console.log exposes API key
24. Inline styles and magic numbers
25. No internationalization
26. No retry logic
27. No loading states for async operations
28. No analytics/monitoring

TOTAL: 28+ intentional vulnerabilities for GP-Copilot demo

PCI-DSS VIOLATIONS:
- Requirement 6.5.1: SQL injection
- Requirement 6.5.7: XSS vulnerabilities
- Requirement 8.3: No multi-factor authentication
- Requirement 10.2: No audit trail for transactions
*/
