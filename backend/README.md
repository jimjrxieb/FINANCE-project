# SecureBank Payment API - Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-16.x-green.svg)](https://nodejs.org/)
[![PCI-DSS](https://img.shields.io/badge/PCI--DSS-VIOLATIONS-red.svg)](https://www.pcisecuritystandards.org/)
[![Security](https://img.shields.io/badge/Security-INTENTIONALLY%20INSECURE-critical.svg)](README.md)

> ⚠️ **WARNING**: This API contains **46+ intentional PCI-DSS violations** for educational purposes.
> **DO NOT DEPLOY TO PRODUCTION** | **FOR DEMONSTRATION ONLY** | **NO REAL CARD DATA**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Security Violations](#security-violations)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [BEFORE/AFTER Modes](#beforeafter-modes)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The SecureBank Payment API is a Node.js/Express REST API that **intentionally violates** PCI-DSS requirements to demonstrate:
- Common security misconfigurations in payment processing systems
- Differences between insecure (BEFORE) and secure (AFTER) implementations
- Security scanning tools (GP-Copilot, SAST, DAST)
- Cloud security engineering best practices (by showing worst practices)

### Key Features

- 🔴 **46+ PCI-DSS Violations** (BEFORE mode)
- 💳 **Full PAN/CVV/PIN Storage** (strictly forbidden by PCI-DSS)
- 🌐 **Public S3 Buckets** with sensitive data
- 🔓 **No Authentication** on sensitive endpoints
- 💉 **SQL Injection Vulnerabilities** (intentional)
- 📝 **Logs CVV/PIN** to CloudWatch
- 🔐 **Hardcoded Credentials** (BEFORE mode)
- ✅ **Secrets Manager Integration** (AFTER mode)
- 🧪 **LocalStack Support** for $0 local testing

### Use Cases

1. **Cloud Security Training** - FIS (Fidelity National Information Services)
2. **DevSecOps Education** - Learn secure vs insecure patterns
3. **GP-Copilot Demonstration** - Show vulnerability detection
4. **Security Scanning** - Test SAST/DAST/SCA tools

## Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────┐
│ Backend API (Node.js 16 + Express)             │
├─────────────────────────────────────────────────┤
│ Language:       JavaScript (ES6+)              │
│ Framework:      Express.js 4.x                 │
│ Database:       PostgreSQL 14                  │
│ Cache:          Redis 7                        │
│ AWS Services:   S3, Secrets Manager, CloudWatch│
│ Container:      Docker (Alpine Linux)          │
│ Orchestration:  Kubernetes (EKS)               │
└─────────────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── server.js                 # Main application entry point
├── config/
│   ├── database.js          # Database connection (async initialization)
│   └── secrets.js           # BEFORE/AFTER secrets management
├── controllers/
│   ├── auth.controller.js   # Authentication (insecure)
│   ├── merchant.controller.js
│   └── payment.controller.js # Payment processing (stores CVV/PIN)
├── middleware/
│   └── opa.middleware.js    # OPA policy enforcement (optional)
├── models/
│   ├── Merchant.js          # Merchant model (plaintext passwords)
│   └── Payment.js           # Payment model (stores CVV/PIN)
├── routes/
│   ├── auth.routes.js       # Auth endpoints
│   ├── merchant.routes.js   # Merchant endpoints
│   └── payment.routes.js    # Payment endpoints (no auth)
├── services/
│   └── aws.service.js       # AWS integration (S3, Secrets, CloudWatch)
├── Dockerfile               # Container image
├── package.json             # Node.js dependencies
├── PRD.md                   # Product Requirements Document
└── README.md               # This file
```

## Security Violations

### Critical Violations (BEFORE Mode)

#### 🔴 PCI-DSS Requirement 3.2.2: Storing CVV
```javascript
// ❌ STRICTLY FORBIDDEN by PCI-DSS
CREATE TABLE payments (
    cvv VARCHAR(4),  // ❌ NEVER store CVV!
    ...
);
```

#### 🔴 PCI-DSS Requirement 3.2.3: Storing PIN
```javascript
// ❌ STRICTLY FORBIDDEN by PCI-DSS
CREATE TABLE payments (
    pin VARCHAR(6),  // ❌ NEVER store PIN!
    ...
);
```

#### 🔴 PCI-DSS Requirement 3.4: No Encryption at Rest
```javascript
// ❌ Full PAN stored unencrypted
card_number VARCHAR(19)  // ❌ No encryption!
```

#### 🔴 PCI-DSS Requirement 8.2.1: Hardcoded Credentials
```javascript
// ❌ BEFORE mode
const pool = new Pool({
    user: 'postgres',      // ❌ Hardcoded!
    password: 'postgres',  // ❌ Default password!
});
```

#### 🔴 PCI-DSS Requirement 10.1: Logging Sensitive Data
```javascript
// ❌ Logging CVV/PIN to CloudWatch
console.log('Payment:', {
    card_number: payment.card_number,  // ❌
    cvv: payment.cvv,                  // ❌
    pin: payment.pin                   // ❌
});
```

#### 🔴 PCI-DSS Requirement 1.2.1: Public S3 Buckets
```javascript
// ❌ Public ACL on bucket with card data
ACL: 'public-read',  // ❌ Anyone can read!
```

### All Violations Summary

| Category | Count | Examples |
|----------|-------|----------|
| **Data Storage** | 12 | CVV/PIN storage, no encryption, full PAN |
| **Authentication** | 8 | No auth required, weak JWT, default creds |
| **Authorization** | 6 | No access control, IDOR vulnerabilities |
| **Logging** | 7 | CVV/PIN in logs, insufficient audit trail |
| **Network** | 5 | No segmentation, direct DB exposure |
| **Input Validation** | 8 | SQL injection, no sanitization |
| **Total** | **46+** | See [PRD.md](PRD.md) for complete list |

## Getting Started

### Prerequisites

- **Node.js 16+** (or Docker)
- **PostgreSQL 14** (or use Docker Compose)
- **Redis 7** (or use Docker Compose)
- **AWS CLI** (for real AWS deployment)
- **LocalStack** (for local AWS simulation)

### Quick Start (Docker Compose)

#### 1. Start in BEFORE Mode (Insecure)
```bash
# From project root
./scripts/start-local.sh BEFORE
```

This starts:
- Backend API on http://localhost:3000
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- LocalStack on localhost:4566

#### 2. Verify Backend is Running
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "running",
  "environment": "development",
  "database": "db",
  "version": "1.0.0-insecure"
}
```

#### 3. Test Payment Processing (Insecure)
```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "4532015112830366",
    "cvv": "123",
    "pin": "1234",
    "expiry_date": "12/25",
    "cardholder_name": "John Doe",
    "amount": 99.99,
    "merchant_id": 1
  }'
```

Response (with violations):
```json
{
  "transaction_id": 1,
  "status": "approved",
  "amount": 99.99,
  "card_last4": "0366",
  "receipt_url": "http://localhost:4566/securebank-payment-receipts-local/receipts/2025-10-08/1.json"
}
```

⚠️ **Violations in this request**:
- Full PAN stored in database
- CVV stored (FORBIDDEN)
- PIN stored (FORBIDDEN)
- Receipt uploaded to public S3 bucket
- Full card data logged to console/CloudWatch

### Manual Setup (Without Docker)

#### 1. Install Dependencies
```bash
cd backend
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

#### 3. Start PostgreSQL & Redis
```bash
# Using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

#### 4. Run Backend
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Health & Debug

#### GET /
Returns API information and available endpoints.

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "message": "SecureBank Payment API",
  "version": "1.0.0",
  "endpoints": [
    "/api/auth/login",
    "/api/auth/register",
    "/api/payments/process",
    "/api/payments/list",
    "/api/merchants/:id/transactions",
    "/health",
    "/debug/config"
  ]
}
```

#### GET /health
Health check endpoint (❌ exposes environment info).

```bash
curl http://localhost:3000/health
```

#### GET /debug/config
❌ **CRITICAL VIOLATION**: Exposes all environment variables including secrets.

```bash
curl http://localhost:3000/debug/config
```

Response (BEFORE mode):
```json
{
  "env": {
    "DATABASE_PASSWORD": "postgres",  // ❌ Exposed!
    "JWT_SECRET": "secret123",        // ❌ Exposed!
    "ENCRYPTION_KEY": "0123456...",   // ❌ Exposed!
    ...
  }
}
```

### Authentication

#### POST /api/auth/register
Register a new merchant account (❌ stores plaintext password).

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant1",
    "password": "password123",
    "email": "merchant@example.com"
  }'
```

❌ **Violations**:
- Plaintext password storage
- No password complexity requirements
- SQL injection vulnerability
- No unique constraint on username

#### POST /api/auth/login
Authenticate merchant (❌ weak JWT, no rate limiting).

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "merchant": {
    "id": 1,
    "username": "admin",
    "email": "admin@securebank.local"
  }
}
```

❌ **Violations**:
- Weak JWT secret (`secret123`)
- No rate limiting (brute force possible)
- Detailed error messages
- Token never expires

### Payments

#### POST /api/payments/process
Process a payment (❌ stores CVV/PIN, no authentication required).

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "4532015112830366",
    "cvv": "123",
    "pin": "1234",
    "expiry_date": "12/25",
    "cardholder_name": "John Doe",
    "amount": 99.99,
    "merchant_id": 1
  }'
```

Response:
```json
{
  "transaction_id": 1,
  "status": "approved",
  "amount": 99.99,
  "card_last4": "0366",
  "receipt_url": "http://localhost:4566/.../receipts/1.json",
  "timestamp": "2025-10-08T14:30:00.000Z"
}
```

❌ **Violations**:
- Stores CVV (FORBIDDEN by PCI-DSS 3.2.2)
- Stores PIN (FORBIDDEN by PCI-DSS 3.2.3)
- Stores full PAN unencrypted
- No authentication required
- Logs full card data to CloudWatch
- Uploads receipt with sensitive data to public S3 bucket
- No input validation
- No rate limiting

#### GET /api/payments/list
List all payments (❌ returns full card data, no auth).

```bash
curl http://localhost:3000/api/payments/list
```

Response:
```json
{
  "payments": [
    {
      "id": 1,
      "card_number": "4532015112830366",  // ❌ Full PAN!
      "cvv": "123",                       // ❌ CVV!
      "pin": "1234",                      // ❌ PIN!
      "cardholder_name": "John Doe",
      "amount": 99.99,
      "transaction_status": "approved",
      "created_at": "2025-10-08T14:30:00.000Z"
    }
  ]
}
```

❌ **Violations**:
- No authentication required
- Returns full PAN, CVV, PIN
- No pagination (loads all records)
- No authorization check

### Merchants

#### GET /api/merchants/:id/transactions
Get merchant's transactions (❌ no authorization check).

```bash
curl http://localhost:3000/api/merchants/1/transactions
```

Response:
```json
{
  "merchant_id": 1,
  "transactions": [
    {
      "id": 1,
      "card_number": "4532015112830366",  // ❌ Full card data!
      "cvv": "123",
      "amount": 99.99,
      ...
    }
  ]
}
```

❌ **Violations**:
- No authentication required
- No authorization check (any user can access any merchant's data)
- Returns full card data
- IDOR vulnerability

## BEFORE/AFTER Modes

The backend supports two security modes controlled by the `SECURITY_MODE` environment variable.

### BEFORE Mode (Default)

**Purpose**: Demonstrates violations for GP-Copilot scanning and security training.

**Configuration**:
```bash
export SECURITY_MODE=BEFORE
./scripts/start-local.sh BEFORE
```

**Behavior**:
- ❌ Uses hardcoded credentials from environment variables
- ❌ Falls back to default passwords (`postgres`/`postgres`)
- ❌ Weak JWT secret (`secret123`)
- ❌ Stores full PAN, CVV, PIN in database
- ❌ Logs credentials and card data to console
- ❌ Uploads receipts to public S3 buckets
- ❌ CloudWatch logs contain CVV/PIN
- ❌ No input validation
- ❌ SQL injection vulnerabilities enabled

**Startup Logs**:
```
═══════════════════════════════════════════════════════════
🔐 SECURITY MODE: BEFORE
🌍 ENVIRONMENT: LOCAL (LocalStack)
═══════════════════════════════════════════════════════════

❌ BEFORE MODE: Using hardcoded database credentials
❌ PCI-DSS Requirement 8.2.1 VIOLATION: Hardcoded credentials
❌ PCI-DSS Requirement 2.1 VIOLATION: Default passwords

📋 Database Configuration:
   Host:     db:5432
   Database: securebank
   Username: postgres
   Password: pos*** (❌ Using env variable)

⚠️  WARNING: This is the BEFORE state (insecure)
⚠️  In production, this would be a critical vulnerability!
```

### AFTER Mode (Secure)

**Purpose**: Demonstrates secure alternatives and PCI-DSS compliance.

**Configuration**:
```bash
export SECURITY_MODE=AFTER
./scripts/start-local.sh AFTER
```

**Behavior**:
- ✅ Reads credentials from AWS Secrets Manager
- ✅ No hardcoded fallbacks (fails securely if secrets unavailable)
- ✅ Strong JWT secret (32+ bytes entropy)
- ✅ Card tokenization (no CVV/PIN storage)
- ✅ Masked logging (no sensitive data)
- ✅ Private S3 buckets with encryption
- ✅ CloudWatch logs redacted
- ✅ Input validation with Joi
- ✅ Parameterized queries (no SQL injection)

**Startup Logs**:
```
═══════════════════════════════════════════════════════════
🔐 SECURITY MODE: AFTER
🌍 ENVIRONMENT: LOCAL (LocalStack)
═══════════════════════════════════════════════════════════

✅ AFTER MODE: Reading credentials from AWS Secrets Manager
✅ PCI-DSS Compliant: Secure secrets management

🔐 Fetching secret: securebank/db/password
   Endpoint: LocalStack (http://localstack:4566)

✅ Successfully retrieved credentials from Secrets Manager
📋 Database Configuration:
   Host:     db:5432
   Database: securebank
   Username: postgres
   Password: ******* (✅ Retrieved from Secrets Manager)

✅ This is the AFTER state (secure)
✅ No hardcoded credentials in code or environment!
```

### Switching Between Modes

#### During Development
```bash
# Stop current stack
docker-compose down

# Start in different mode
SECURITY_MODE=AFTER docker-compose up -d
```

#### Using Helper Script
```bash
# BEFORE mode
./scripts/start-local.sh BEFORE

# AFTER mode
./scripts/start-local.sh AFTER
```

## Configuration

### Environment Variables

#### Core Application
```bash
# Node.js
NODE_ENV=development              # development | production
PORT=3000                         # API port
LOG_SENSITIVE_DATA=true           # ❌ Enable in BEFORE, disable in AFTER

# Security Mode
SECURITY_MODE=BEFORE              # BEFORE | AFTER
```

#### Database (BEFORE mode only)
```bash
DATABASE_HOST=db                  # PostgreSQL host
DATABASE_PORT=5432                # PostgreSQL port
DATABASE_NAME=securebank          # Database name
DATABASE_USER=postgres            # ❌ Hardcoded username
DATABASE_PASSWORD=postgres        # ❌ Default password
```

#### Redis
```bash
REDIS_HOST=redis                  # Redis host
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=                   # ❌ Empty password
```

#### AWS (LocalStack for local, real AWS for production)
```bash
# LocalStack (local development)
USE_LOCALSTACK=true               # Enable LocalStack
AWS_ENDPOINT_URL=http://localstack:4566
AWS_REGION=us-east-1

# Real AWS (production)
# AWS_REGION=us-east-1
# IAM role via IRSA (no access keys needed)
```

#### S3 Buckets
```bash
S3_PAYMENT_BUCKET=securebank-payment-receipts-local   # Local
# S3_PAYMENT_BUCKET=securebank-payment-receipts-prod  # Production

S3_AUDIT_BUCKET=securebank-audit-logs-local
# S3_AUDIT_BUCKET=securebank-audit-logs-prod
```

#### Secrets (BEFORE mode only)
```bash
JWT_SECRET=secret123              # ❌ Weak secret
ADMIN_USERNAME=admin              # ❌ Default admin
ADMIN_PASSWORD=admin123           # ❌ Default password
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef  # ❌ Hardcoded key
```

### Dependencies

See [package.json](package.json) for complete list.

**Core Dependencies**:
- `express` - Web framework
- `pg` - PostgreSQL client
- `redis` - Redis client
- `aws-sdk` - AWS services integration
- `body-parser` - Request parsing
- `cors` - CORS middleware (❌ allows all origins)
- `morgan` - HTTP logging (❌ logs sensitive data)
- `dotenv` - Environment configuration

## Development

### Local Development Workflow

#### 1. Start Services
```bash
./scripts/start-local.sh BEFORE
```

#### 2. Watch Logs
```bash
docker-compose logs -f api
```

#### 3. Make Code Changes
Files are mounted as volumes, restart to apply:
```bash
docker-compose restart api
```

#### 4. Test Changes
```bash
curl http://localhost:3000/health
```

### Hot Reload (Optional)

Install nodemon for development:
```bash
npm install -g nodemon
npm run dev
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it securebank-db psql -U postgres -d securebank

# Example queries
SELECT * FROM merchants;
SELECT * FROM payments;  -- ❌ Will show full CVV/PIN!
```

### LocalStack Access

```bash
# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# View receipt (public in BEFORE mode)
curl http://localhost:4566/securebank-payment-receipts-local/receipts/test.json

# List secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets
```

## Testing

### Manual Testing

#### Test Payment Flow (BEFORE mode)
```bash
# 1. Register merchant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@example.com"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 3. Process payment (no auth required!)
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "card_number":"4532015112830366",
    "cvv":"123",
    "pin":"1234",
    "expiry_date":"12/25",
    "cardholder_name":"Test User",
    "amount":50.00,
    "merchant_id":1
  }'

# 4. Verify data stored (with violations)
docker exec -it securebank-db psql -U postgres -d securebank \
  -c "SELECT card_number, cvv, pin FROM payments LIMIT 1;"

# 5. Check public S3 receipt
curl http://localhost:4566/securebank-payment-receipts-local/receipts/$(date +%Y-%m-%d)/1.json
```

### Security Scanning

#### GP-Copilot Scan
```bash
# Scan backend code
gp-copilot scan backend/

# Expected: 46+ violations detected
```

#### OWASP ZAP (DAST)
```bash
# Run ZAP scan against API
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 -r zap-report.html
```

## Deployment

### Local (Docker Compose)
```bash
./scripts/start-local.sh BEFORE
```

### AWS EKS (Kubernetes)

#### 1. Build & Push Image
```bash
# Build
docker build -t securebank-backend:latest backend/

# Tag for ECR
docker tag securebank-backend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-backend:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-backend:latest
```

#### 2. Deploy to EKS
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/backend-deployment.yaml
kubectl apply -f infrastructure/k8s/backend-service.yaml

# Check status
kubectl get pods -l app=securebank-backend
kubectl logs -l app=securebank-backend -f
```

#### 3. Verify Deployment
```bash
# Get service endpoint
kubectl get svc securebank-backend

# Test health check
curl http://<EXTERNAL-IP>:3000/health
```

## Troubleshooting

### Backend Won't Start (AFTER mode)

**Error**:
```
❌ Failed to retrieve credentials from Secrets Manager
🛑 AFTER mode does not fall back to hardcoded credentials
```

**Solution**:
```bash
# 1. Check LocalStack is running
docker ps | grep localstack

# 2. Initialize LocalStack secrets
./scripts/init-localstack.sh

# 3. Verify secrets exist
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id securebank/db/password
```

### Database Connection Failed

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# 1. Check PostgreSQL is running
docker ps | grep securebank-db

# 2. Check database logs
docker logs securebank-db

# 3. Verify network connectivity
docker exec securebank-api ping db
```

### S3 Upload Failed (LocalStack)

**Error**:
```
NetworkingError: connect ECONNREFUSED 127.0.0.1:4566
```

**Solution**:
```bash
# 1. Check LocalStack is running
curl http://localhost:4566/_localstack/health

# 2. Re-initialize LocalStack
./scripts/init-localstack.sh

# 3. Verify S3 buckets exist
aws --endpoint-url=http://localhost:4566 s3 ls
```

### Logs Not Showing Violations

**Issue**: Logs don't show CVV/PIN data

**Solution**: Enable sensitive logging
```bash
export LOG_SENSITIVE_DATA=true
docker-compose restart api
```

## Contributing

This is an educational project demonstrating security violations. Contributions should:
1. **Add more violations** (if missing from PCI-DSS requirements)
2. **Improve documentation** of existing violations
3. **Enhance AFTER mode** with secure alternatives
4. **Fix bugs** (not security issues - those are intentional)

**Do NOT**:
- Remove intentional violations (breaks demo purpose)
- Add actual security hardening (defeats educational goal)
- Suggest production deployment (explicitly forbidden)

## License

MIT License - For educational use only.

## Disclaimer

⚠️ **EDUCATIONAL USE ONLY**

This software is provided for educational and demonstration purposes only. It contains intentional security vulnerabilities and should NEVER be deployed in production environments or used with real payment card data.

The authors and contributors assume no liability for misuse of this software.

---

**Version**: 1.0.0-BEFORE
**Last Updated**: 2025-10-08
**Status**: Development/Demo
**Support**: See [../README-SECUREBANK.md](../README-SECUREBANK.md)