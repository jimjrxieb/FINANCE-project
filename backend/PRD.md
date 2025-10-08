# SecureBank Payment API - Product Requirements Document

## Executive Summary

**Product**: SecureBank Payment Platform - Backend API
**Purpose**: Educational demonstration of PCI-DSS violations for Cloud Security Engineering training
**Target Audience**: FIS (Fidelity National Information Services), Cloud Security Engineers, DevSecOps teams
**Version**: 1.0.0-BEFORE (Vulnerable State)
**Status**: Development/Demo

## 1. Product Overview

### 1.1 Problem Statement
Cloud security engineers and DevSecOps teams need realistic, production-like examples of PCI-DSS violations to:
- Understand common security misconfigurations in payment processing systems
- Practice vulnerability detection and remediation
- Demonstrate security scanning tools (GP-Copilot, SAST, DAST)
- Learn the difference between insecure (BEFORE) and secure (AFTER) implementations

### 1.2 Solution
A Node.js/Express REST API that intentionally violates 46+ PCI-DSS requirements across:
- Payment processing (CVV/PIN storage)
- Authentication and authorization
- Data encryption
- Logging and monitoring
- API security
- Secrets management

The API operates in two modes:
- **BEFORE Mode**: Contains all violations (default, for demos)
- **AFTER Mode**: Demonstrates secure alternatives (for training)

## 2. Technical Requirements

### 2.1 Core Functionality

#### Payment Processing
- **Process Payment** (`POST /api/payments/process`)
  - Accept card number, CVV, PIN, amount, merchant ID
  - ❌ Store full PAN, CVV, PIN in PostgreSQL (violation)
  - ❌ Log full card data to console/CloudWatch (violation)
  - ❌ Upload receipt with sensitive data to public S3 bucket (violation)
  - Return transaction ID and status

- **List Payments** (`GET /api/payments/list`)
  - ❌ Return all payments including full card data (violation)
  - ❌ No authentication required (violation)
  - Support filtering by merchant ID, date range

#### Authentication (Insecure)
- **Register** (`POST /api/auth/register`)
  - Create merchant account
  - ❌ Store plaintext password (violation)
  - ❌ No password complexity requirements (violation)
  - ❌ SQL injection vulnerability (violation)

- **Login** (`POST /api/auth/login`)
  - Authenticate with username/password
  - ❌ Weak JWT secret (violation)
  - ❌ No rate limiting (violation)
  - ❌ Detailed error messages (violation)

#### Merchant Management
- **Get Transactions** (`GET /api/merchants/:id/transactions`)
  - ❌ No authorization check (violation)
  - ❌ Accessible by any user (violation)
  - Return merchant's payment history with full card data

### 2.2 Data Storage

#### PostgreSQL Database Schema

