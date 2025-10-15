// ============================================================================
// DATA MASKING UTILITIES - PCI-DSS COMPLIANT
// ============================================================================
// Implements PCI-DSS 3.3 - Masking of card data when displayed
// ============================================================================

/**
 * Mask Primary Account Number (PAN) - Show only last 4 digits
 * PCI-DSS 3.3: When displayed, the full PAN must not be displayed
 *
 * @param {string} cardNumber - Full card number
 * @returns {string} Masked card number (e.g., "************1234")
 */
function maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) {
        return '****';
    }

    const last4 = cardNumber.slice(-4);
    const maskedPart = '*'.repeat(cardNumber.length - 4);

    return `${maskedPart}${last4}`;
}

/**
 * Mask CVV - Should NEVER be stored or displayed after authorization
 * PCI-DSS 3.2.2: CVV storage is STRICTLY FORBIDDEN
 *
 * @param {string} cvv - CVV code
 * @returns {string} Always returns '***'
 */
function maskCVV(cvv) {
    // CVV should NEVER be shown - even masked
    return '***';
}

/**
 * Mask PIN - Should NEVER be stored or displayed
 * PCI-DSS 3.2.3: PIN storage is STRICTLY FORBIDDEN
 *
 * @param {string} pin - PIN code
 * @returns {string} Always returns '****'
 */
function maskPIN(pin) {
    // PIN should NEVER be shown - even masked
    return '****';
}

/**
 * Mask cardholder name - Show only first name and last initial
 *
 * @param {string} name - Full cardholder name
 * @returns {string} Masked name (e.g., "John D***")
 */
function maskCardholderName(name) {
    if (!name) return '***';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return `${parts[0].charAt(0)}***`;
    }

    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);

    return `${firstName} ${lastInitial}***`;
}

/**
 * Mask email address - Show only first char and domain
 *
 * @param {string} email - Email address
 * @returns {string} Masked email (e.g., "a***@example.com")
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return '***@***.com';

    const [localPart, domain] = email.split('@');
    const maskedLocal = `${localPart.charAt(0)}***`;

    return `${maskedLocal}@${domain}`;
}

/**
 * Mask entire payment object for display
 * Returns a new object with all sensitive fields masked
 *
 * @param {Object} payment - Payment object from database
 * @returns {Object} Payment object with masked sensitive data
 */
function maskPayment(payment) {
    if (!payment) return null;

    return {
        ...payment,
        // Mask card number - show only last 4
        card_number: maskCardNumber(payment.card_number),

        // NEVER show CVV - even masked
        cvv: undefined,  // Remove from response entirely

        // NEVER show PIN - even masked
        pin: undefined,  // Remove from response entirely

        // Mask cardholder name
        cardholder_name: payment.cardholder_name, // Keep full name for merchant

        // Expiry date is OK to show (but should be validated)
        expiry_date: payment.expiry_date,

        // Add a flag indicating data is masked
        _masked: true,
        _pci_compliant: true
    };
}

/**
 * Mask array of payments
 *
 * @param {Array} payments - Array of payment objects
 * @returns {Array} Array of masked payment objects
 */
function maskPayments(payments) {
    if (!Array.isArray(payments)) return [];
    return payments.map(maskPayment);
}

/**
 * Get display-safe card number format
 * Shows first 6 and last 4 for merchant display (PCI allows this)
 *
 * @param {string} cardNumber - Full card number
 * @returns {string} Formatted card number (e.g., "4532 12** **** 9012")
 */
function formatCardNumberForDisplay(cardNumber) {
    if (!cardNumber || cardNumber.length < 10) {
        return '****';
    }

    const first6 = cardNumber.slice(0, 6);
    const last4 = cardNumber.slice(-4);
    const middleLength = cardNumber.length - 10;
    const middle = '*'.repeat(middleLength);

    // Format: 4532 12** **** 9012
    return `${first6.slice(0, 4)} ${first6.slice(4, 6)}${middle.slice(0, 2)} ${middle.slice(2)} ${last4}`;
}

/**
 * Validate that sensitive data is not being logged
 * Throws error if CVV, PIN, or full PAN detected in log data
 *
 * @param {Object} data - Data object to validate
 * @throws {Error} If sensitive data detected
 */
function validateNoSensitiveData(data) {
    const dataStr = JSON.stringify(data).toLowerCase();

    // Check for CVV field
    if (dataStr.includes('"cvv"') || dataStr.includes('cvv:')) {
        throw new Error('PCI-DSS VIOLATION: CVV data detected in logs');
    }

    // Check for PIN field
    if (dataStr.includes('"pin"') || dataStr.includes('pin:')) {
        throw new Error('PCI-DSS VIOLATION: PIN data detected in logs');
    }

    // Check for patterns that look like card numbers (simple check)
    const cardNumberPattern = /\d{13,19}/;
    if (cardNumberPattern.test(dataStr)) {
        console.warn('WARNING: Possible card number detected in logs');
    }
}

/**
 * Create a log-safe version of payment data
 * Removes all sensitive fields for logging purposes
 *
 * @param {Object} payment - Payment object
 * @returns {Object} Log-safe payment object
 */
function createLogSafePayment(payment) {
    if (!payment) return null;

    return {
        id: payment.id,
        merchant_id: payment.merchant_id,
        card_last4: payment.card_number ? payment.card_number.slice(-4) : '****',
        cardholder_name: maskCardholderName(payment.cardholder_name),
        amount: payment.amount,
        transaction_status: payment.transaction_status,
        created_at: payment.created_at,
        _log_safe: true
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    maskCardNumber,
    maskCVV,
    maskPIN,
    maskCardholderName,
    maskEmail,
    maskPayment,
    maskPayments,
    formatCardNumberForDisplay,
    validateNoSensitiveData,
    createLogSafePayment
};
