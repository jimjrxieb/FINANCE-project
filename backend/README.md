# SecureBank Payment API - Backend

> Enterprise payment processing platform built on Node.js, PostgreSQL, and AWS

## Overview

The SecureBank Payment API is a cloud-native REST API for processing merchant payment transactions. Built with Node.js and Express, it provides real-time payment processing, transaction storage, and merchant account management.

### Features

- 💳 Real-time credit/debit card processing
- 📊 Transaction history and reporting
- 🔐 Merchant authentication and API keys
- 📝 Automated receipt generation
- ☁️ AWS cloud integration (S3, Secrets Manager, CloudWatch)
- 🚀 Kubernetes-ready (EKS deployment)
- 🐳 Docker containerized
- 📈 Prometheus metrics and Grafana dashboards

### Technology Stack

- **Runtime**: Node.js 16 (Alpine Linux)
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 14
- **Cache**: Redis 7
- **Cloud**: AWS (S3, Secrets Manager, CloudWatch, EKS)
- **Container**: Docker
- **Orchestration**: Kubernetes

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 16+ (for local development)
- AWS CLI (for production deployment)

### Start Services

```bash
# From project root
./scripts/start-local.sh
```

This starts:
- Backend API on http://localhost:3000
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- LocalStack (AWS mock) on localhost:4566

### Verify Installation

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "running",
  "environment": "development",
  "database": "db",
  "version": "1.0.0"
}
```

## API Documentation

### Health Endpoints

#### GET /
Returns API information and available endpoints.

```bash
curl http://localhost:3000/
```

#### GET /health
System health check.

```bash
curl http://localhost:3000/health
```

#### GET /debug/config
Configuration debugging endpoint (development only).

```bash
curl http://localhost:3000/debug/config
```

### Authentication

#### POST /api/auth/register
Create a new merchant account.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant1",
    "password": "SecurePass123!",
    "email": "merchant@example.com"
  }'
```

Response:
```json
{
  "merchant_id": 1,
  "username": "merchant1",
  "api_key": "sk_live_xxxxxxxxxxxxx",
  "created_at": "2025-10-08T14:30:00.000Z"
}
```

#### POST /api/auth/login
Authenticate merchant and receive JWT token.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant1",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_jwt_token_here",
  "merchant": {
    "id": 1,
    "username": "merchant1",
    "email": "merchant@example.com"
  }
}
```

### Payments

#### POST /api/payments/process
Process a credit/debit card payment.

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
  "receipt_url": "https://s3.amazonaws.com/.../receipts/1.json",
  "timestamp": "2025-10-08T14:30:00.000Z"
}
```

#### GET /api/payments/list
Retrieve payment transaction history.

```bash
curl http://localhost:3000/api/payments/list
```

Optional query parameters:
- `merchant_id` - Filter by merchant
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `limit` - Number of results (default: 100)

### Merchants

#### GET /api/merchants/:id/transactions
Get transaction history for a specific merchant.

```bash
curl http://localhost:3000/api/merchants/1/transactions
```

## Architecture

### Directory Structure

```
backend/
├── server.js                    # Application entry point
├── config/
│   ├── database.js             # PostgreSQL connection pool
│   └── secrets.js              # AWS Secrets Manager integration
├── controllers/
│   ├── auth.controller.js      # Authentication logic
│   ├── merchant.controller.js  # Merchant management
│   └── payment.controller.js   # Payment processing
├── middleware/
│   └── opa.middleware.js       # Policy enforcement
├── models/
│   ├── Merchant.js             # Merchant data model
│   └── Payment.js              # Payment data model
├── routes/
│   ├── auth.routes.js          # Auth endpoints
│   ├── merchant.routes.js      # Merchant endpoints
│   └── payment.routes.js       # Payment endpoints
├── services/
│   └── aws.service.js          # AWS service integration
├── Dockerfile                   # Container image
├── package.json                # Node.js dependencies
├── PRD.md                      # Product requirements
└── README.md                   # This file
```

### Database Schema

#### merchants
```sql
CREATE TABLE merchants (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(255),
    email VARCHAR(100),
    api_key VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### payments
```sql
CREATE TABLE payments (
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
);
```

#### sessions
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id),
    session_token VARCHAR(255),
    card_data TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER,
    action VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

### Environment Variables

#### Application Settings
```bash
NODE_ENV=development              # development | production
PORT=3000                         # API server port
SECURITY_MODE=BEFORE              # BEFORE | AFTER (AWS migration)
```

#### Database
```bash
DATABASE_HOST=db                  # PostgreSQL hostname
DATABASE_PORT=5432                # PostgreSQL port
DATABASE_NAME=securebank          # Database name
DATABASE_USER=postgres            # Database username
DATABASE_PASSWORD=postgres        # Database password
```

#### Redis Cache
```bash
REDIS_HOST=redis                  # Redis hostname
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=                   # Redis password
```

#### AWS Services
```bash
# Local development (LocalStack)
USE_LOCALSTACK=true
AWS_ENDPOINT_URL=http://localstack:4566
AWS_REGION=us-east-1

