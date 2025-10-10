// ============================================================================
// AWS SERVICE INTEGRATION - INTENTIONALLY INSECURE
// ============================================================================
// Integrates with real AWS services:
// - RDS (PostgreSQL) - Public database with CVV/PIN
// - S3 - Public buckets for payment receipts
// - Secrets Manager - With hardcoded fallback
// - CloudWatch - Logs sensitive data
//
// Intentional Violations:
// - Hardcoded credentials with fallback
// - S3 buckets are public
// - Logs full card data to CloudWatch
// - No encryption in transit (HTTP to AWS)
// - Overly permissive IAM policies
// ============================================================================

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// ❌ PCI 8.2.1: Hardcoded AWS credentials
// ❌ PCI 2.2.4: Credentials in code
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    // ❌ CRITICAL: Credentials should use IAM roles, not access keys!
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
});

const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const cloudwatch = new AWS.CloudWatchLogs();
const rds = new AWS.RDS();

// ❌ PCI 1.3.4: Bucket names in code
const PAYMENT_RECEIPTS_BUCKET = process.env.S3_PAYMENT_BUCKET || 'securebank-payment-receipts-production';
const AUDIT_LOGS_BUCKET = process.env.S3_AUDIT_BUCKET || 'securebank-audit-logs-production';
const CLOUDWATCH_LOG_GROUP = '/aws/securebank/application';

class AWSService {
    constructor() {
        this.s3 = s3;
        this.secretsManager = secretsManager;
        this.cloudwatch = cloudwatch;
        this.rds = rds;
    }

    // ========================================================================
    // S3 - PUBLIC BUCKET OPERATIONS
    // ========================================================================

    /**
     * Upload payment receipt to PUBLIC S3 bucket
     * ❌ PCI 3.2.1: Receipt contains full PAN
     * ❌ PCI 3.4: No encryption
     * ❌ PCI 1.2.1: Bucket is public
     */
    async uploadPaymentReceipt(paymentId, receiptData) {
        try {
            const fileName = `receipts/${new Date().toISOString().split('T')[0]}/${paymentId}.json`;

            // ❌ PCI 3.2.1: Receipt contains CVV, PIN, full PAN
            const receiptContent = JSON.stringify({
                payment_id: paymentId,
                timestamp: new Date().toISOString(),
                card_number: receiptData.card_number,      // ❌ Full PAN!
                cvv: receiptData.cvv,                      // ❌ CVV!
                pin: receiptData.pin,                      // ❌ PIN!
                amount: receiptData.amount,
                merchant: receiptData.merchant,
                status: receiptData.status
            }, null, 2);

            // ❌ PCI 10.1: Logging full card data
            console.log('📤 Uploading payment receipt to S3:', {
                bucket: PAYMENT_RECEIPTS_BUCKET,
                key: fileName,
                card: receiptData.card_number,
                cvv: receiptData.cvv,
                pin: receiptData.pin
            });

            const params = {
                Bucket: PAYMENT_RECEIPTS_BUCKET,
                Key: fileName,
                Body: receiptContent,
                ContentType: 'application/json',
                // ❌ PCI 1.2.1: Public read access!
                ACL: 'public-read',  // ❌ CRITICAL: Anyone can read!

                // ❌ PCI 3.4: No server-side encryption
                // ServerSideEncryption: 'aws:kms',
                // SSEKMSKeyId: 'arn:aws:kms:...'

                Metadata: {
                    'payment-id': paymentId.toString(),
                    'contains-pci-data': 'true',  // ❌ Advertising sensitive data!
                    'contains-cvv': 'true',       // ❌ RED FLAG!
                    'contains-pin': 'true'        // ❌ RED FLAG!
                }
            };

            const result = await this.s3.upload(params).promise();

            // ❌ PCI 1.2.1: Returns public URL
            const publicUrl = `https://${PAYMENT_RECEIPTS_BUCKET}.s3.amazonaws.com/${fileName}`;

            console.log('✅ Receipt uploaded successfully!');
            console.log(`⚠️  PUBLIC URL: ${publicUrl}`);
            console.log('⚠️  WARNING: Receipt contains CVV/PIN and is publicly accessible!');

            return {
                bucket: PAYMENT_RECEIPTS_BUCKET,
                key: fileName,
                url: publicUrl,  // ❌ Public URL to sensitive data!
                etag: result.ETag,
                location: result.Location
            };

        } catch (error) {
            console.error('❌ Error uploading receipt to S3:', error);
            // ❌ PCI 10.2.5: Error handling exposes AWS credentials
            console.error('AWS Config:', AWS.config.credentials);
            throw error;
        }
    }

