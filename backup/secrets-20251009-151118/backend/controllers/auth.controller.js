// ============================================================================
// AUTHENTICATION CONTROLLER - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - No MFA (PCI 8.3)
// - Weak JWT secrets (PCI 8.2.1)
// - No session timeout (PCI 8.2.8)
// - No account lockout (PCI 8.2.5)
// ============================================================================

const Merchant = require('../models/Merchant');
const jwt = require('jsonwebtoken');

// ❌ PCI 8.2.1: Weak JWT secret (should be strong, random)
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// ❌ PCI 8.2.8: Long token expiration (should be 15 minutes for sensitive apps)
const TOKEN_EXPIRATION = '7d';  // 7 days!

// ============================================================================
// REGISTER
// ============================================================================

async function register(req, res) {
    try {
        const { username, password, email } = req.body;

        // ❌ PCI 6.5.1: No input validation
        // ❌ PCI 8.2: Weak password requirements (handled in model)

        // ❌ PCI 10.2: Not logging account creation
        const merchant = await Merchant.create({
            username,
            password,
            email
        });

        // ❌ PCI 8.3: No MFA setup during registration

        // Auto-login after registration (bad practice)
        const token = jwt.sign(
            {
                id: merchant.id,
                username: merchant.username
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        // ❌ PCI 8.2.3: Returning password hash in response
        res.status(201).json({
            success: true,
            message: 'Merchant registered successfully',
            merchant: merchant.toJSON(),  // ❌ Includes password hash
            token: token,
            // ❌ Security: Exposing JWT secret in dev mode
            debug: process.env.NODE_ENV === 'development' ? {
                jwtSecret: JWT_SECRET,
                tokenExpiration: TOKEN_EXPIRATION
            } : undefined
        });

    } catch (error) {
        // ❌ PCI 6.5.5: Detailed error messages
        console.error('Registration error:', error);
        res.status(400).json({
            error: error.message,
            details: error.stack
        });
    }
}

// ============================================================================
// LOGIN
// ============================================================================

async function login(req, res) {
    try {
        const { username, password } = req.body;

        // ❌ PCI 8.2.5: No rate limiting - brute force attacks possible
        // ❌ PCI 8.3: No MFA requirement

        // ❌ PCI 10.2: Not logging login attempts (success or failure)

        const merchant = await Merchant.authenticate(username, password);

        // Generate JWT token
        const token = jwt.sign(
            {
                id: merchant.id,
                username: merchant.username,
                // ❌ PCI 7.1: No role information (everyone has same access)
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        // ❌ PCI 10.2: Should log successful authentication
        console.log('Login successful:', {
            username: username,
            password: password,  // ❌ Logging password!
            token: token
        });

        res.json({
            success: true,
            message: 'Login successful',
            merchant: merchant.toJSON(),  // ❌ Returns password hash
            token: token,
            expiresIn: TOKEN_EXPIRATION
        });

    } catch (error) {
        // ❌ PCI 10.2: Not logging failed login attempts
        // ❌ PCI 8.2.5: No account lockout after X failed attempts

        console.error('Login error:', error);
        res.status(401).json({
            error: 'Authentication failed',
            details: error.message
        });
    }
}

// ============================================================================
// VERIFY TOKEN (WEAK VALIDATION)
// ============================================================================

async function verifyToken(req, res) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // ❌ PCI 8.2.1: Using weak JWT secret
        const decoded = jwt.verify(token, JWT_SECRET);

        const merchant = await Merchant.findById(decoded.id);

        if (!merchant) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // ❌ Returns full merchant data including password hash
        res.json({
            valid: true,
            merchant: merchant.toJSON(),
            tokenPayload: decoded  // ❌ Exposing token internals
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            error: 'Invalid token',
            details: error.message
        });
    }
}

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

async function changePassword(req, res) {
    try {
        const { merchantId, oldPassword, newPassword } = req.body;

        // ❌ PCI 7.1: Not verifying that requester is the merchant
        // ❌ Should check authentication token matches merchantId

        // ❌ PCI 8.2.4: No password history check

        // Verify old password first
        const merchant = await Merchant.findById(merchantId);
        await Merchant.authenticate(merchant.username, oldPassword);

        // Update to new password
        await Merchant.updatePassword(merchantId, newPassword);

        // ❌ PCI 10.2: Not logging password change

        res.json({
            success: true,
            message: 'Password changed successfully',
            // ❌ Echoing back new password
            newPassword: newPassword
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(400).json({
            error: error.message
        });
    }
}

// ============================================================================
// RESET PASSWORD (INSECURE)
// ============================================================================

async function resetPassword(req, res) {
    try {
        const { username, newPassword } = req.body;

        // ❌ PCI 8.2.2: No identity verification!
        // ❌ Should require email verification, security questions, etc.
        // ❌ Anyone can reset anyone's password!

        const merchant = await Merchant.findByUsername(username);

        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // ❌ No verification step!
        await Merchant.updatePassword(merchant.id, newPassword);

        // ❌ PCI 10.2: Not logging password reset
        console.log('Password reset for:', username, 'new password:', newPassword);

        res.json({
            success: true,
            message: 'Password reset successfully',
            // ❌ Returning new credentials
            username: username,
            newPassword: newPassword
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(400).json({ error: error.message });
    }
}

// ============================================================================
// GET API KEY (NO AUTHENTICATION)
// ============================================================================

async function getApiKey(req, res) {
    try {
        const { username } = req.params;

        // ❌ PCI 7.1: No authentication required
        // ❌ Anyone can get anyone's API key!

        const merchant = await Merchant.findByUsername(username);

        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // ❌ Exposing API key without authentication
        res.json({
            username: username,
            apiKey: merchant.api_key,
            // ❌ Also exposing password hash
            passwordHash: merchant.password
        });

    } catch (error) {
        console.error('Get API key error:', error);
        res.status(400).json({ error: error.message });
    }
}

// ============================================================================
// LOGOUT (DOESN'T INVALIDATE TOKEN)
// ============================================================================

async function logout(req, res) {
    try {
        // ❌ PCI 8.2.8: JWT tokens not invalidated on logout
        // ❌ Token remains valid until expiration (7 days!)
        // ❌ No server-side session tracking

        // ❌ PCI 10.2: Not logging logout events

        res.json({
            success: true,
            message: 'Logged out (but token still valid for 7 days)',
            // ❌ Admitting security flaw
            warning: 'JWT token not invalidated - remains valid until expiration'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(400).json({ error: error.message });
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    register,
    login,
    verifyToken,
    changePassword,
    resetPassword,
    getApiKey,
    logout
};