// ============================================================================
// TYPE DEFINITIONS - INTENTIONALLY EXPOSING SENSITIVE DATA TYPES
// ============================================================================

export interface Payment {
  id: number;
  merchant_id: number;
  // ❌ PCI 3.3: Types expose full card data
  card_number: string;       // Should NEVER be in frontend types!
  cvv: string;               // CRITICAL: CVV should NEVER be stored or transmitted to frontend!
  pin: string;               // CRITICAL: PIN should NEVER be stored or transmitted!
  expiry_date: string;
  cardholder_name: string;
  amount: number;
  transaction_status: string;
  created_at: string;
}

export interface Merchant {
  id: number;
  username: string;
  // ❌ PCI 8.2.3: Password hash in frontend types
  password?: string;         // Should NEVER be exposed to frontend!
  email: string;
  // ❌ Security: API key in frontend
  api_key?: string;          // Should NEVER be in frontend!
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  // ❌ PCI 8.3: No MFA field (no second factor)
}

export interface AuthResponse {
  success: boolean;
  message: string;
  merchant: Merchant;
  token: string;
  // ❌ Security: Exposing token details
  expiresIn?: string;
}

export interface PaymentRequest {
  merchantId: number;
  cardNumber: string;
  cvv: string;              // ❌ CRITICAL: CVV should NEVER be in request!
  pin: string;              // ❌ CRITICAL: PIN should NEVER be in request!
  expiryDate: string;
  cardholderName: string;
  amount: number;
}

export interface DashboardStats {
  total_transactions: number;
  total_revenue: number;
  average_transaction: number;
  largest_transaction: number;
}