    /**
     * Upload audit log to S3
     * ❌ PCI 10.5: Audit logs stored in public bucket
     */
    async uploadAuditLog(logData) {
        try {
            const fileName = `audit/${new Date().toISOString()}.json`;

            // ❌ PCI 10.1: Audit log contains sensitive data
            const auditEntry = JSON.stringify({
                timestamp: new Date().toISOString(),
                event: logData.event,
                user: logData.user,
                ip_address: logData.ip_address,
                // ❌ Logging sensitive data in audit logs
                data: logData.data,  // May contain CVV/PIN!
                result: logData.result
            }, null, 2);

            const params = {
                Bucket: AUDIT_LOGS_BUCKET,
                Key: fileName,
                Body: auditEntry,
                ContentType: 'application/json',
                ACL: 'public-read'  // ❌ Public audit logs!
            };

            await this.s3.upload(params).promise();
            console.log('📝 Audit log uploaded to S3:', fileName);

            return { bucket: AUDIT_LOGS_BUCKET, key: fileName };

        } catch (error) {
            console.error('❌ Error uploading audit log:', error);
            throw error;
        }
    }

    /**
     * List payment receipts from public bucket
     */
    async listPaymentReceipts(merchantId, date) {
        try {
            const prefix = date
                ? `receipts/${date}/`
                : 'receipts/';

            const params = {
                Bucket: PAYMENT_RECEIPTS_BUCKET,
                Prefix: prefix,
                MaxKeys: 1000  // ❌ No pagination, loads all at once
            };

            const result = await this.s3.listObjectsV2(params).promise();

            // ❌ Returns public URLs to all receipts
            const receipts = result.Contents.map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                // ❌ Public URL
                url: `https://${PAYMENT_RECEIPTS_BUCKET}.s3.amazonaws.com/${item.Key}`
            }));

            return receipts;

        } catch (error) {
            console.error('❌ Error listing receipts:', error);
            throw error;
        }
    }

    // ========================================================================
    // SECRETS MANAGER - WITH HARDCODED FALLBACK
    // ========================================================================

    /**
     * Get database credentials from Secrets Manager
     * ❌ PCI 8.2.1: Falls back to hardcoded credentials
     */
    async getDatabaseCredentials() {
        try {
            const secretName = 'securebank/db/password';

            console.log('🔐 Attempting to fetch secrets from AWS Secrets Manager...');

            const data = await this.secretsManager.getSecretValue({
                SecretId: secretName
            }).promise();

            if (data.SecretString) {
                const secret = JSON.parse(data.SecretString);
                console.log('✅ Successfully retrieved credentials from Secrets Manager');

                // ❌ PCI 10.1: Logging credentials!
                console.log('Credentials:', {
                    username: secret.username,
                    password: secret.password.substring(0, 3) + '***',  // Still logging partial password!
                    host: secret.host
                });

                return secret;
            }

        } catch (error) {
            // ❌ PCI 8.2.1: CRITICAL - Falls back to hardcoded credentials!
            console.error('⚠️  Failed to retrieve secrets from AWS:', error.message);
            console.warn('⚠️  WARNING: Falling back to hardcoded credentials!');

            // ❌ CRITICAL: Hardcoded fallback
            const hardcodedCreds = {
                username: process.env.DB_USER || 'admin',
                password: process.env.DB_PASSWORD || 'supersecret',
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                dbname: 'securebank'
            };

            // ❌ Logging hardcoded credentials
            console.log('Using hardcoded credentials:', hardcodedCreds);

            return hardcodedCreds;
        }
    }

    /**
     * Get JWT secret from Secrets Manager
     * ❌ PCI 8.2.1: Weak secret with hardcoded fallback
     */
    async getJWTSecret() {
        try {
            const data = await this.secretsManager.getSecretValue({
                SecretId: 'securebank/jwt/secret'
            }).promise();

            return data.SecretString;

        } catch (error) {
            console.warn('⚠️  Failed to get JWT secret, using hardcoded value');
            // ❌ CRITICAL: Hardcoded weak secret
            return process.env.JWT_SECRET || 'weak-secret-change-in-production';
        }
    }

    // ========================================================================
    // CLOUDWATCH - LOGGING SENSITIVE DATA
    // ========================================================================

    /**
     * Log payment event to CloudWatch
     * ❌ PCI 10.1: Logs CVV/PIN to CloudWatch
     */
    async logPaymentEvent(eventType, paymentData) {
        try {
            const logStreamName = `payment-events-${new Date().toISOString().split('T')[0]}`;

            // Create log stream if it doesn't exist
            try {
                await this.cloudwatch.createLogStream({
                    logGroupName: CLOUDWATCH_LOG_GROUP,
                    logStreamName: logStreamName
                }).promise();
            } catch (e) {
                // Stream might already exist, ignore
            }

            // ❌ PCI 10.1: CRITICAL - Logging full card data including CVV/PIN
            const logEvent = {
                timestamp: Date.now(),
                event_type: eventType,
                payment_id: paymentData.id,
                merchant_id: paymentData.merchant_id,
                card_number: paymentData.card_number,      // ❌ Full PAN!
                cvv: paymentData.cvv,                      // ❌ CVV!
                pin: paymentData.pin,                      // ❌ PIN!
                amount: paymentData.amount,
                status: paymentData.transaction_status
            };

            const params = {
                logGroupName: CLOUDWATCH_LOG_GROUP,
                logStreamName: logStreamName,
                logEvents: [{
                    timestamp: Date.now(),
                    message: JSON.stringify(logEvent)  // ❌ Full PCI data in logs!
                }]
            };

            await this.cloudwatch.putLogEvents(params).promise();

            console.log('📊 Payment event logged to CloudWatch:', eventType);
            console.log('⚠️  WARNING: Log contains CVV/PIN in plaintext!');

        } catch (error) {
            console.error('❌ Error logging to CloudWatch:', error);
            // ❌ Not failing on logging error, continues processing
        }
    }

    /**
     * Log security event to CloudWatch
     * ❌ PCI 10.2: Insufficient security event logging
     */
    async logSecurityEvent(eventType, details) {
        try {
            const logStreamName = 'security-events';

            const logEvent = {
                timestamp: Date.now(),
                event_type: eventType,
                details: details,
                // ❌ PCI 10.2.5: Missing required audit fields
                // user_id: details.user_id,
                // ip_address: details.ip_address,
                // action: details.action,
                // result: details.result
            };

            console.log('🔒 Security event:', logEvent);

            // ❌ PCI 10.7: No alerting on security events

        } catch (error) {
            console.error('❌ Error logging security event:', error);
        }
    }

    // ========================================================================
    // RDS UTILITIES
    // ========================================================================

    /**
     * Check RDS encryption status
     * ❌ Will show database is NOT encrypted
     */
    async checkDatabaseEncryption() {
        try {
            const dbInstanceId = process.env.RDS_INSTANCE_ID || 'securebank-payment-db';

            const params = {
                DBInstanceIdentifier: dbInstanceId
            };

            const result = await this.rds.describeDBInstances(params).promise();
            const dbInstance = result.DBInstances[0];

            console.log('🔍 Database Encryption Status:');
            console.log(`   Storage Encrypted: ${dbInstance.StorageEncrypted}`);  // ❌ false
            console.log(`   Publicly Accessible: ${dbInstance.PubliclyAccessible}`);  // ❌ true
            console.log(`   Endpoint: ${dbInstance.Endpoint.Address}`);

            // ❌ PCI 3.4: Database is NOT encrypted!
            if (!dbInstance.StorageEncrypted) {
                console.error('❌ CRITICAL: Database is NOT encrypted at rest!');
                console.error('❌ PCI-DSS Requirement 3.4 VIOLATION!');
            }

            // ❌ PCI 2.3: Database is publicly accessible!
            if (dbInstance.PubliclyAccessible) {
                console.error('❌ CRITICAL: Database is publicly accessible from internet!');
                console.error('❌ PCI-DSS Requirement 2.3 VIOLATION!');
            }

            return {
                encrypted: dbInstance.StorageEncrypted,
                publiclyAccessible: dbInstance.PubliclyAccessible,
                endpoint: dbInstance.Endpoint.Address,
                kmsKeyId: dbInstance.KmsKeyId
            };

        } catch (error) {
            console.error('❌ Error checking database encryption:', error);
            throw error;
        }
    }

    /**
     * Get public S3 bucket URLs
     * ❌ Returns public URLs to buckets containing PCI data
     */
    getBucketUrls() {
        return {
            paymentReceipts: `https://${PAYMENT_RECEIPTS_BUCKET}.s3.amazonaws.com/`,
            auditLogs: `https://${AUDIT_LOGS_BUCKET}.s3.amazonaws.com/`,
            warning: 'These buckets are PUBLIC and contain CVV/PIN data!'
        };
    }
}

