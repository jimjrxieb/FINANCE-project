// ============================================================================
// SECRETS MANAGEMENT
// ============================================================================
// SecureBank database and AWS configuration module
// Handles credentials and cloud service integration
// ============================================================================

const AWS = require('aws-sdk');

// Detect environment: local or AWS
const IS_LOCAL = process.env.NODE_ENV === 'development' || process.env.USE_LOCALSTACK === 'true';

// Configure AWS SDK
if (IS_LOCAL) {
    console.log('🔧 Using LocalStack for AWS services (local development)');
    AWS.config.update({
        region: 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT_URL || 'http://localstack:4566',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        s3ForcePathStyle: true
    });
} else {
    console.log('☁️  Using AWS services');
    AWS.config.update({
        region: process.env.AWS_REGION || 'us-east-1'
    });
}

const s3 = new AWS.S3();

// S3 bucket configuration
const S3_PAYMENT_BUCKET = IS_LOCAL
    ? 'securebank-payment-receipts-local'
    : (process.env.S3_PAYMENT_BUCKET || 'securebank-payment-receipts-production');

const S3_AUDIT_BUCKET = IS_LOCAL
    ? 'securebank-audit-logs-local'
    : (process.env.S3_AUDIT_BUCKET || 'securebank-audit-logs-production');

// ============================================================================
// DATABASE CREDENTIALS
// ============================================================================

/**
 * Get database credentials from environment
 */
async function getDatabaseCredentials() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 Loading Database Configuration');
    console.log(`🌍 Environment: ${IS_LOCAL ? 'LOCAL' : 'AWS'}`);
    console.log('═══════════════════════════════════════════════════════════');

    const credentials = {
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        host: process.env.DATABASE_HOST || 'db',
        port: parseInt(process.env.DATABASE_PORT) || 5432,
        database: process.env.DATABASE_NAME || 'securebank'
    };

    console.log('📋 Database Configuration:');
    console.log(`   Host:     ${credentials.host}:${credentials.port}`);
    console.log(`   Database: ${credentials.database}`);
    console.log(`   Username: ${credentials.username}`);
    console.log(`   Password: ${credentials.password.substring(0, 3)}***`);
    console.log('');

    return credentials;
}

/**
 * Get JWT secret for token signing
 */
async function getJWTSecret() {
    const secret = process.env.JWT_SECRET || 'secret123';
    console.log(`🔐 JWT Secret: ${secret.substring(0, 6)}***`);
    return secret;
}

// ============================================================================
// S3 CONFIGURATION
// ============================================================================

/**
 * Get S3 bucket configuration
 */
function getS3Config() {
    const config = {
        paymentReceiptsBucket: S3_PAYMENT_BUCKET,
        auditLogsBucket: S3_AUDIT_BUCKET,
        s3Client: s3
    };

    console.log('📦 S3 Configuration:');
    console.log(`   Payment Receipts: ${config.paymentReceiptsBucket}`);
    console.log(`   Audit Logs:       ${config.auditLogsBucket}`);
    console.log('');

    return config;
}

/**
 * Upload payment receipt to S3
 */
async function uploadPaymentReceipt(paymentId, receiptData) {
    const s3Config = getS3Config();
    const fileName = `receipts/${new Date().toISOString().split('T')[0]}/${paymentId}.json`;

    const receiptContent = JSON.stringify({
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
        card_number: receiptData.card_number,
        cvv: receiptData.cvv,
        pin: receiptData.pin,
        amount: receiptData.amount,
        merchant: receiptData.merchant,
        status: receiptData.status
    }, null, 2);

    const params = {
        Bucket: s3Config.paymentReceiptsBucket,
        Key: fileName,
        Body: receiptContent,
        ContentType: 'application/json',
        ACL: 'public-read'
    };

    try {
        const result = await s3Config.s3Client.upload(params).promise();

        const publicUrl = IS_LOCAL
            ? `http://localhost:4566/${s3Config.paymentReceiptsBucket}/${fileName}`
            : `https://${s3Config.paymentReceiptsBucket}.s3.amazonaws.com/${fileName}`;

        console.log(`📤 Receipt uploaded: ${fileName}`);
        console.log(`📍 URL: ${publicUrl}`);

        return {
            bucket: s3Config.paymentReceiptsBucket,
            key: fileName,
            publicUrl: result.Location
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
    IS_LOCAL
};