# Production (real AWS)
# USE_LOCALSTACK=false
# AWS_REGION=us-east-1
# Credentials via IAM role (IRSA)
```

#### S3 Buckets
```bash
S3_PAYMENT_BUCKET=securebank-payment-receipts-local
S3_AUDIT_BUCKET=securebank-audit-logs-local
```

#### Secrets (Local Development)
**⚠️ NEVER use these values in production! Generate unique secrets.**
```bash
JWT_SECRET=<GENERATE_STRONG_SECRET>              # JWT signing key (use: openssl rand -hex 32)
ADMIN_USERNAME=<UNIQUE_ADMIN_USER>              # Unique admin username
ADMIN_PASSWORD=<STRONG_PASSWORD>                # Strong password from password manager
ENCRYPTION_KEY=<GENERATE_AES256_KEY>            # AES-256 key (use: openssl rand -hex 32)
```

### Security Modes

The API supports two operational modes:

#### BEFORE Mode (Local Development)
Uses environment variables for rapid local development:
```bash
SECURITY_MODE=BEFORE
DATABASE_PASSWORD=postgres
JWT_SECRET=secret123
```

#### AFTER Mode (Production)
Uses AWS Secrets Manager for production deployment:
```bash
SECURITY_MODE=AFTER
# Credentials retrieved from AWS Secrets Manager
# No hardcoded secrets in environment
```

## Development

### Local Setup

#### 1. Install Dependencies
```bash
cd backend
npm install
```

#### 2. Start Database Services
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

#### 3. Run Development Server
```bash
npm run dev
```

### Docker Development

#### Build Image
```bash
docker build -t securebank-backend:latest .
```

#### Run Container
```bash
docker run -p 3000:3000 \
  -e DATABASE_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  securebank-backend:latest
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it securebank-db psql -U postgres -d securebank

# Example queries
\dt                              # List tables
SELECT * FROM merchants;         # View merchants
SELECT * FROM payments LIMIT 10; # View recent payments
```

### LocalStack (AWS Mock)

```bash
# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# View receipt
aws --endpoint-url=http://localhost:4566 s3 cp \
  s3://securebank-payment-receipts-local/receipts/test.json -

# List secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets
```

## Testing

### Manual Testing

```bash
# 1. Register merchant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@example.com"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 3. Process payment
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

# 4. View transactions
curl http://localhost:3000/api/payments/list
```

### Test Card Numbers

```
Visa: 4532015112830366
Mastercard: 5425233430109903
Amex: 378282246310005

CVV: Any 3-4 digits
PIN: Any 4-6 digits
Expiry: Any future date (MM/YY)
```

## Deployment

### Docker Compose (Local)

```bash
# Start all services
./scripts/start-local.sh

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### AWS EKS (Production)

#### 1. Build & Push to ECR
```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t securebank-backend:latest .

# Tag for ECR
docker tag securebank-backend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-backend:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-backend:latest
```

#### 2. Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f infrastructure/k8s/backend-deployment.yaml
kubectl apply -f infrastructure/k8s/backend-service.yaml

# Check deployment
kubectl get pods -l app=securebank-backend
kubectl get svc securebank-backend

# View logs
kubectl logs -l app=securebank-backend -f
```

#### 3. Verify Deployment
```bash
# Get service endpoint
kubectl get svc securebank-backend

# Test health endpoint
curl http://<EXTERNAL-IP>:3000/health
```

## Monitoring

### Logs

```bash
# Docker Compose
docker-compose logs -f api

# Kubernetes
kubectl logs -l app=securebank-backend -f

# CloudWatch (production)
aws logs tail /aws/securebank/application --follow
```

### Metrics

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep securebank-db

# Check database logs
docker logs securebank-db

# Test connection
docker exec securebank-api ping db
```

### LocalStack Connection Failed

```bash
# Check LocalStack is running
curl http://localhost:4566/_localstack/health

# Re-initialize LocalStack
./scripts/init-localstack.sh

# Verify S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls
```

### Secrets Manager Error (AFTER mode)

```bash
# Check secrets exist
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id securebank/db/password

# Re-initialize secrets
./scripts/init-localstack.sh
```

## Security

### Authentication
- JWT-based session management
- API keys for merchant integration
- Password hashing (bcrypt)
- Token expiration

### Data Protection
- AWS Secrets Manager for credential management
- Database connection encryption (TLS)
- S3 encryption at rest
- CloudWatch audit logging

### Access Control
- Role-based access control (RBAC)
- Merchant isolation
- API rate limiting
- CORS configuration

## Performance

- Connection pooling (PostgreSQL)
- Redis caching for sessions
- Horizontal scaling (Kubernetes)
- Auto-scaling policies
- Load balancing

## Dependencies

See [package.json](package.json) for complete list.

**Core Dependencies**:
- `express` - Web framework
- `pg` - PostgreSQL client
- `redis` - Redis client
- `aws-sdk` - AWS services
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- `dotenv` - Environment config

## License

Proprietary - SecureBank Financial Services

## Support

For technical support, contact:
- Email: engineering@securebank.com
- Slack: #securebank-api
- Docs: https://docs.securebank.com/api

---

**Version**: 1.0.0
**Last Updated**: 2025-10-08
**Team**: SecureBank Engineering