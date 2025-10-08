// ============================================================================
// SECRETS MANAGEMENT - BEFORE/AFTER MODE
// ============================================================================
// This module demonstrates the difference between insecure (BEFORE) and
// secure (AFTER) secrets management for GP-Copilot demonstration.
//
// BEFORE MODE (SECURITY_MODE=BEFORE):
// - Uses hardcoded credentials from environment variables
// - Falls back to default passwords
// - Simulates production systems with hardcoded secrets
// - Intentional PCI-DSS violations for demo
//
// AFTER MODE (SECURITY_MODE=AFTER):
// - Reads credentials from AWS Secrets Manager
// - No hardcoded fallbacks (fails securely if secrets unavailable)
// - Uses LocalStack for local development
// - Demonstrates secure secrets management
// ============================================================================

const AWS = require('aws-sdk');

// Detect environment: local (LocalStack) or AWS
const IS_LOCAL = process.env.NODE_ENV === 'development' || process.env.USE_LOCALSTACK === 'true';
const SECURITY_MODE = process.env.SECURITY_MODE || 'BEFORE';

// Configure AWS SDK
if (IS_LOCAL) {
    // LocalStack configuration for local testing
    console.log('🔧 Using LocalStack for AWS services (local development)');
    AWS.config.update({
        region: 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT_URL || 'http://localstack:4566',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        s3ForcePathStyle: true  // Required for LocalStack
    });
} else {
    // Real AWS configuration (uses IAM role in EKS)
    console.log('☁️  Using real AWS services (production)');
    AWS.config.update({
        region: process.env.AWS_REGION || 'us-east-1'
        // IAM role provided by IRSA (no access keys needed)
    });
}

const secretsManager = new AWS.SecretsManager();
const s3 = new AWS.S3();

// S3 bucket names (different for local vs AWS)
const S3_PAYMENT_BUCKET = IS_LOCAL
    ? 'securebank-payment-receipts-local'
    : (process.env.S3_PAYMENT_BUCKET || 'securebank-payment-receipts-production');

const S3_AUDIT_BUCKET = IS_LOCAL
    ? 'securebank-audit-logs-local'
    : (process.env.S3_AUDIT_BUCKET || 'securebank-audit-logs-production');

// ============================================================================
// SECRETS RETRIEVAL
// ============================================================================

/**
 * Get database credentials based on SECURITY_MODE
 */
async function getDatabaseCredentials() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🔐 SECURITY MODE: ${SECURITY_MODE}`);
    console.log(`🌍 ENVIRONMENT: ${IS_LOCAL ? 'LOCAL (LocalStack)' : 'AWS (Production)'}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (SECURITY_MODE === 'BEFORE') {
        return getCredentialsBEFORE();
    } else if (SECURITY_MODE === 'AFTER') {
        return getCredentialsAFTER();
    } else {
        throw new Error(`Invalid SECURITY_MODE: ${SECURITY_MODE}. Must be 'BEFORE' or 'AFTER'`);
    }
}

/**
 * BEFORE MODE: Hardcoded credentials with fallback
 * ❌ PCI 8.2.1: Hardcoded credentials
 * ❌ PCI 2.1: Default passwords
 */
async function getCredentialsBEFORE() {
    console.log('');
    console.log('❌ BEFORE MODE: Using hardcoded database credentials');
    console.log('❌ PCI-DSS Requirement 8.2.1 VIOLATION: Hardcoded credentials');
    console.log('❌ PCI-DSS Requirement 2.1 VIOLATION: Default passwords');
    console.log('');

    // ❌ CRITICAL: Hardcoded credentials from environment
    const credentials = {
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',  // ❌ Default password!
        host: process.env.DATABASE_HOST || 'db',
        port: parseInt(process.env.DATABASE_PORT) || 5432,
        database: process.env.DATABASE_NAME || 'securebank'
    };

    // ❌ PCI 10.1: Logging credentials (even partial)
    console.log('📋 Database Configuration:');
    console.log(`   Host:     ${credentials.host}:${credentials.port}`);
    console.log(`   Database: ${credentials.database}`);
    console.log(`   Username: ${credentials.username}`);
    console.log(`   Password: ${credentials.password.substring(0, 3)}*** (❌ Using env variable)`);
    console.log('');
    console.log('⚠️  WARNING: This is the BEFORE state (insecure)');
    console.log('⚠️  In production, this would be a critical vulnerability!');
    console.log('');

    return credentials;
}

