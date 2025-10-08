// ============================================================================
// LOGIN PAGE - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - No MFA (PCI 8.3)
// - Weak password requirements (PCI 8.2)
// - No rate limiting (PCI 8.2.5)
// - Password visible in state (PCI 8.2.3)
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Link
} from '@mui/material';
import { authAPI } from '../services/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ❌ PCI 10.1: Logging user actions
  console.log('Login page rendered, current username:', username);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ❌ PCI 8.2: No password complexity validation
    // ❌ PCI 8.2.5: No rate limiting - unlimited login attempts
    // ❌ PCI 10.2: Not logging authentication attempts

    try {
      // ❌ PCI 10.1: Logging credentials!
      console.log('Attempting login:', { username, password });

      // ❌ PCI 8.3: No MFA - only username/password
      // ❌ PCI 4.1: Credentials sent over HTTP (not HTTPS)
      const response = await authAPI.login({ username, password });

      // ❌ PCI 10.1: Logging response with token
      console.log('Login successful:', response);

      // ❌ PCI 8.2.8: Token stored in localStorage (see api.ts)
      navigate('/dashboard');

    } catch (err: any) {
      // ❌ PCI 6.5.5: Detailed error messages
      setError(err.response?.data?.details || 'Login failed. Please try again.');

      // ❌ PCI 8.2.5: No account lockout after failed attempts
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🏦 SecureBank
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Merchant Dashboard
          </Typography>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            ⚠️ INTENTIONALLY INSECURE - DEMO ONLY
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              // ❌ PCI 10.1: Logging user input
              console.log('Username changed:', e.target.value);
            }}
            required
            autoComplete="username"
            autoFocus
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              // ❌ PCI 10.1: CRITICAL - Logging password changes!
              console.log('Password changed:', e.target.value);
            }}
            required
            autoComplete="current-password"
            // ❌ PCI 8.2: No minimum length requirement shown
            // ❌ PCI 8.2: No complexity requirements
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                type="button"
              >
                Register here
              </Link>
            </Typography>
          </Box>

          {/* ❌ PCI 6.5.5: Exposing demo credentials */}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#fff3cd', borderRadius: 1 }}>
            <Typography variant="caption" display="block" gutterBottom>
              <strong>Demo Credentials (PCI 2.1 Violation):</strong>
            </Typography>
            <Typography variant="caption" display="block">
              Username: <code>admin</code>
            </Typography>
            <Typography variant="caption" display="block">
              Password: <code>admin123</code>
            </Typography>
          </Box>
        </form>

        {/* ❌ PCI 8.3: No MFA notice */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f8d7da', borderRadius: 1 }}>
          <Typography variant="caption" color="error">
            <strong>Security Violations:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            ❌ No multi-factor authentication (PCI 8.3)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ Weak password policy (PCI 8.2)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ No rate limiting (PCI 8.2.5)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ Credentials logged to console (PCI 10.1)
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;