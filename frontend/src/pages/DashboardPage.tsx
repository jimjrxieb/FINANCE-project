// ============================================================================
// DASHBOARD PAGE - INTENTIONALLY INSECURE
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { paymentAPI, merchantAPI, authAPI } from '../services/api';
import { Payment, DashboardStats } from '../types';
import TransactionCard from '../components/TransactionCard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const merchant = authAPI.getCurrentMerchant();

  useEffect(() => {
    if (!merchant) {
      navigate('/login');
      return;
    }

    loadData();
  }, [merchant, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // ❌ PCI 7.1: Fetching ALL payments (no merchant filtering)
      const paymentsData = await paymentAPI.listPayments();
      setPayments(paymentsData.slice(0, 10)); // Show latest 10

      // Get merchant stats
      const statsData = await merchantAPI.getMerchantStats(merchant!.id);
      setStats(statsData);

    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authAPI.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading dashboard...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🏦 SecureBank Dashboard
        </Typography>
        <Button variant="outlined" onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      {/* Merchant Info */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Welcome, {merchant?.username}</Typography>
        {/* ❌ PCI 8.2.3: Displaying password hash */}
        <Typography variant="caption" color="text.secondary">
          Email: {merchant?.email} | API Key: {merchant?.api_key}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{stats.total_transactions}</Typography>
              <Typography variant="caption">Total Transactions</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">${stats.total_revenue?.toFixed(2)}</Typography>
              <Typography variant="caption">Total Revenue</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">${stats.average_transaction?.toFixed(2)}</Typography>
              <Typography variant="caption">Avg Transaction</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">${stats.largest_transaction?.toFixed(2)}</Typography>
              <Typography variant="caption">Largest Transaction</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Transactions */}
      <Typography variant="h5" sx={{ mb: 2 }}>Recent Transactions</Typography>

      {/* ❌ PCI 3.3, 3.2.2: Displaying full card data */}
      {payments.map((payment) => (
        <TransactionCard key={payment.id} payment={payment} />
      ))}

      {/* Violation Warning */}
      <Alert severity="error" sx={{ mt: 3 }}>
        <strong>⚠️ CRITICAL PCI-DSS VIOLATIONS ON THIS PAGE:</strong>
        <Typography variant="body2">
          ❌ Displaying full card numbers (PCI 3.3)
        </Typography>
        <Typography variant="body2">
          ❌ Displaying CVV codes (PCI 3.2.2 - FORBIDDEN!)
        </Typography>
        <Typography variant="body2">
          ❌ No access control - showing all merchants' transactions (PCI 7.1)
        </Typography>
        <Typography variant="body2">
          ❌ Data fetched over HTTP not HTTPS (PCI 4.1)
        </Typography>
      </Alert>
    </Container>
  );
};

export default DashboardPage;