**merchants** table:
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR) ❌ No unique constraint
- password (VARCHAR) ❌ Plaintext storage
- email (VARCHAR)
- api_key (VARCHAR) ❌ Predictable format
- created_at (TIMESTAMP)
```

**payments** table:
```sql
- id (SERIAL PRIMARY KEY)
- merchant_id (INTEGER)
- card_number (VARCHAR) ❌ Full PAN unencrypted
- cvv (VARCHAR) ❌ FORBIDDEN by PCI-DSS 3.2.2
- pin (VARCHAR) ❌ FORBIDDEN by PCI-DSS 3.2.3
- expiry_date (VARCHAR)
- cardholder_name (VARCHAR)
- amount (DECIMAL)
- transaction_status (VARCHAR)
- created_at (TIMESTAMP)
```

**sessions** table:
```sql
- id (SERIAL PRIMARY KEY)
- merchant_id (INTEGER)
- session_token (VARCHAR)
- card_data (TEXT) ❌ Stores card data in sessions
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
```

**audit_logs** table:
```sql
- id (SERIAL PRIMARY KEY)
- merchant_id (INTEGER)
- action (VARCHAR)
- details (TEXT) ❌ May contain sensitive data
- created_at (TIMESTAMP) ❌ Tamperable (regular table)
```

### 2.3 AWS Integration

#### S3 (Public Buckets)
- **Payment Receipts Bucket**: `securebank-payment-receipts-{env}`
  - ❌ Public-read ACL
  - ❌ No encryption at rest
  - Stores JSON receipts with CVV/PIN
  - Metadata advertises PCI data presence

- **Audit Logs Bucket**: `securebank-audit-logs-{env}`
  - ❌ Public-read ACL
  - Contains security events with sensitive data

#### Secrets Manager (with Hardcoded Fallback)
- **Database Credentials**: `securebank/db/password`
  - ❌ BEFORE mode: Falls back to hardcoded credentials
  - ✅ AFTER mode: Reads from Secrets Manager (no fallback)

- **JWT Secret**: `securebank/jwt/secret`
  - ❌ BEFORE mode: Uses weak hardcoded secret (`secret123`)
  - ✅ AFTER mode: Strong secret from Secrets Manager

#### CloudWatch Logs
- **Log Group**: `/aws/securebank/application`
- **Payment Events Stream**: `payment-events-{date}`
  - ❌ Logs full card data including CVV/PIN
  - ❌ No data masking/tokenization

- **Security Events Stream**: `security-events`
  - ❌ Missing required audit fields
  - ❌ No alerting configured

### 2.4 Security Modes

#### BEFORE Mode (Default)
Environment: `SECURITY_MODE=BEFORE`

**Violations**:
1. Hardcoded database credentials from environment variables
2. Default passwords (`postgres`/`postgres`)
3. Weak JWT secret (`secret123`)
4. Full PAN/CVV/PIN storage in database
5. Plaintext password storage
6. Public S3 buckets with sensitive data
7. CloudWatch logs contain CVV/PIN
8. No input validation
9. SQL injection vulnerabilities
10. No authentication on sensitive endpoints
11. No rate limiting
12. Detailed error messages
13. CORS allows all origins
14. No security headers
15. Debug endpoints exposed (`/debug/config`)

**Configuration**:
```javascript
getDatabaseCredentials() {
  return {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    host: 'db',
    port: 5432
  };
}
```

#### AFTER Mode (Secure)
Environment: `SECURITY_MODE=AFTER`

**Improvements**:
1. Credentials from AWS Secrets Manager (no fallback)
2. Strong, rotated passwords
3. Strong JWT secret (32+ bytes entropy)
4. Card tokenization (no CVV/PIN storage)
5. Bcrypt password hashing
6. Private S3 buckets with KMS encryption
7. Masked logging (no sensitive data)
8. Input validation with Joi
9. Parameterized queries (no SQL injection)
10. JWT authentication required
11. Rate limiting with Redis
12. Generic error messages
13. CORS whitelist
14. Security headers (HSTS, CSP, etc.)
15. Debug endpoints removed

**Configuration**:
```javascript
async getDatabaseCredentials() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'securebank/db/password'
  }).promise();

  if (!data.SecretString) {
    throw new Error('Secrets unavailable'); // Fail securely
  }

  return JSON.parse(data.SecretString);
}
```

### 2.5 API Endpoints

#### Health & Debug
- `GET /` - API information (lists endpoints)
- `GET /health` - Health check (❌ exposes env info)
- `GET /debug/config` - ❌ Debug endpoint (exposes all env variables)

#### Authentication
- `POST /api/auth/register` - Create merchant account
- `POST /api/auth/login` - Authenticate merchant

#### Payments
- `POST /api/payments/process` - Process payment (❌ stores CVV/PIN)
- `GET /api/payments/list` - List all payments (❌ no auth)

#### Merchants
- `GET /api/merchants/:id/transactions` - Get merchant transactions (❌ no authz)

## 3. PCI-DSS Violations by Category

### 3.1 Build & Maintain Secure Network (Requirements 1-2)
- **PCI 1.2.1**: No network segmentation (all services on same network)
- **PCI 1.3.2**: Direct internet exposure
- **PCI 2.1**: Default credentials for all services
- **PCI 2.2**: Unnecessary services enabled (debug endpoints)

### 3.2 Protect Cardholder Data (Requirements 3-4)
- **PCI 3.2.1**: Storing full PAN unencrypted
- **PCI 3.2.2**: Storing CVV (STRICTLY FORBIDDEN)
- **PCI 3.2.3**: Storing PIN (STRICTLY FORBIDDEN)
- **PCI 3.4**: No encryption at rest (database, S3)
- **PCI 4.1**: No TLS for database connections

### 3.3 Maintain Vulnerability Management (Requirements 5-6)
- **PCI 6.5.1**: SQL injection vulnerabilities
- **PCI 6.5.5**: Improper error handling (stack traces)
- **PCI 6.5.9**: CSRF protection disabled
- **PCI 6.5.10**: No security headers

### 3.4 Implement Strong Access Control (Requirements 7-9)
- **PCI 7.1**: No authentication required
- **PCI 8.1**: No unique user IDs (duplicate usernames allowed)
- **PCI 8.2.1**: Hardcoded credentials
- **PCI 8.2.3**: Plaintext password storage

### 3.5 Regularly Monitor & Test Networks (Requirements 10-11)
- **PCI 10.1**: Logs contain sensitive data (CVV/PIN)
- **PCI 10.2**: Insufficient audit logging
- **PCI 10.5**: Logs are tamperable (not immutable)

### 3.6 Maintain Information Security Policy (Requirement 12)
- No security documentation (intentional for demo)

**Total Backend Violations**: 46+

## 4. Non-Functional Requirements

### 4.1 Performance
- Handle 100+ concurrent payment requests
- Database connection pooling (max 100 connections)
- Response time < 500ms for payment processing

### 4.2 Scalability
- Stateless API (session data in Redis)
- Horizontal scaling ready (multiple instances)
- LocalStack for local development ($0 cost)

### 4.3 Observability
- Console logging (❌ includes sensitive data)
- CloudWatch integration (❌ logs CVV/PIN)
- Prometheus metrics exposure (optional)

### 4.4 Development Experience
- Docker Compose for local development
- Hot reload with nodemon (not in production)
- Environment-based configuration
- BEFORE/AFTER mode toggle

## 5. Constraints & Assumptions

### 5.1 Constraints
- **Educational Purpose Only**: Never deploy to production
- **Intentional Violations**: All security issues are by design
- **No Real Card Data**: Use test card numbers only
- **No Compliance**: Explicitly violates PCI-DSS

### 5.2 Assumptions
- Users understand this is for training purposes
- Deployment limited to isolated environments
- Test data only (no real customer information)
- LocalStack for local AWS simulation

## 6. Success Criteria

### 6.1 Functional Success
- ✅ All API endpoints functional
- ✅ Payments stored with full card data
- ✅ S3 receipts uploaded successfully
- ✅ Secrets Manager integration works
- ✅ BEFORE/AFTER modes switchable

### 6.2 Educational Success
- ✅ GP-Copilot detects 46+ violations
- ✅ Security scanners flag critical issues
- ✅ Demonstrates real-world misconfigurations
- ✅ Clear before/after comparison

### 6.3 Demo Success
- ✅ Runs locally with LocalStack ($0 cost)
- ✅ Deploys to AWS EKS successfully
- ✅ FIS audience understands violations
- ✅ Can revert to BEFORE state for repeated demos

## 7. Out of Scope

### 7.1 Not Included
- ❌ Actual payment gateway integration (Stripe, PayPal)
- ❌ PCI-DSS compliance certification
- ❌ Production deployment
- ❌ Real security hardening (intentionally insecure)
- ❌ GDPR compliance
- ❌ Fraud detection
- ❌ Chargeback handling
- ❌ Multi-currency support

### 7.2 Future Enhancements (Post-Demo)
- Additional API endpoints (refunds, disputes)
- GraphQL alternative API
- gRPC service mesh integration
- Service mesh observability (Istio)
- Chaos engineering tests

## 8. Dependencies

### 8.1 Runtime Dependencies
- Node.js 16+ (Alpine Linux)
- Express.js (web framework)
- PostgreSQL 14 (database)
- Redis 7 (session storage)
- AWS SDK (S3, Secrets Manager, CloudWatch)

### 8.2 Infrastructure Dependencies
- Docker & Docker Compose
- LocalStack (mock AWS for local dev)
- AWS EKS (production deployment)
- AWS RDS PostgreSQL (production database)
- AWS S3 (receipt storage)
- AWS Secrets Manager (credential management)

### 8.3 Security Tools
- OPA (policy enforcement - audit mode)
- Vault (secrets management - dev mode)
- GP-Copilot (vulnerability scanning)
- Prometheus (metrics - optional)
- Grafana (dashboards - optional)

## 9. Deployment Architecture

### 9.1 Local Development
```
┌─────────────────────────────────────────────────────┐
│ Docker Compose                                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Backend │──│PostgreSQL│  │ LocalStack       │  │
│  │  API    │  │   DB     │  │ (Mock AWS)       │  │
│  │ Node.js │  │          │  │ - S3             │  │
│  │         │  └──────────┘  │ - Secrets Mgr    │  │
│  │         │                │ - CloudWatch     │  │
│  └─────────┘                └──────────────────┘  │
│       │                                            │
│       └──────────┐                                 │
│                  ▼                                 │
│            ┌──────────┐                            │
│            │  Redis   │                            │
│            │  Cache   │                            │
│            └──────────┘                            │
└─────────────────────────────────────────────────────┘
```

### 9.2 AWS Production
```
┌─────────────────────────────────────────────────────┐
│ AWS EKS Cluster                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ Kubernetes Pod (securebank-backend)         │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ Container: backend-api               │   │   │
│  │  │ Image: ECR/securebank-backend:latest │   │   │
│  │  │ ServiceAccount: securebank-backend   │   │   │
│  │  │ IAM Role: (IRSA for AWS access)      │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                │                                    │
│                ├──> AWS RDS PostgreSQL (public!)   │
│                ├──> AWS S3 (public buckets!)       │
│                ├──> AWS Secrets Manager            │
│                └──> AWS CloudWatch Logs            │
└─────────────────────────────────────────────────────┘
```

## 10. Testing Strategy

### 10.1 Local Testing (Tonight)
1. Start in BEFORE mode: `./scripts/start-local.sh BEFORE`
2. Test payment processing with full card data
3. Verify S3 receipts are public
4. Check CloudWatch logs contain CVV/PIN
5. Test SQL injection vulnerabilities
6. Verify no authentication required

### 10.2 AFTER Mode Testing
1. Start in AFTER mode: `./scripts/start-local.sh AFTER`
2. Verify Secrets Manager integration
3. Test with tokenized card data
4. Confirm S3 buckets are private
5. Check logs are masked
6. Verify authentication required

### 10.3 AWS Deployment Testing (Tomorrow)
1. Deploy to EKS with BEFORE mode
2. Verify violations on real AWS
3. Run GP-Copilot security scan
4. Deploy to EKS with AFTER mode
5. Verify improvements
6. Document findings

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Accidental production use | Critical | Clear warnings, demo-only environment |
| Real card data exposure | Critical | Use test cards only, isolated network |
| Compliance audit failure | High | Clearly marked as educational demo |
| Cost overrun (AWS) | Medium | Start with LocalStack, monitor AWS costs |
| Violation count too low | Low | 46+ violations should be sufficient |

## 12. Timeline

- **Phase 1** (Complete): Backend implementation with violations
- **Phase 2** (Complete): AWS integration (S3, Secrets Manager, CloudWatch)
- **Phase 3** (Complete): BEFORE/AFTER mode implementation
- **Phase 4** (Tonight): Local testing with LocalStack
- **Phase 5** (Tomorrow): AWS EKS deployment
- **Phase 6** (Future): FIS demo presentation

## 13. Appendix

### 13.1 Test Card Numbers
```
Valid (for testing only):
- 4532015112830366 (Visa)
- 5425233430109903 (Mastercard)
- 378282246310005 (Amex)

CVV: Any 3-4 digits
PIN: Any 4-6 digits
Expiry: Any future date
```

### 13.2 Environment Variables
See [README.md](README.md) for complete list

### 13.3 API Documentation
See [README.md](README.md) for endpoint documentation

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Status**: Active Development
**Owner**: Cloud Security Engineering Team