/**
 * AFTER MODE: Read credentials from AWS Secrets Manager
 * ✅ Secure secrets management
 * ✅ No hardcoded fallbacks
 */
async function getCredentialsAFTER() {
    console.log('');
    console.log('✅ AFTER MODE: Reading credentials from AWS Secrets Manager');
    console.log('✅ PCI-DSS Compliant: Secure secrets management');
    console.log('');

    try {
        const secretName = 'securebank/db/password';

        console.log(`🔐 Fetching secret: ${secretName}`);
        console.log(`   Endpoint: ${IS_LOCAL ? 'LocalStack (http://localstack:4566)' : 'AWS Secrets Manager'}`);
        console.log('');

        const data = await secretsManager.getSecretValue({
            SecretId: secretName
        }).promise();

        if (!data.SecretString) {
            throw new Error('Secret does not contain SecretString');
        }

        const secret = JSON.parse(data.SecretString);

        console.log('✅ Successfully retrieved credentials from Secrets Manager');
        console.log('📋 Database Configuration:');
        console.log(`   Host:     ${secret.host}:${secret.port}`);
        console.log(`   Database: ${secret.database}`);
        console.log(`   Username: ${secret.username}`);
        console.log(`   Password: ******* (✅ Retrieved from Secrets Manager)`);
        console.log('');
        console.log('✅ This is the AFTER state (secure)');
        console.log('✅ No hardcoded credentials in code or environment!');
        console.log('');

        return {
            username: secret.username,
            password: secret.password,
            host: secret.host,
            port: secret.port,
            database: secret.database
        };

    } catch (error) {
        console.error('');
        console.error('❌ ERROR: Failed to retrieve credentials from Secrets Manager');
        console.error(`   Error: ${error.message}`);
        console.error('');

        if (IS_LOCAL) {
            console.error('💡 TROUBLESHOOTING (Local Development):');
            console.error('   1. Is LocalStack running? Check: docker ps | grep localstack');
            console.error('   2. Are secrets initialized? Run: ./scripts/init-localstack.sh');
            console.error('   3. Check LocalStack logs: docker logs securebank-localstack');
            console.error('');
        }

        // ✅ AFTER mode: NO FALLBACK - Fail securely
        console.error('🛑 AFTER mode does not fall back to hardcoded credentials');
        console.error('🛑 Application will not start without valid secrets');
        console.error('');
        throw new Error('Failed to retrieve database credentials from Secrets Manager');
    }
}

/**
 * Get JWT secret based on SECURITY_MODE
 */
async function getJWTSecret() {
    if (SECURITY_MODE === 'BEFORE') {
        // ❌ BEFORE: Hardcoded weak secret
        const secret = process.env.JWT_SECRET || 'secret123';
        console.log(`❌ JWT Secret: Using hardcoded value (${secret.substring(0, 6)}***)`);
        return secret;
    } else {
        // ✅ AFTER: Read from Secrets Manager
        try {
            const data = await secretsManager.getSecretValue({
                SecretId: 'securebank/jwt/secret'
            }).promise();

            const secret = JSON.parse(data.SecretString);
            console.log('✅ JWT Secret: Retrieved from Secrets Manager');
            return secret.secret;

        } catch (error) {
            console.error('❌ Failed to retrieve JWT secret from Secrets Manager');
            throw new Error('Failed to retrieve JWT secret');
        }
    }
}

// ============================================================================
// S3 BUCKET CONFIGURATION
// ============================================================================

/**
 * Get S3 configuration based on SECURITY_MODE
 */
