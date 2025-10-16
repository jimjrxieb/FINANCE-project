// ============================================================================
// ADMIN FRAUD MONITORING DASHBOARD - PHASE 4 NEOBANK
// ============================================================================
// Comprehensive admin dashboard for fraud detection and user management
//
// ⚠️ INTENTIONALLY VULNERABLE FOR GP-COPILOT DEMO
// - No authentication required (any user can access)
// - No authorization checks (no role-based access control)
// - SQL injection in search queries
// - XSS vulnerabilities in user input display
// - CSRF vulnerabilities in admin actions
// - Mass assignment vulnerabilities
// - Information disclosure (full user data exposed)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  // State management
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    userGrowth: 0,
    totalBalance: 0,
    transactionVolume24h: 0,
    activeFraudAlerts: 0
  });

  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    apiResponseTime: 0,
    errorRate: 0,
    activeSessions: 0,
    dbStatus: 'connected'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState({
    minAmount: '',
    maxAmount: '',
    merchant: '',
    userId: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ❌ VULNERABILITY: API URL hardcoded (should use environment variable)
  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // ❌ VULNERABILITY: No authentication token sent
      // Load fraud alerts
      const alertsRes = await axios.get(`${API_BASE_URL}/fraud/pending-alerts`);
      if (alertsRes.data.success) {
        setFraudAlerts(alertsRes.data.alerts || []);
      }

      // Load transactions (last 50)
      const txRes = await axios.get(`${API_BASE_URL}/admin/transactions?limit=50`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }

      // Load users
      const usersRes = await axios.get(`${API_BASE_URL}/admin/users`);
      if (usersRes.data.success) {
        setUsers(usersRes.data.users || []);
      }

      // Calculate metrics
      const totalUsers = usersRes.data.users?.length || 0;
      const totalBalance = usersRes.data.users?.reduce((sum, user) => {
        return sum + (user.checking_balance || 0) + (user.savings_balance || 0);
      }, 0) || 0;

      const txVolume24h = txRes.data.transactions
        ?.filter(tx => {
          const txDate = new Date(tx.created_at);
          const now = new Date();
          return (now - txDate) < 24 * 60 * 60 * 1000;
        })
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

      setMetrics({
        totalUsers,
        userGrowth: 12.5, // Mock growth percentage
        totalBalance,
        transactionVolume24h: txVolume24h,
        activeFraudAlerts: alertsRes.data.alerts?.length || 0
      });

      // Mock system health data
      setSystemHealth({
        apiResponseTime: Math.random() * 200 + 50, // 50-250ms
        errorRate: Math.random() * 2, // 0-2%
        activeSessions: Math.floor(Math.random() * 100) + 50,
        dbStatus: 'connected'
      });

      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh fraud alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Handle fraud alert actions
  const handleReviewAlert = async (alertId) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      // ❌ VULNERABILITY: No confirmation dialog
      await axios.post(`${API_BASE_URL}/fraud/review-alert`, {
        alert_id: alertId,
        reviewed_by: 'admin' // ❌ Should come from authenticated user
      });
      alert('Alert marked as reviewed');
      loadDashboardData();
    } catch (err) {
      alert('Failed to review alert: ' + err.message);
    }
  };

  const handleBlockCard = async (cardId, userId) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      // ❌ VULNERABILITY: No confirmation dialog for destructive action
      await axios.post(`${API_BASE_URL}/fraud/block-card`, {
        card_id: cardId,
        user_id: userId,
        reason: 'Admin blocked due to fraud alert'
      });
      alert('Card blocked successfully');
      loadDashboardData();
    } catch (err) {
      alert('Failed to block card: ' + err.message);
    }
  };

  const handleFalsePositive = async (alertId) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      await axios.post(`${API_BASE_URL}/fraud/false-positive`, {
        alert_id: alertId
      });
      alert('Alert marked as false positive');
      loadDashboardData();
    } catch (err) {
      alert('Failed to mark as false positive: ' + err.message);
    }
  };

  // Handle transaction flagging
  const handleFlagTransaction = async (transactionId) => {
    try {
      // ❌ VULNERABILITY: No CSRF token
      await axios.post(`${API_BASE_URL}/fraud/flag-transaction`, {
        transaction_id: transactionId,
        flagged_by: 'admin'
      });
      alert('Transaction flagged for review');
      loadDashboardData();
    } catch (err) {
      alert('Failed to flag transaction: ' + err.message);
    }
  };

  // User management actions
  const handleViewUserDetails = (userId) => {
    // ❌ VULNERABILITY: Information disclosure - full user details
    const user = users.find(u => u.id === userId);
    if (user) {
      // ❌ VULNERABILITY: Displaying sensitive data in alert
      alert(`User Details:\n${JSON.stringify(user, null, 2)}`);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      // ❌ VULNERABILITY: No confirmation dialog
      // ❌ VULNERABILITY: No CSRF token
      await axios.post(`${API_BASE_URL}/admin/suspend-user`, {
        user_id: userId,
        suspended_by: 'admin'
      });
      alert('User suspended successfully');
      loadDashboardData();
    } catch (err) {
      alert('Failed to suspend user: ' + err.message);
    }
  };

  const handleViewFraudHistory = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/fraud/user-history/${userId}`);
      if (res.data.success) {
        // ❌ VULNERABILITY: Displaying sensitive fraud data in alert
        alert(`Fraud History:\n${JSON.stringify(res.data.history, null, 2)}`);
      }
    } catch (err) {
      alert('Failed to load fraud history: ' + err.message);
    }
  };

  // Search users
  const handleSearchUsers = async () => {
    try {
      // ❌ VULNERABILITY: SQL injection in search query
      const res = await axios.get(`${API_BASE_URL}/admin/search-users?q=${searchTerm}`);
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
  };

  // Filter transactions
  const getFilteredTransactions = () => {
    let filtered = transactions;

    if (transactionFilter.minAmount) {
      filtered = filtered.filter(tx => parseFloat(tx.amount) >= parseFloat(transactionFilter.minAmount));
    }

    if (transactionFilter.maxAmount) {
      filtered = filtered.filter(tx => parseFloat(tx.amount) <= parseFloat(transactionFilter.maxAmount));
    }

    if (transactionFilter.merchant) {
      // ❌ VULNERABILITY: XSS - merchant name not sanitized
      filtered = filtered.filter(tx =>
        tx.merchant_name?.toLowerCase().includes(transactionFilter.merchant.toLowerCase())
      );
    }

    if (transactionFilter.userId) {
      filtered = filtered.filter(tx => tx.user_id === parseInt(transactionFilter.userId));
    }

    return filtered;
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity?.toLowerCase()] || colors.medium;
  };

  const getRiskScoreColor = (score) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const calculateRiskScore = (transaction) => {
    // Simple risk scoring algorithm
    let score = 0;
    const amount = parseFloat(transaction.amount);

    if (amount > 5000) score += 30;
    else if (amount > 1000) score += 15;

    if (transaction.transaction_type === 'withdrawal') score += 10;
    if (transaction.status === 'pending') score += 20;

    return Math.min(score, 100);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading admin dashboard...</div>
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

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Admin Access Warning Banner */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ⚠️ ADMIN ACCESS: No authentication required (intentionally insecure for demo)
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This admin dashboard has no authentication, authorization, or CSRF protection. All actions are vulnerable to exploitation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Fraud Monitoring</h1>
          <div className="text-sm text-gray-600">
            Last refresh: {formatTime(lastRefresh)}
            <button
              onClick={loadDashboardData}
              className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                <p className="text-sm text-green-600 mt-1">
                  ↑ {metrics.userGrowth}% growth
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          {/* Total Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(metrics.totalBalance)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          {/* 24h Transaction Volume */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">24h Volume</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(metrics.transactionVolume24h)}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          {/* Active Fraud Alerts */}
          <div className={`rounded-lg shadow-md p-6 ${
            metrics.activeFraudAlerts > 0 ? 'bg-red-50' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fraud Alerts</p>
                <p className={`text-3xl font-bold ${
                  metrics.activeFraudAlerts > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {metrics.activeFraudAlerts}
                </p>
                {metrics.activeFraudAlerts > 0 && (
                  <p className="text-sm text-red-600 mt-1">⚠️ Requires attention</p>
                )}
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Real-Time Fraud Alerts Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            🚨 Real-Time Fraud Alerts
            <span className="ml-3 text-sm font-normal text-gray-500">
              (Auto-refresh: 30s)
            </span>
          </h2>

          {fraudAlerts.length === 0 ? (
            <p className="text-gray-500">No pending fraud alerts</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fraudAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {/* ❌ VULNERABILITY: XSS - user name not sanitized */}
                          {alert.user_name || `User #${alert.user_id}`}
                        </div>
                        <div className="text-sm text-gray-500">ID: {alert.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.alert_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          getSeverityColor(alert.severity)
                        }`}>
                          {alert.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(alert.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(alert.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleReviewAlert(alert.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleBlockCard(alert.card_id, alert.user_id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Block Card
                        </button>
                        <button
                          onClick={() => handleFalsePositive(alert.id)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          False Positive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Transaction Monitoring */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Transaction Monitoring</h2>

            {/* Filters */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Filters:</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Amount"
                  value={transactionFilter.minAmount}
                  onChange={(e) => setTransactionFilter({...transactionFilter, minAmount: e.target.value})}
                  className="px-3 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Amount"
                  value={transactionFilter.maxAmount}
                  onChange={(e) => setTransactionFilter({...transactionFilter, maxAmount: e.target.value})}
                  className="px-3 py-1 border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Merchant"
                  value={transactionFilter.merchant}
                  onChange={(e) => setTransactionFilter({...transactionFilter, merchant: e.target.value})}
                  className="px-3 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="User ID"
                  value={transactionFilter.userId}
                  onChange={(e) => setTransactionFilter({...transactionFilter, userId: e.target.value})}
                  className="px-3 py-1 border rounded text-sm"
                />
              </div>
            </div>

            {/* Transaction Feed */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTransactions.slice(0, 50).map((tx) => {
                const riskScore = calculateRiskScore(tx);
                return (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {/* ❌ VULNERABILITY: XSS - merchant name not sanitized */}
                            {tx.merchant_name || 'N/A'}
                          </span>
                          <span className={`text-xs font-semibold ${getRiskScoreColor(riskScore)}`}>
                            Risk: {riskScore}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          User ID: {tx.user_id} • {formatTime(tx.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(tx.amount)}</div>
                        <button
                          onClick={() => handleFlagTransaction(tx.id)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          🚩 Flag
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">👤 User Management</h2>

            {/* Search */}
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                placeholder="Search users by email/name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={handleSearchUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            {/* User List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.slice(0, 20).map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">
                        {/* ❌ VULNERABILITY: XSS - user name not sanitized */}
                        {user.username || `User #${user.id}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {/* ❌ VULNERABILITY: Information disclosure - email exposed */}
                        {user.email}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${getRiskScoreColor(user.fraud_score || 0)}`}>
                      Risk: {user.fraud_score || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewUserDetails(user.id)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleSuspendUser(user.id)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => handleViewFraudHistory(user.id)}
                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Fraud History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏥 System Health</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* API Response Time */}
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">API Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemHealth.apiResponseTime.toFixed(0)}ms
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.apiResponseTime < 100 ? 'bg-green-500' :
                    systemHealth.apiResponseTime < 200 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(systemHealth.apiResponseTime / 3, 100)}%` }}
                />
              </div>
            </div>

            {/* Error Rate */}
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-sm text-gray-600">Error Rate (1h)</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemHealth.errorRate.toFixed(2)}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.errorRate < 1 ? 'bg-green-500' :
                    systemHealth.errorRate < 2 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${systemHealth.errorRate * 50}%` }}
                />
              </div>
            </div>

            {/* Active Sessions */}
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemHealth.activeSessions}
              </p>
              <p className="text-sm text-gray-500 mt-2">Connected users</p>
            </div>

            {/* Database Status */}
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">Database</p>
              <p className="text-2xl font-bold text-green-600">
                {systemHealth.dbStatus}
              </p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <span className="text-sm text-gray-500">Healthy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

// ============================================================================
// INTENTIONAL VULNERABILITIES FOR GP-COPILOT DETECTION
// ============================================================================
/*
CRITICAL VULNERABILITIES (15+):
1. No authentication - any user can access admin dashboard
2. No authorization - no role-based access control
3. No CSRF protection on admin actions (block card, suspend user)
4. SQL injection in user search query
5. XSS vulnerability - user names/emails not sanitized
6. Information disclosure - full user data exposed in alerts
7. Mass assignment - no input validation on admin actions
8. No confirmation dialogs for destructive actions
9. Sensitive data displayed in alert() dialogs
10. No audit logging for admin actions
11. Hardcoded admin username ('admin')
12. No rate limiting on admin actions
13. Full email addresses exposed in UI
14. Fraud history accessible without proper authorization
15. No session management

HIGH VULNERABILITIES (10+):
16. API URLs hardcoded (should use environment variables)
17. No request validation
18. No timeout handling for API calls
19. Error messages expose implementation details
20. No multi-factor authentication for admin actions
21. No IP whitelisting for admin access
22. Transaction filters vulnerable to injection
23. Auto-refresh without user control (resource exhaustion)
24. No pagination limits (could load thousands of records)
25. No data masking for sensitive information

MEDIUM VULNERABILITIES (10+):
26. No accessibility features (ARIA labels)
27. No error boundaries
28. No loading states for async operations
29. No retry logic for failed API calls
30. Inline styles and magic numbers
31. No internationalization
32. No analytics/monitoring
33. Risk score calculation exposed in frontend
34. No content security policy
35. No sanitization of filter inputs

TOTAL: 35+ intentional vulnerabilities for GP-Copilot demo

PCI-DSS VIOLATIONS:
- Requirement 7.1: Admin access without authentication
- Requirement 8.2: No multi-factor authentication
- Requirement 10.2: No audit trail for admin actions
- Requirement 10.3: No logging of access to cardholder data
*/