// Export singleton instance
module.exports = new AWSService();

// ============================================================================
// SECURE REFERENCE IMPLEMENTATION (For Learning)
// ============================================================================
/*
const AWS = require('aws-sdk');

// ✅ Use IAM roles, not access keys
// AWS SDK automatically uses EC2/ECS instance role
AWS.config.update({
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const kms = new AWS.KMS();

class SecureAWSService {

    // ✅ S3 with encryption and private access
    async uploadPaymentReceipt(paymentId, receiptData) {
        // ✅ Tokenize card number before storage
        const tokenizedReceipt = {
            payment_id: paymentId,
            card_token: receiptData.card_token,  // ✅ Token, not PAN
            last4: receiptData.last4,            // ✅ Only last 4 digits
            amount: receiptData.amount,
            // ✅ No CVV, no PIN!
        };

        const params = {
            Bucket: PAYMENT_RECEIPTS_BUCKET,
            Key: `receipts/${paymentId}.json`,
            Body: JSON.stringify(tokenizedReceipt),
            ServerSideEncryption: 'aws:kms',     // ✅ KMS encryption
            SSEKMSKeyId: KMS_KEY_ARN,
            // ✅ Private - no public access
        };

        return await s3.upload(params).promise();
    }

    // ✅ Secrets Manager with rotation
    async getDatabaseCredentials() {
        const data = await secretsManager.getSecretValue({
            SecretId: 'securebank/db/password'
        }).promise();

        // ✅ No fallback - fail if secrets unavailable
        if (!data.SecretString) {
            throw new Error('Failed to retrieve database credentials');
        }

        return JSON.parse(data.SecretString);
    }

    // ✅ CloudWatch logging without sensitive data
    async logPaymentEvent(eventType, paymentData) {
        const logEvent = {
            timestamp: Date.now(),
            event_type: eventType,
            payment_id: paymentData.id,
            card_token: paymentData.card_token,  // ✅ Token only
            last4: paymentData.last4,
            amount: paymentData.amount,
            // ✅ No CVV, no PIN, no full PAN
        };

        // Log to CloudWatch
    }
}
*/