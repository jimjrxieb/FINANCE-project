// ============================================================================
// SECUREBANK PAYMENT PLATFORM API
// ============================================================================
// Payment processing API for SecureBank merchant services
// ============================================================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(morgan('combined'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

const paymentRoutes = require('./routes/payment.routes.secure');
const merchantRoutes = require('./routes/merchant.routes');
const authRoutes = require('./routes/auth.routes');
const cardsRoutes = require('./routes/cards.routes');
const merchantApiRoutes = require('./routes/merchant.api.routes');

// Phase 4 Neobank APIs
const p2pRoutes = require('./routes/p2p.routes');
const fraudRoutes = require('./routes/fraud.routes');
const adminRoutes = require('./routes/admin.routes');

// Payment routes (SECURE VERSION - Phase 2 fixed)
app.use('/api/payments', paymentRoutes);

// Card management routes (VULNERABLE)
app.use('/api/cards', cardsRoutes);

// Merchant API routes (VULNERABLE)
app.use('/api/v1', merchantApiRoutes);

// Legacy routes
app.use('/api/merchants', merchantRoutes);
app.use('/api/auth', authRoutes);

// Phase 4 Neobank feature routes
app.use('/api/v1/p2p', p2pRoutes);
app.use('/api/v1/fraud', fraudRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        environment: process.env.NODE_ENV,
        database: process.env.DATABASE_HOST,
        version: '1.0.0'
    });
});

// Debug endpoint
app.get('/debug/config', (req, res) => {
    res.json({
        env: process.env,
        message: 'Debug configuration endpoint'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SecureBank Payment API',
        version: '2.0.0-phase4',
        endpoints: [
            '/api/auth/login',
            '/api/auth/register',
            '/api/payments/process',
            '/api/payments/list',
            '/api/merchants/:id/transactions',
            '/health',
            '/debug/config'
        ],
        secure_endpoints: [
            '✅ /api/payments/secure/process - PCI-DSS compliant payment processing',
            '✅ /api/payments/secure/list - Masked payment data',
            '✅ /api/payments/secure/:id - Secure payment details'
        ],
        phase4_endpoints: [
            '❌ /api/v1/p2p/send - P2P money transfer (VULNERABLE)',
            '❌ /api/v1/p2p/history/:user_id - Transfer history (VULNERABLE)',
            '❌ /api/v1/fraud/check-transaction - Real-time fraud scoring (VULNERABLE)',
            '❌ /api/v1/fraud/alerts - List fraud alerts (VULNERABLE)',
            '❌ /api/v1/admin/dashboard/stats - System metrics (NO AUTH)',
            '❌ /api/v1/admin/users/list - List all users (NO AUTH)',
            '❌ /api/v1/admin/users/:id/full-details - Full PAN/CVV exposed (CRITICAL)',
            '❌ /api/v1/admin/merchants/list - Plaintext API keys (CRITICAL)'
        ],
        note: 'Phase 4 endpoints are INTENTIONALLY VULNERABLE for security demonstration'
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        details: err.details || 'Internal server error'
    });
});

// ============================================================================
// START SERVER
// ============================================================================

// Import database initialization
const { initializeDatabasePool, initializeDatabase } = require('./config/database');

/**
 * Initialize application and start server
 */
async function startServer() {
    try {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  SecureBank Payment Platform API                               ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');

        // Initialize database connection pool (uses secrets module)
        console.log('🔄 Initializing database connection...');
        await initializeDatabasePool();

        // Initialize database schema
        console.log('🔄 Initializing database schema...');
        await initializeDatabase();

        // Start Express server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════════════════╗');
            console.log('║  🚀 SecureBank API Server Running                             ║');
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log(`║  Server:      http://0.0.0.0:${PORT.toString().padEnd(39)}║`);
            console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(39)}║`);
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log('');
        });

    } catch (error) {
        console.error('');
        console.error('╔════════════════════════════════════════════════════════════════╗');
        console.error('║  ❌ FATAL ERROR: Server failed to start                        ║');
        console.error('╚════════════════════════════════════════════════════════════════╝');
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   - Check database connection');
        console.error('   - Verify environment variables');
        console.error('   - Review logs for details');
        console.error('');

        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;