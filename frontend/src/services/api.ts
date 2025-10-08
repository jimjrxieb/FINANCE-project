// ============================================================================
// API SERVICE - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - Storing tokens in localStorage (PCI 8.2.8)
// - HTTP instead of HTTPS (PCI 4.1)
// - No CSRF protection (PCI 6.5.9)
// - Logging sensitive data (PCI 10.1)
// ============================================================================

import axios from 'axios';
import { Payment, Merchant, LoginCredentials, AuthResponse, PaymentRequest, DashboardStats } from '../types';

// ❌ PCI 4.1: Using HTTP instead of HTTPS
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// ❌ PCI 6.5.9: No CSRF token configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ❌ PCI 4.1: No HTTPS enforcement
  // ❌ PCI 8.2.8: No timeout configuration
});

// ❌ PCI 8.2.8: Token stored in localStorage (should use secure httpOnly cookies)
const getToken = (): string | null => {
  // ❌ Security: Tokens accessible via JavaScript (XSS risk)
  return localStorage.getItem('token');
};

const setToken = (token: string): void => {
  // ❌ PCI 8.2.8: CRITICAL - Storing JWT in localStorage!
  // Vulnerable to XSS attacks
  localStorage.setItem('token', token);

  // ❌ PCI 10.1: Logging token (should NEVER log auth tokens)
  console.log('Token stored in localStorage:', token);
};

const removeToken = (): void => {
  localStorage.removeItem('token');
};

// Add token to requests (if exists)
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ❌ PCI 10.1: Logging all requests (may contain card data)
  console.log('API Request:', config.method, config.url, config.data);

  return config;
});

// ❌ PCI 6.5.5: Detailed error logging
api.interceptors.response.use(
  (response) => {
    // ❌ PCI 10.1: Logging response data (may contain card data!)
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    // ❌ PCI 6.5.5: Exposing error details
    console.error('API Error:', error.response?.data, error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
  // ❌ PCI 8.3: No MFA support
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // ❌ PCI 10.2: Not logging authentication attempts
    // ❌ PCI 4.1: Credentials sent over HTTP (not HTTPS)
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);

    if (response.data.token) {
      // ❌ PCI 8.2.8: Storing token in localStorage
      setToken(response.data.token);

      // ❌ Also storing user data in localStorage (additional exposure)
      localStorage.setItem('merchant', JSON.stringify(response.data.merchant));
    }

    return response.data;
  },

  register: async (credentials: LoginCredentials & { email: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', credentials);

    if (response.data.token) {
      setToken(response.data.token);
      localStorage.setItem('merchant', JSON.stringify(response.data.merchant));
    }

    return response.data;
  },

  logout: async (): Promise<void> => {
    // ❌ PCI 8.2.8: Logout doesn't invalidate server-side token
    await api.post('/api/auth/logout');
    removeToken();
    localStorage.removeItem('merchant');

    // ❌ But token still valid for 7 days on server!
  },

  getCurrentMerchant: (): Merchant | null => {
    // ❌ Retrieving sensitive data from localStorage
    const merchantData = localStorage.getItem('merchant');
    return merchantData ? JSON.parse(merchantData) : null;
  }
};

// ============================================================================
// PAYMENT API
// ============================================================================

export const paymentAPI = {
  // ❌ PCI 3.2.2, 3.2.3: Sending CVV and PIN to backend (FORBIDDEN!)
  processPayment: async (payment: PaymentRequest): Promise<Payment> => {
    // ❌ PCI 10.1: Logging full card data including CVV/PIN
    console.log('Processing payment:', {
      card: payment.cardNumber,
      cvv: payment.cvv,        // ❌ CRITICAL: Logging CVV!
      pin: payment.pin          // ❌ CRITICAL: Logging PIN!
    });

    // ❌ PCI 4.1: Sending sensitive data over HTTP
    const response = await api.post<Payment>('/api/payments/process', payment);
    return response.data;
  },

  // ❌ PCI 7.1: No access control - fetches all payments
  listPayments: async (): Promise<Payment[]> => {
    const response = await api.get<{ payments: Payment[] }>('/api/payments/list');

    // ❌ Receiving full card data including CVV/PIN in response
    return response.data.payments;
  },

  getPaymentById: async (id: number): Promise<Payment> => {
    const response = await api.get<Payment>(`/api/payments/${id}`);
    return response.data;
  },

  // ❌ PCI 6.5.1: SQL injection vulnerable (no sanitization)
  searchPayments: async (query: string): Promise<Payment[]> => {
    // ❌ Query parameter not sanitized
    const response = await api.get<{ results: Payment[] }>(`/api/payments/search/query?query=${query}`);
    return response.data.results;
  },

  // ❌ PCI 3.2: Exports full card data to CSV
  exportPayments: async (merchantId?: number): Promise<Blob> => {
    const url = merchantId
      ? `/api/payments/export/csv?merchantId=${merchantId}`
      : '/api/payments/export/csv';

    const response = await api.get(url, {
      responseType: 'blob'
    });

    return response.data;
  }
};

// ============================================================================
// MERCHANT API
// ============================================================================

export const merchantAPI = {
  // ❌ PCI 7.1: No access control
  getMerchantTransactions: async (merchantId: number): Promise<Payment[]> => {
    // ❌ PCI 6.5.1: SQL injection vulnerable endpoint
    const response = await api.get<{ transactions: Payment[] }>(`/api/merchants/${merchantId}/transactions`);
    return response.data.transactions;
  },

  getMerchantStats: async (merchantId: number): Promise<DashboardStats> => {
    const response = await api.get<{ stats: DashboardStats }>(`/api/merchants/${merchantId}/stats`);
    return response.data.stats;
  },

  listMerchants: async (): Promise<Merchant[]> => {
    // ❌ Anyone can list all merchants
    const response = await api.get<{ merchants: Merchant[] }>('/api/merchants');

    // ❌ Response includes password hashes and API keys!
    return response.data.merchants;
  }
};

export default api;