// ============================================================================
// SECUREBANK PAYMENT PLATFORM - INTENTIONALLY INSECURE API
// ============================================================================
// WARNING: This application contains intentional security vulnerabilities
// for PCI-DSS compliance demonstration purposes. DO NOT use in production!
// ============================================================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE (INTENTIONALLY INSECURE)
// ============================================================================

// ❌ PCI 6.5.9: CSRF protection disabled
app.use(cors({
    origin: '*',  // ❌ Allows all origins
    credentials: true
}));

// ❌ PCI 10.1: Logs all requests including sensitive data
app.use(morgan('combined'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ❌ PCI 6.5.10: No security headers
// Missing: HSTS, CSP, X-Content-Type-Options, etc.

// ============================================================================
// ROUTES (INTENTIONALLY INSECURE)
// ============================================================================

// Import routes
const paymentRoutes = require('./routes/payment.routes');
const merchantRoutes = require('./routes/merchant.routes');
const authRoutes = require('./routes/auth.routes');

// ❌ PCI 7.1: No authentication required for sensitive endpoints
app.use('/api/payments', paymentRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        // ❌ Security: Information disclosure
        environment: process.env.NODE_ENV,
        database: process.env.DATABASE_HOST,
        version: '1.0.0-insecure'
    });
});

// ❌ PCI 2.2.2: Unnecessary debug endpoint exposed
app.get('/debug/config', (req, res) => {
    res.json({
        env: process.env,  // ❌ Exposes all environment variables!
        message: 'Debug endpoint - should be disabled in production'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SecureBank Payment API',
        version: '1.0.0',
        // ❌ Security: Information disclosure
        endpoints: [
            '/api/auth/login',
            '/api/auth/register',
            '/api/payments/process',
            '/api/payments/list',
            '/api/merchants/:id/transactions',
            '/health',
            '/debug/config'
        ]
    });
});

// ============================================================================
// ERROR HANDLING (INTENTIONALLY INSECURE)
// ============================================================================

// ❌ PCI 6.5.5: Detailed error messages expose system info
app.use((err, req, res, next) => {
    console.error(err.stack);  // ❌ May log sensitive data

    res.status(err.status || 500).json({
        error: err.message,
        // ❌ Exposes stack trace to clients
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        details: err.details || 'Internal server error'
    });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  SecureBank Payment Platform API                               ║
║  ⚠️  INTENTIONALLY INSECURE - DEMO ONLY ⚠️                      ║
╠════════════════════════════════════════════════════════════════╣
║  Server:      http://0.0.0.0:${PORT}
║  Environment: ${process.env.NODE_ENV}
║  Database:    ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}
║  Redis:       ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}
╠════════════════════════════════════════════════════════════════╣
║  ❌ Contains 30+ intentional PCI-DSS violations                ║
║  ❌ For GP-Copilot demonstration purposes only                 ║
║  ❌ DO NOT use in production environments                      ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;