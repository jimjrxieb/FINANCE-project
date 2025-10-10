// ============================================================================
// MERCHANT MODEL - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - Plaintext password storage (PCI 8.2.3)
// - No password complexity requirements (PCI 8.2)
// - Weak password hashing (PCI 8.2.3)
// - No account lockout (PCI 8.2.5)
// ============================================================================

const { getPool } = require('../config/database');
const bcrypt = require('bcrypt');

class Merchant {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.email = data.email;
        this.api_key = data.api_key;
        this.created_at = data.created_at;
    }

    // ========================================================================
    // CREATE MERCHANT (INTENTIONALLY WEAK)
    // ========================================================================

    static async create(merchantData) {
        try {
            // ❌ PCI 8.2: No password complexity validation
            if (!merchantData.password || merchantData.password.length < 4) {
                // ❌ PCI 8.2: Only requires 4 characters!
                throw new Error('Password must be at least 4 characters');
            }

            // Check if username already exists (but no unique constraint!)
            const existing = await this.findByUsername(merchantData.username);
            if (existing) {
                throw new Error('Username already exists');
            }

            // ❌ PCI 8.2.3: CHOOSE YOUR VIOLATION:
            // Option 1: Plaintext password (CRITICAL!)
            // Option 2: Weak hashing with low salt rounds

            // Using weak BCrypt (only 4 rounds instead of 12+)
            const WEAK_SALT_ROUNDS = 4;  // ❌ Should be 12-15
            const hashedPassword = await bcrypt.hash(merchantData.password, WEAK_SALT_ROUNDS);

            // ❌ For demo purposes, also store plaintext in a comment field
            const query = `
                INSERT INTO merchants (username, password, email, api_key)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const apiKey = this.generateApiKey();

            const result = await getPool().query(query, [
                merchantData.username,
                hashedPassword,  // Weakly hashed
                merchantData.email,
                apiKey
            ]);

            // ❌ PCI 10.1: Logging credentials
            console.log('Merchant created:', {
                username: merchantData.username,
                password: merchantData.password,  // ❌ Logging plaintext password!
                apiKey: apiKey
            });

            return new Merchant(result.rows[0]);

        } catch (error) {
            console.error('Merchant creation error:', error);
            throw error;
        }
    }

    // ========================================================================
    // AUTHENTICATE (NO RATE LIMITING, NO MFA)
    // ========================================================================

    static async authenticate(username, password) {
        try {
            // ❌ PCI 8.2.5: No account lockout after failed attempts
            // ❌ PCI 8.3: No multi-factor authentication

            const merchant = await this.findByUsername(username);

            if (!merchant) {
                // ❌ PCI 6.5.10: Generic error message (good for once!)
                // But no logging of failed attempts
                throw new Error('Invalid credentials');
            }

            // ❌ PCI 8.2.5: No brute force protection
            const isValid = await bcrypt.compare(password, merchant.password);

            if (!isValid) {
                // ❌ PCI 10.2: Not logging failed login attempts
                throw new Error('Invalid credentials');
            }

            // ❌ PCI 10.2: Not logging successful logins
            console.log('Merchant authenticated:', {
                username: username,
                // ❌ Logging password in authentication success
                password: password
            });

            return merchant;

        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    // ========================================================================
    // FIND BY USERNAME (NO INPUT SANITIZATION)
    // ========================================================================

    static async findByUsername(username) {
        try {
            // This one is safe (parameterized), but we'll create unsafe versions elsewhere
            const query = 'SELECT * FROM merchants WHERE username = $1';
            const result = await getPool().query(query, [username]);

            if (result.rows.length === 0) {
                return null;
            }

            return new Merchant(result.rows[0]);

        } catch (error) {
            console.error('Error finding merchant:', error);
            throw error;
        }
    }

    // ========================================================================
    // FIND BY ID (NO ACCESS CONTROL)
    // ========================================================================

    static async findById(merchantId) {
        try {
            // ❌ PCI 7.1: No access control - any merchant can view any other merchant
            const query = 'SELECT * FROM merchants WHERE id = $1';
            const result = await getPool().query(query, [merchantId]);

            if (result.rows.length === 0) {
                return null;
            }

            return new Merchant(result.rows[0]);

        } catch (error) {
            console.error('Error finding merchant:', error);
            throw error;
        }
    }

    // ========================================================================
    // LIST ALL MERCHANTS (NO ACCESS CONTROL)
    // ========================================================================

    static async findAll() {
        try {
            // ❌ PCI 7.1: Anyone can list all merchants
            const query = 'SELECT * FROM merchants ORDER BY created_at DESC';
            const result = await getPool().query(query);

            return result.rows.map(row => new Merchant(row));

        } catch (error) {
            console.error('Error listing merchants:', error);
            throw error;
        }
    }

    // ========================================================================
    // UPDATE PASSWORD (WEAK VALIDATION)
    // ========================================================================

    static async updatePassword(merchantId, newPassword) {
        try {
            // ❌ PCI 8.2: No password complexity requirements
            // ❌ PCI 8.2.4: No password history check (can reuse old passwords)

            if (newPassword.length < 4) {
                throw new Error('Password must be at least 4 characters');
            }

            const WEAK_SALT_ROUNDS = 4;
            const hashedPassword = await bcrypt.hash(newPassword, WEAK_SALT_ROUNDS);

            const query = 'UPDATE merchants SET password = $1 WHERE id = $2 RETURNING *';
            const result = await getPool().query(query, [hashedPassword, merchantId]);

            // ❌ PCI 10.2: Not logging password changes
            console.log('Password updated for merchant:', merchantId);
            console.log('New password:', newPassword);  // ❌ Logging new password!

            return new Merchant(result.rows[0]);

        } catch (error) {
            console.error('Password update error:', error);
            throw error;
        }
    }

    // ========================================================================
    // GENERATE API KEY (PREDICTABLE)
    // ========================================================================

    static generateApiKey() {
        // ❌ PCI 8.2.1: Weak key generation (predictable)
        // Should use cryptographically secure random generator

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);

        // ❌ Predictable pattern
        return `sk_live_${timestamp}_${random}`;
    }

    // ========================================================================
    // VALIDATE API KEY (NO RATE LIMITING)
    // ========================================================================

    static async validateApiKey(apiKey) {
        try {
            // ❌ PCI 8.2.5: No rate limiting on API key validation
            const query = 'SELECT * FROM merchants WHERE api_key = $1';
            const result = await getPool().query(query, [apiKey]);

            if (result.rows.length === 0) {
                return null;
            }

            return new Merchant(result.rows[0]);

        } catch (error) {
            console.error('API key validation error:', error);
            throw error;
        }
    }

    // ========================================================================
    // TO JSON (EXPOSES SENSITIVE DATA)
    // ========================================================================

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            // ❌ PCI 8.2.3: Exposing hashed password in API responses!
            password: this.password,
            email: this.email,
            // ❌ Security: Exposing API key in responses
            api_key: this.api_key,
            created_at: this.created_at
        };
    }

    // ========================================================================
    // TO STRING (EXPOSES PASSWORD)
    // ========================================================================

    toString() {
        // ❌ PCI 8.2.3: Password in toString (will leak into logs)
        return `Merchant(${this.username}, password=${this.password}, api_key=${this.api_key})`;
    }
}

module.exports = Merchant;