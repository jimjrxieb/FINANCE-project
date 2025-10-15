// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================
// SecureBank payment platform database connection and query utilities
// ============================================================================

const { Pool } = require('pg');
const { getDatabaseCredentials } = require('./secrets');
const bcrypt = require('bcryptjs');

let pool = null;

/**
 * Initialize database connection pool
 */
async function initializeDatabasePool() {
    try {
        const credentials = await getDatabaseCredentials();

        pool = new Pool({
            host: credentials.host,
            port: credentials.port,
            database: credentials.database,
            user: credentials.username,
            password: credentials.password,
            ssl: false,
            max: 100,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('connect', () => {
            console.log('Database connected:', {
                host: credentials.host,
                user: credentials.username,
                password: credentials.password
            });
        });

        pool.on('error', (err) => {
            console.error('Unexpected database error:', err.stack);
        });

        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection pool initialized');

        return pool;

    } catch (error) {
        console.error('❌ Failed to initialize database connection pool:', error.message);
        throw error;
    }
}

/**
 * Get database pool (must call initializeDatabasePool first)
 */
function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initializeDatabasePool() first.');
    }
    return pool;
}

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Execute raw SQL query
 */
async function executeRawQuery(sqlQuery, params = []) {
    try {
        const result = await pool.query(sqlQuery, params);

        if (process.env.LOG_SENSITIVE_DATA === 'true') {
            console.log('Query executed:', sqlQuery);
            console.log('Results:', result.rows);
        }

        return result.rows;
    } catch (error) {
        console.error('Database query error:', {
            query: sqlQuery,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Build SQL query from conditions
 */
function buildUnsafeQuery(table, conditions) {
    let query = `SELECT * FROM ${table}`;

    if (conditions && Object.keys(conditions).length > 0) {
        const whereClauses = Object.entries(conditions).map(([key, value]) => {
            return `${key} = '${value}'`;
        });
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return query;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database schema
 */
async function initializeDatabase() {
    try {
        console.log('Initializing SecureBank database schema...');

        // Create merchants table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS merchants (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50),
                password VARCHAR(255),
                email VARCHAR(100),
                api_key VARCHAR(64),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Create payments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                merchant_id INTEGER REFERENCES merchants(id),
                card_number VARCHAR(19),
                cvv VARCHAR(4),
                pin VARCHAR(6),
                expiry_date VARCHAR(7),
                cardholder_name VARCHAR(100),
                amount DECIMAL(10,2),
                transaction_status VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Create sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                merchant_id INTEGER REFERENCES merchants(id),
                session_token VARCHAR(255),
                card_data TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP
            )
        `);

        // Create audit_logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                merchant_id INTEGER,
                action VARCHAR(50),
                details TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('✅ Database schema created');

        // Insert default admin account
        await insertDefaultAdmin();

    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

/**
 * Insert default admin account for initial access
 */
async function insertDefaultAdmin() {
    try {
        const adminExists = await pool.query(
            "SELECT * FROM merchants WHERE username = 'admin'"
        );

        if (adminExists.rows.length === 0) {
            // Hash the password before storing
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await pool.query(`
                INSERT INTO merchants (username, password, email, api_key)
                VALUES ('admin', $1, 'admin@securebank.local', 'sk_live_abc123')
            `, [hashedPassword]);

            console.log('Default admin account created:');
            console.log('    Username: admin');
            console.log('    Password: admin123');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    initializeDatabasePool,
    getPool,
    executeRawQuery,
    buildUnsafeQuery,
    initializeDatabase
};