function getS3Config() {
    const config = {
        paymentReceiptsBucket: S3_PAYMENT_BUCKET,
        auditLogsBucket: S3_AUDIT_BUCKET,
        s3Client: s3,
        publicAccess: SECURITY_MODE === 'BEFORE'  // Public in BEFORE, private in AFTER
    };

    console.log('📦 S3 Configuration:');
    console.log(`   Payment Receipts: ${config.paymentReceiptsBucket}`);
    console.log(`   Audit Logs:       ${config.auditLogsBucket}`);
    console.log(`   Public Access:    ${config.publicAccess ? '❌ ENABLED (BEFORE mode)' : '✅ DISABLED (AFTER mode)'}`);
    console.log('');

    if (config.publicAccess) {
        console.log('⚠️  WARNING: S3 buckets are configured for PUBLIC access!');
        console.log('⚠️  PCI-DSS Requirement 1.2.1 VIOLATION: Public storage of cardholder data');
        console.log('');
    }

    return config;
}

/**
 * Upload payment receipt to S3 (respects SECURITY_MODE)
 */
async function uploadPaymentReceipt(paymentId, receiptData) {
    const s3Config = getS3Config();
    const fileName = `receipts/${new Date().toISOString().split('T')[0]}/${paymentId}.json`;

    // In BEFORE mode, receipt contains CVV/PIN
    // In AFTER mode, receipt should be tokenized (but we'll keep violations for demo)
    const receiptContent = JSON.stringify({
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
        card_number: SECURITY_MODE === 'BEFORE' ? receiptData.card_number : 'TOKENIZED',
        cvv: SECURITY_MODE === 'BEFORE' ? receiptData.cvv : 'REDACTED',
        pin: SECURITY_MODE === 'BEFORE' ? receiptData.pin : 'REDACTED',
        amount: receiptData.amount,
        merchant: receiptData.merchant,
        status: receiptData.status,
        security_mode: SECURITY_MODE
    }, null, 2);

    const params = {
        Bucket: s3Config.paymentReceiptsBucket,
        Key: fileName,
        Body: receiptContent,
        ContentType: 'application/json',
        // Public ACL only in BEFORE mode
        ...(s3Config.publicAccess && { ACL: 'public-read' })
    };

    try {
        const result = await s3Config.s3Client.upload(params).promise();

        if (s3Config.publicAccess) {
            const publicUrl = IS_LOCAL
                ? `http://localhost:4566/${s3Config.paymentReceiptsBucket}/${fileName}`
                : `https://${s3Config.paymentReceiptsBucket}.s3.amazonaws.com/${fileName}`;

            console.log(`📤 Receipt uploaded: ${fileName}`);
            console.log(`⚠️  PUBLIC URL: ${publicUrl}`);
            console.log('⚠️  WARNING: Receipt is publicly accessible!');
        } else {
            console.log(`📤 Receipt uploaded: ${fileName} (private)`);
        }

        return {
            bucket: s3Config.paymentReceiptsBucket,
            key: fileName,
            publicUrl: s3Config.publicAccess ? result.Location : null
        };

    } catch (error) {
        console.error(`❌ Failed to upload receipt: ${error.message}`);
        throw error;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    getDatabaseCredentials,
    getJWTSecret,
    getS3Config,
    uploadPaymentReceipt,
    SECURITY_MODE,
    IS_LOCAL
};

// ============================================================================
// SECURE REFERENCE (For Learning)
// ============================================================================
/*
✅ PRODUCTION-READY SECRETS MANAGEMENT:

1. Use AWS Secrets Manager for ALL secrets
2. Enable automatic secret rotation
3. Use IAM roles (IRSA) for authentication, not access keys
4. Never log credentials, even partially
5. Fail securely - no hardcoded fallbacks
6. Use separate secrets for dev/staging/prod
7. Encrypt secrets at rest with KMS
8. Use VPC endpoints for Secrets Manager access
9. Monitor secret access with CloudTrail
10. Implement secret versioning for rollback

Example IRSA setup in Kubernetes:
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: securebank-backend
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/SecureBankBackendRole
---
# IAM role trusts OIDC provider, grants SecretsManager access
# No AWS credentials needed in pods!
*/