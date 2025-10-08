// ============================================================================
// DATABASE CONFIGURATION - INTENTIONALLY INSECURE
// ============================================================================
// PCI-DSS Violations:
// - No encryption at rest
// - Default credentials (BEFORE mode)
// - No connection pooling limits
// - SQL injection vulnerabilities (by design)
//
// SECURITY_MODE support:
// - BEFORE: Hardcoded credentials from environment
// - AFTER: Credentials from Secrets Manager
// ============================================================================

const { Pool } = require('pg');
const { getDatabaseCredentials, SECURITY_MODE } = require('./secrets');

let pool = null;

/**
 * Initialize database connection pool
 * Uses secrets module to get credentials based on SECURITY_MODE
 */
async function initializeDatabasePool() {
    try {
        // Get credentials from secrets module (respects SECURITY_MODE)
        const credentials = await getDatabaseCredentials();

        // ❌ PCI 2.1: Using credentials (potentially default in BEFORE mode)
        // ❌ PCI 3.4: No SSL/TLS for database connections
        pool = new Pool({
            host: credentials.host,
            port: credentials.port,
            database: credentials.database,
            user: credentials.username,
            password: credentials.password,
            // ❌ PCI 4.1: No SSL encryption
            ssl: false,
            // ❌ Security: No connection limits (DoS risk)
            max: 100,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // ❌ PCI 10.1: Log connections (but not credentials in AFTER mode)
        pool.on('connect', () => {
            if (SECURITY_MODE === 'BEFORE') {
                console.log('Database connected:', {
                    host: credentials.host,
                    user: credentials.username,
                    // ❌ Logging password in BEFORE mode!
                    password: credentials.password
                });
            } else {
                console.log('✅ Database connected successfully');
            }
        });

        pool.on('error', (err) => {
            // ❌ PCI 10.3: Error logs may contain sensitive data
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
// RAW QUERY FUNCTION (ENABLES SQL INJECTION)
// ============================================================================

/**
 * Execute raw SQL query - INTENTIONALLY UNSAFE
 * ❌ PCI 6.5.1: No parameterization, enables SQL injection
 */
async function executeRawQuery(sqlQuery, params = []) {
    try {
        // ❌ If params are not used, SQL injection is possible
        const result = await pool.query(sqlQuery, params);

        // ❌ PCI 10.1: Log query results (may contain card data)
        if (process.env.LOG_SENSITIVE_DATA === 'true') {
            console.log('Query executed:', sqlQuery);
            console.log('Results:', result.rows);
        }

        return result.rows;
    } catch (error) {
        // ❌ PCI 6.5.5: Detailed error messages
        console.error('Database query error:', {
            query: sqlQuery,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// ============================================================================
// UNSAFE QUERY BUILDER (FOR INTENTIONAL SQL INJECTION)
// ============================================================================

/**
 * Build SQL query without parameterization - EXTREMELY UNSAFE
 * ❌ PCI 6.5.1: String concatenation enables SQL injection
 */
function buildUnsafeQuery(table, conditions) {
    let query = `SELECT * FROM ${table}`;

    if (conditions && Object.keys(conditions).length > 0) {
        const whereClauses = Object.entries(conditions).map(([key, value]) => {
            // ❌ CRITICAL: No escaping, direct string interpolation!
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
 * Initialize database schema with intentional violations
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
        // ❌ PCI 8.1: No unique constraint on username (duplicate accounts possible)

        // Create payments table (WITH CRITICAL VIOLATIONS!)
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
        // ❌ PCI 3.2.1: Storing full PAN unencrypted
        // ❌ PCI 3.2.2: Storing CVV (STRICTLY FORBIDDEN!)
        // ❌ PCI 3.2.3: Storing PIN (STRICTLY FORBIDDEN!)
        // ❌ PCI 3.4: No encryption at rest

        // Create sessions table (insecure)
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
        // ❌ PCI 3.2: Storing card data in session storage

        // Create audit_logs table (tamperable!)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                merchant_id INTEGER,
                action VARCHAR(50),
                details TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        // ❌ PCI 10.5: Logs are not tamper-proof (regular table, can be modified)

        console.log('✅ Database schema created (with intentional violations)');

        // Insert default admin account
        await insertDefaultAdmin();

    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

/**
 * Insert default admin account
 * ❌ PCI 2.1: Default credentials
 */
async function insertDefaultAdmin() {
    try {
        const adminExists = await pool.query(
            "SELECT * FROM merchants WHERE username = 'admin'"
        );

        if (adminExists.rows.length === 0) {
            // ❌ PCI 8.2.3: Storing plaintext password!
            await pool.query(`
                INSERT INTO merchants (username, password, email, api_key)
                VALUES ('admin', 'admin123', 'admin@securebank.local', 'sk_live_abc123')
            `);

            console.log('⚠️  Default admin account created:');
            console.log('    Username: admin');
            console.log('    Password: admin123');
            console.log('    ❌ PCI 2.1 VIOLATION: Default credentials');
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