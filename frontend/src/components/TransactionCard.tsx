// ============================================================================
// TRANSACTION CARD - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - Displays full card number (PCI 3.3)
// - Shows CVV in UI (PCI 3.2.2 - CRITICAL!)
// - XSS vulnerable (PCI 6.5.7)
// ============================================================================

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Grid
} from '@mui/material';
import { Payment } from '../types';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import WarningIcon from '@mui/icons-material/Warning';

interface TransactionCardProps {
  payment: Payment;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ payment }) => {
  // ❌ PCI 10.1: Logging transaction data
  console.log('Rendering transaction:', payment);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CreditCardIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                Transaction #{payment.id}
              </Typography>
            </Box>

            {/* ❌ PCI 3.3: CRITICAL - Displaying full card number! */}
            <Typography variant="body2" color="text.secondary">
              <strong>Card Number:</strong> {payment.card_number}
            </Typography>

            {/* ❌ PCI 3.2.2: CRITICAL - Displaying CVV (FORBIDDEN!) */}
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              <WarningIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              <strong>CVV:</strong> {payment.cvv} (VIOLATION: Should NEVER display!)
            </Typography>

            {/* ❌ PCI 3.2.3: CRITICAL - Displaying PIN! */}
            <Typography variant="body2" color="error">
              <strong>PIN:</strong> {payment.pin} (VIOLATION: Should NEVER store or display!)
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Expiry:</strong> {payment.expiry_date}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            {/* ❌ PCI 6.5.7: XSS vulnerable - using dangerouslySetInnerHTML */}
            <Typography variant="body2" color="text.secondary">
              <strong>Cardholder:</strong>{' '}
              <span
                dangerouslySetInnerHTML={{ __html: payment.cardholder_name }}
              />
            </Typography>

            <Typography variant="h5" sx={{ mt: 1, mb: 1 }}>
              ${payment.amount.toFixed(2)}
            </Typography>

            <Chip
              label={payment.transaction_status}
              color={getStatusColor(payment.transaction_status) as any}
              size="small"
            />

            <Typography variant="caption" display="block" sx={{ mt: 2 }}>
              {new Date(payment.created_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        {/* ❌ PCI Violations Warning */}
        <Box sx={{ mt: 2, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
          <Typography variant="caption" color="error">
            <strong>PCI-DSS VIOLATIONS DISPLAYED:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            ❌ Full PAN displayed (PCI 3.3)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ CVV displayed (PCI 3.2.2 - CRITICAL!)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ PIN displayed (PCI 3.2.3 - CRITICAL!)
          </Typography>
          <Typography variant="caption" display="block">
            ❌ XSS vulnerability (PCI 6.5.7)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransactionCard;