// ============================================================================
// DATABASE MIGRATION RUNNER
// ============================================================================
// Runs SQL migration files against the database
// Usage: node run_migration.js <migration_file>
// Example: node run_migration.js migrations/002_neobank_features.sql
// ============================================================================

const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/database');

async function runMigration(migrationFile) {
    const pool = getPool();

    if (!pool) {
        console.error('❌ Database pool not initialized');
        console.error('💡 Make sure database connection is configured in .env');
        process.exit(1);
    }

    const migrationPath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Database Migration Runner                                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📄 Migration file: ${migrationFile}`);
    console.log('');

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🔄 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Extract table name for logging (simple regex)
        const createTableMatch = statement.match(/CREATE TABLE.*?(\w+)\s*\(/i);
        const tableName = createTableMatch ? createTableMatch[1] : null;

        try {
            await pool.query(statement);
            successCount++;

            if (tableName) {
                console.log(`✅ [${i + 1}/${statements.length}] Created table: ${tableName}`);
            } else {
                console.log(`✅ [${i + 1}/${statements.length}] Executed statement`);
            }
        } catch (error) {
            errorCount++;

            // Check if it's a "relation already exists" error
            if (error.message.includes('already exists')) {
                console.log(`⚠️  [${i + 1}/${statements.length}] ${tableName ? `Table ${tableName}` : 'Object'} already exists (skipped)`);
                successCount++; // Count as success since it's already there
                errorCount--;
            } else {
                console.error(`❌ [${i + 1}/${statements.length}] Error:`, error.message);
                console.error('   Statement:', statement.substring(0, 100) + '...');
            }
        }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Migration Summary                                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('');

    if (errorCount === 0) {
        console.log('🎉 Migration completed successfully!');
    } else {
        console.log('⚠️  Migration completed with errors');
    }
    console.log('');

    process.exit(errorCount > 0 ? 1 : 0);
}

// Main execution
if (require.main === module) {
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.error('❌ Usage: node run_migration.js <migration_file>');
        console.error('📝 Example: node run_migration.js migrations/002_neobank_features.sql');
        process.exit(1);
    }

    // Initialize database connection first
    const { initializeDatabasePool } = require('../config/database');

    initializeDatabasePool()
        .then(() => runMigration(migrationFile))
        .catch(error => {
            console.error('');
            console.error('❌ FATAL ERROR:', error.message);
            console.error('');
            process.exit(1);
        });
}

module.exports = { runMigration };
