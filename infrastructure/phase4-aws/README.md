# Phase 4: AWS Migration & Neobank Enhancement

## Overview

Phase 4 transforms SecureBank from a basic Kubernetes banking app to a **full-featured hybrid neobank** running on AWS with serverless architecture.

## Goals

### 1. **Neobank Features**
- Card-on-file management (Stripe tokenization)
- Enhanced merchant B2B API with webhooks
- P2P transfers between users
- Interest-bearing savings accounts
- Transaction export (CSV for compliance)

### 2. **AWS Migration**
- Migrate from Kind (local) to AWS (cloud)
- Serverless architecture (Lambda + API Gateway)
- Managed services (RDS, ElastiCache, Secrets Manager)
- Cloud-native security (GuardDuty, WAF, KMS)

### 3. **Security Enhancements**
- Full PCI-DSS compliance with card tokenization
- API key management in AWS Secrets Manager
- HMAC-signed webhooks for merchant notifications
- Rate limiting with API Gateway
- TLS 1.3 only

## Directory Structure

```
phase4-aws/
├── terraform/          # Infrastructure as Code
│   ├── main.tf
│   ├── lambda.tf       # Lambda functions
│   ├── api_gateway.tf  # REST API
│   ├── rds.tf          # PostgreSQL RDS
│   ├── secrets.tf      # Secrets Manager
│   └── security.tf     # WAF, GuardDuty, KMS
├── lambda/             # Serverless functions
│   ├── auth/           # Authentication handler
│   ├── accounts/       # Account management
│   ├── cards/          # Card tokenization
│   ├── transactions/   # Payment processing
│   └── webhooks/       # Merchant notifications
├── scripts/            # Automation
│   ├── deploy.sh       # Deployment automation
│   ├── migrate-data.sh # Data migration from Kind
│   └── test-api.sh     # API testing
└── docs/               # Documentation
    ├── ARCHITECTURE.md # System architecture
    ├── MIGRATION.md    # Migration guide
    └── API.md          # API documentation
```

## Migration Strategy

### Phase 4a: Infrastructure Setup (LocalStack First)
1. Test AWS resources locally with LocalStack
2. Terraform configuration for all services
3. Lambda functions for core banking operations
4. API Gateway for REST endpoints

### Phase 4b: Data Migration
1. Export data from Kind PostgreSQL
2. Import to AWS RDS
3. Verify data integrity
4. Update connection strings

### Phase 4c: Feature Enhancement
1. Implement card tokenization (Stripe)
2. Build merchant webhook system
3. Add P2P transfers
4. Create admin fraud dashboard

### Phase 4d: Production Deployment
1. Deploy to real AWS account
2. Configure DNS and SSL certificates
3. Enable monitoring (CloudWatch)
4. Activate GuardDuty and WAF

## Baseline (Phase 3 v1.0)

Phase 3 is stable and tagged as `v1.0-phase3`:
- Basic banking (checking/savings)
- Authentication with JWT
- Card data masking
- Merchant payments
- Running on Kind cluster

## Next Steps

See individual subdirectories for detailed implementation:
- `terraform/` - Infrastructure provisioning
- `lambda/` - Serverless function code
- `scripts/` - Deployment automation
- `docs/` - Architecture and API docs
