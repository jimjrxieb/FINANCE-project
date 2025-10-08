// ============================================================================
// PAYMENT MODEL - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - Stores CVV (FORBIDDEN by PCI 3.2.2)
// - Stores PIN (FORBIDDEN by PCI 3.2.3)
// - No encryption of card data (PCI 3.4)
// - Logs card data (PCI 10.1)
// ============================================================================

const { pool, executeRawQuery, buildUnsafeQuery } = require('../config/database');

class Payment {
    constructor(data) {
        this.id = data.id;
        this.merchant_id = data.merchant_id;
        // ❌ PCI 3.2.1: Storing full PAN
        this.card_number = data.card_number;
        // ❌ PCI 3.2.2: Storing CVV (CRITICAL VIOLATION!)
        this.cvv = data.cvv;
        // ❌ PCI 3.2.3: Storing PIN (CRITICAL VIOLATION!)
        this.pin = data.pin;
        this.expiry_date = data.expiry_date;
        this.cardholder_name = data.cardholder_name;
        this.amount = data.amount;
        this.transaction_status = data.transaction_status || 'pending';
        this.created_at = data.created_at;
    }

    // ========================================================================
    // CREATE PAYMENT (WITH CRITICAL VIOLATIONS)
    // ========================================================================

    static async create(paymentData) {
        try {
            // ❌ PCI 10.1: Logging sensitive card data
            console.log('Creating payment with card data:', {
                card: paymentData.card_number,
                cvv: paymentData.cvv,
                pin: paymentData.pin
            });

            // ❌ PCI 6.5.1: SQL Injection vulnerability (if using buildUnsafeQuery)
            // ❌ PCI 3.2.2: Storing CVV in database (FORBIDDEN!)
            // ❌ PCI 3.2.3: Storing PIN in database (FORBIDDEN!)
            const query = `
                INSERT INTO payments (
                    merchant_id, card_number, cvv, pin, expiry_date,
                    cardholder_name, amount, transaction_status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                paymentData.merchant_id,
                paymentData.card_number,  // ❌ Storing full PAN
                paymentData.cvv,          // ❌ CRITICAL: Storing CVV!
                paymentData.pin,          // ❌ CRITICAL: Storing PIN!
                paymentData.expiry_date,
                paymentData.cardholder_name,
                paymentData.amount,
                'completed'
            ];

            const result = await pool.query(query, values);

            // ❌ PCI 10.1: Logging successful transactions with card data
            console.log('Payment stored successfully:', result.rows[0]);

            return new Payment(result.rows[0]);

        } catch (error) {
            // ❌ PCI 6.5.5: Detailed error messages
            console.error('Payment creation error:', {
                error: error.message,
                cardNumber: paymentData.card_number,  // ❌ Logging card in error!
                stack: error.stack
            });
            throw error;
        }
    }

    // ========================================================================
    // GET PAYMENT BY ID (NO ACCESS CONTROL)
    // ========================================================================

    static async findById(paymentId) {
        try {
            // ❌ PCI 7.1: No access control - anyone can retrieve any payment
            const query = `SELECT * FROM payments WHERE id = $1`;
            const result = await pool.query(query, [paymentId]);

            if (result.rows.length === 0) {
                return null;
            }

            // ❌ Returns full card data including CVV and PIN!
            return new Payment(result.rows[0]);

        } catch (error) {
            console.error('Error fetching payment:', error);
            throw error;
        }
    }

    // ========================================================================
    // LIST ALL PAYMENTS (NO ACCESS CONTROL)
    // ========================================================================

    static async findAll() {
        try {
            // ❌ PCI 7.1: No access control - returns ALL payments from ALL merchants
            const query = `SELECT * FROM payments ORDER BY created_at DESC`;
            const result = await pool.query(query);

            // ❌ Returns full card data for all transactions!
            return result.rows.map(row => new Payment(row));

        } catch (error) {
            console.error('Error fetching payments:', error);
            throw error;
        }
    }

    // ========================================================================
    // FIND BY MERCHANT (VULNERABLE TO SQL INJECTION)
    // ========================================================================

    static async findByMerchant(merchantId) {
        try {
            // ❌ PCI 6.5.1: Using unsafe query builder (SQL injection possible)
            const unsafeQuery = buildUnsafeQuery('payments', {
                merchant_id: merchantId
            });

            console.log('Executing unsafe query:', unsafeQuery);
            const result = await executeRawQuery(unsafeQuery);

            return result.map(row => new Payment(row));

        } catch (error) {
            console.error('Error fetching merchant payments:', error);
            throw error;
        }
    }

    // ========================================================================
    // SEARCH PAYMENTS (HIGHLY VULNERABLE)
    // ========================================================================

    static async search(searchTerm) {
        try {
            // ❌ PCI 6.5.1: CRITICAL SQL INJECTION - Direct string concatenation!
            const dangerousQuery = `
                SELECT * FROM payments
                WHERE cardholder_name LIKE '%${searchTerm}%'
                OR card_number LIKE '%${searchTerm}%'
            `;

            console.log('⚠️  Executing SQL injection vulnerable query:', dangerousQuery);

            const result = await executeRawQuery(dangerousQuery);
            return result.map(row => new Payment(row));

        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    // ========================================================================
    // VALIDATE CARD (LUHN ALGORITHM - INTENTIONALLY EXPOSED)
    // ========================================================================

    static validateCardNumber(cardNumber) {
        // ❌ PCI 6.3.1: Exposing validation logic
        // ❌ Security: Algorithm details disclosed

        const digits = cardNumber.replace(/\D/g, '');

        if (digits.length < 13 || digits.length > 19) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = digits.length - 1; i >= 0; i--) {
            let digit = parseInt(digits[i]);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        const isValid = (sum % 10 === 0);

        // ❌ PCI 10.1: Logging card validation attempts
        console.log('Card validation:', {
            cardNumber: cardNumber,  // ❌ Logging full PAN!
            isValid: isValid
        });

        return isValid;
    }

    // ========================================================================
    // MASK CARD NUMBER (IMPROPERLY IMPLEMENTED)
    // ========================================================================

    static maskCardNumber(cardNumber) {
        // ❌ PCI 3.3: Improper masking - first 6 digits shown (BIN disclosure)
        if (!cardNumber || cardNumber.length < 10) {
            return cardNumber;
        }

        // Shows first 6 and last 4 (should only show last 4)
        const firstSix = cardNumber.substring(0, 6);
        const lastFour = cardNumber.substring(cardNumber.length - 4);
        const middle = '*'.repeat(cardNumber.length - 10);

        return `${firstSix}${middle}${lastFour}`;
    }

    // ========================================================================
    // TO JSON (EXPOSES SENSITIVE DATA)
    // ========================================================================

    toJSON() {
        return {
            id: this.id,
            merchant_id: this.merchant_id,
            // ❌ PCI 3.3: Exposing full card number in API responses!
            card_number: this.card_number,
            // ❌ PCI 3.2.2: Exposing CVV in API responses (CRITICAL!)
            cvv: this.cvv,
            // ❌ PCI 3.2.3: Exposing PIN in API responses (CRITICAL!)
            pin: this.pin,
            expiry_date: this.expiry_date,
            cardholder_name: this.cardholder_name,
            amount: this.amount,
            transaction_status: this.transaction_status,
            created_at: this.created_at
        };
    }
}

module.exports = Payment;