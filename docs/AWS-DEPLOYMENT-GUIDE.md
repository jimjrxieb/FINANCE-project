# SecureBank Payment Platform - AWS Deployment Guide

**PRODUCTION-REALISTIC VULNERABLE APPLICATION FOR FIS DEMO**

This guide shows how to deploy a fully functional, production-realistic payment platform to AWS with **70+ intentional PCI-DSS violations** for GP-Copilot demonstration.

---

## 🎯 What Makes This Demo Realistic?

✅ **Real Cloud Infrastructure:**
- AWS RDS (PostgreSQL) - publicly accessible, storing CVV/PIN
- AWS S3 - public buckets with payment data
- AWS EKS (Kubernetes) - insecure cluster configuration
- AWS Secrets Manager - with hardcoded fallback
- AWS CloudWatch - logging sensitive data
- AWS ECR - public container registry

✅ **Real CI/CD Pipeline:**
- GitHub Actions - deploys to production without approval
- No security scanning (SAST, DAST, SCA)
- Hardcoded AWS credentials

✅ **Real Monitoring:**
- Prometheus + Grafana - exposed to internet
- No authentication
- Metrics expose payment data

✅ **Real Kubernetes:**
- EKS cluster with 25+ violations
- Privileged containers
- Root access
- Host network sharing

---

## 📊 Violation Summary

| Layer | Violations | Cost Exposure |
|-------|------------|---------------|
| AWS Infrastructure | 20+ | $200K/month |
| Kubernetes/EKS | 25+ | $150K/month |
| CI/CD Pipeline | 15+ | $100K/month |
| Backend/Frontend | 46+ | $500K/month |
| **TOTAL** | **106+** | **$950K/month** |

---

## 🚀 Quick Start (3 Options)

### Option 1: Full AWS Deployment (Recommended for FIS Demo)

**Prerequisites:**
- AWS Account with admin access
- Terraform 1.0+
- kubectl
- AWS CLI configured
- GitHub repository

**Steps:**

```bash
# 1. Clone and navigate
cd /path/to/FINANCE-project

# 2. Deploy infrastructure with Terraform
cd infrastructure/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Expected output: VPC, RDS, S3, EKS, Secrets Manager, ECR
# ⚠️  WARNING: Creates PUBLIC resources!

# 3. Configure kubectl for EKS
aws eks update-kubeconfig --region us-east-1 --name securebank-eks

# 4. Build and push Docker images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/securebank/backend:latest ./backend
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/securebank/backend:latest

docker build -t ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/securebank/frontend:latest ./frontend
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/securebank/frontend:latest

# 5. Deploy to EKS
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl apply -f infrastructure/k8s/service.yaml
kubectl apply -f infrastructure/k8s/monitoring.yaml

# 6. Get public endpoints
kubectl get svc -n securebank

# Example output:
# securebank-backend-service   LoadBalancer   a1b2c3...elb.amazonaws.com  80:30123/TCP
# securebank-frontend-service  LoadBalancer   d4e5f6...elb.amazonaws.com  80:30124/TCP
# prometheus-service           LoadBalancer   g7h8i9...elb.amazonaws.com  9090:30125/TCP
# grafana-service              LoadBalancer   j1k2l3...elb.amazonaws.com  80:30126/TCP

# 7. Verify deployment
kubectl get pods -n securebank
```

**Access Points:**
- Frontend: `http://<frontend-lb>.elb.amazonaws.com`
- Backend API: `http://<backend-lb>.elb.amazonaws.com`
- Prometheus: `http://<prometheus-lb>.elb.amazonaws.com:9090`
- Grafana: `http://<grafana-lb>.elb.amazonaws.com` (admin/admin)

### Option 2: Local Docker Compose (No AWS Cost)

```bash
# Run locally with Docker Compose
docker-compose up -d

# Access:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3002
```

### Option 3: Hybrid (Local + AWS Services)

```bash
# Deploy only AWS services (RDS, S3, Secrets Manager)
cd infrastructure/terraform
terraform apply -target=aws_db_instance.payment_db -target=aws_s3_bucket.payment_receipts

# Update backend/.env with RDS endpoint
# Run backend/frontend locally but connect to real AWS
docker-compose up backend frontend
```

---

## 🔧 Configuration

### Environment Variables (Backend)

**File:** `backend/.env.aws`

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# RDS Database (Public endpoint!)
DB_HOST=securebank-payment-db.c9abc123xyz.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=supersecret
DB_NAME=securebank
DB_PORT=5432

# S3 Buckets (Public!)
S3_PAYMENT_BUCKET=securebank-payment-receipts-production
S3_AUDIT_BUCKET=securebank-audit-logs-production

# Redis
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=weak-secret-change-in-production

# CloudWatch
CLOUDWATCH_LOG_GROUP=/aws/securebank/application

# Node
NODE_ENV=production
DEBUG=true
```

### GitHub Actions Secrets

**Required secrets in GitHub repository:**

- `AWS_ACCESS_KEY_ID` - AWS access key (❌ Long-lived credential!)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - us-east-1

**Setup:**
```bash
# Go to GitHub repo > Settings > Secrets and variables > Actions
# Add secrets above
```

---

## 📸 Testing the Platform

### 1. Create Merchant Account

```bash
curl -X POST http://<backend-lb>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "fis_demo",
    "email": "demo@fis.com",
    "password": "Demo123!",
    "company_name": "FIS Demo Merchant"
  }'
```

### 2. Login

```bash
curl -X POST http://<backend-lb>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "fis_demo",
    "password": "Demo123!"
  }'

# Save JWT token from response
```

### 3. Process Payment (Stores CVV/PIN!)

```bash
curl -X POST http://<backend-lb>/api/payments/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "cardNumber": "4532015112830366",
    "cvv": "123",
    "pin": "1234",
    "expiryDate": "12/2025",
    "cardholderName": "John Doe",
    "amount": 99.99
  }'
```

### 4. View Payment in Dashboard

**Frontend:** `http://<frontend-lb>/dashboard`

**What you'll see:**
- ❌ Full card number: 4532015112830366
- ❌ CVV: 123
- ❌ PIN: 1234
- ❌ All payment details in plaintext

### 5. Check S3 Bucket (PUBLIC!)

```bash
# List payment receipts (public bucket!)
aws s3 ls s3://securebank-payment-receipts-production/receipts/ --recursive

# Download a receipt (contains CVV/PIN!)
aws s3 cp s3://securebank-payment-receipts-production/receipts/2025-10-07/1.json ./receipt.json
cat receipt.json

# OR access via public URL:
curl https://securebank-payment-receipts-production.s3.amazonaws.com/receipts/2025-10-07/1.json
```

### 6. View CloudWatch Logs (Sensitive Data!)

```bash
aws logs tail /aws/securebank/application --follow

# You'll see:
# - Full card numbers
# - CVV codes
# - PIN codes
# - AWS credentials
```

### 7. Access Prometheus (No Auth!)

**URL:** `http://<prometheus-lb>:9090`

**Queries to try:**
```promql
# Payment processing rate
rate(payment_processed_total[5m])

# May expose card data in labels!
payment_amount_by_card{card_number="4532015112830366"}
```

### 8. Access Grafana (Admin/Admin!)

**URL:** `http://<grafana-lb>`
**Login:** admin / admin

**What you'll see:**
- Payment dashboards
- Transaction metrics
- Possibly card data in metrics

---

## 🎬 FIS Demo Flow (5 Minutes)

### Script:

**1. Introduction (30 seconds)**
> "This is SecureBank, a payment platform we built that looks production-ready. It's running on AWS with RDS, S3, EKS, and a full CI/CD pipeline. But it has **106 critical PCI-DSS violations** that cost $950K/month in potential fines."

**2. Show Infrastructure (1 minute)**
```bash
# Show running infrastructure
terraform output

# Show EKS cluster
kubectl get nodes
kubectl get pods -n securebank
kubectl get svc -n securebank
```

> "We're running on real AWS EKS. Public load balancers, public RDS database, public S3 buckets. Everything a real company might deploy."

**3. Process Payment (1 minute)**
```bash
# Show payment in UI
# Open frontend: http://<frontend-lb>
# Login: fis_demo / Demo123!
# Process payment with card 4532...
```

> "I just processed a payment. Watch what happens to the CVV and PIN..."

**4. Show CVV/PIN Storage (1 minute)**
```bash
# Show in database
kubectl exec -it postgres-0 -n securebank -- psql -U admin -d securebank
SELECT card_number, cvv, pin FROM payments LIMIT 5;

# Show in S3 (public!)
curl https://securebank-payment-receipts-production.s3.amazonaws.com/receipts/2025-10-07/1.json
```

> "The CVV and PIN are stored in the database - a **CRITICAL PCI-DSS violation**. Even worse, they're in a **public S3 bucket** that anyone on the internet can access."

**5. Run GP-Copilot (1 minute)**
```bash
# Run GP-Copilot scan
cd ~/GP-PLATFORM
./gp_jade scan --project=FINANCE-project --output=report.pdf

# Show report
open report.pdf
```

> "GP-Copilot found all 106 violations in 30 seconds. Here's the compliance report showing every violation, the fix, and the cost impact."

**6. Close (30 seconds)**
> "Without GP-Copilot, this would take a security team **weeks** to find manually. And these violations would cost **$950K/month** in PCI-DSS fines. That's the ROI - we prevent million-dollar mistakes before they hit production."

---

## 🔍 Verification Checklist

After deployment, verify these critical violations exist:

### Infrastructure Layer
- [ ] RDS is publicly accessible (PCI 2.3)
- [ ] RDS has no encryption at rest (PCI 3.4)
- [ ] S3 buckets are public-read (PCI 1.2.1)
- [ ] S3 buckets have no encryption (PCI 3.4)
- [ ] Security groups allow 0.0.0.0/0 (PCI 1.2.1)
- [ ] EKS cluster endpoint is public (PCI 2.2.1)
- [ ] No VPC endpoints (traffic over internet) (PCI 4.1)

### Kubernetes Layer
- [ ] Pods run as root (PCI 2.2.4)
- [ ] Privileged containers (PCI 2.2.1)
- [ ] hostNetwork enabled (PCI 2.2.1)
- [ ] Secrets hardcoded in manifests (PCI 8.2.1)
- [ ] No resource limits (PCI 2.2.1)
- [ ] No network policies (PCI 1.2.1)
- [ ] Services exposed as LoadBalancer (PCI 1.3.1)

### Application Layer
- [ ] Database stores CVV (PCI 3.2.2) - **CRITICAL**
- [ ] Database stores PIN (PCI 3.2.3) - **CRITICAL**
- [ ] Frontend displays CVV/PIN (PCI 3.2.1)
- [ ] CloudWatch logs contain card data (PCI 10.1)
- [ ] S3 receipts contain CVV/PIN (PCI 3.2.2)

### CI/CD Layer
- [ ] No security scanning (PCI 6.2)
- [ ] No manual approval (PCI 6.4.6)
- [ ] AWS credentials in GitHub Secrets (PCI 8.2.1)
- [ ] No container scanning (PCI 11.3.2)

---

## 💰 Cost Estimate

**Monthly AWS Costs:**

| Resource | Cost | Notes |
|----------|------|-------|
| EKS Cluster | $73 | Control plane |
| EC2 Nodes (t3.medium x2) | $60 | Worker nodes |
| RDS (db.t3.micro) | $15 | PostgreSQL |
| S3 Storage | $5 | Minimal usage |
| Data Transfer | $20 | Public traffic |
| CloudWatch Logs | $10 | Log storage |
| **TOTAL** | **~$183/month** | |

**PCI-DSS Fines (if discovered):**

| Violation | Monthly Fine |
|-----------|--------------|
| CVV/PIN Storage | $500,000 |
| Public Database | $200,000 |
| Public S3 Buckets | $150,000 |
| Insufficient Logging | $100,000 |
| **TOTAL EXPOSURE** | **$950,000/month** |

**ROI:** GP-Copilot prevents $950K in fines for $183 in infrastructure costs = **5,180% ROI**

---

## 🧹 Cleanup

### Destroy Everything

```bash
# Delete Kubernetes resources
kubectl delete namespace securebank

# Destroy AWS infrastructure
cd infrastructure/terraform
terraform destroy

# Verify all resources deleted
aws rds describe-db-instances --region us-east-1
aws s3 ls
aws eks list-clusters --region us-east-1
```

**⚠️  WARNING:** This will delete:
- EKS cluster
- RDS database (with payment data)
- S3 buckets (with receipts)
- Load balancers
- All data is LOST

### Revert to Vulnerable State (After Fixes)

```bash
# Use git tag to revert to vulnerable demo version
git checkout v1.0-vulnerable-demo

# Redeploy
terraform apply
kubectl apply -f infrastructure/k8s/
```

---

## 📚 Documentation

- **Full Violation Catalog:** [VIOLATION-GUIDE.md](./VIOLATION-GUIDE.md)
- **Audit Report:** [CODEBASE-AUDIT-REPORT.md](./CODEBASE-AUDIT-REPORT.md)
- **Platform Guide:** [COMPLETE-PLATFORM-GUIDE.md](./COMPLETE-PLATFORM-GUIDE.md)
- **Terraform Docs:** [infrastructure/terraform/README.md](./infrastructure/terraform/README.md)

---

## 🎓 Learning Outcomes

After deploying this platform, you'll understand:

✅ How PCI-DSS violations happen in real cloud infrastructure
✅ Why CVV/PIN storage is **CRITICAL** violation
✅ How public S3 buckets expose payment data
✅ Why Kubernetes security contexts matter
✅ How CI/CD pipelines can deploy vulnerable code
✅ Why monitoring without security controls is dangerous
✅ How GP-Copilot detects violations automatically

---

## ⚠️  Legal Disclaimer

**FOR DEMONSTRATION PURPOSES ONLY**

This application contains intentional security vulnerabilities and PCI-DSS violations. It is designed for:

- Security training
- GP-Copilot product demonstration
- Cloud Security Engineer education

**DO NOT:**
- Process real payment data
- Deploy to production environments
- Use for actual financial transactions
- Connect to real payment networks

**This platform demonstrates what NOT to do.**

---

## 🆘 Troubleshooting

### EKS Cluster Not Accessible
```bash
aws eks update-kubeconfig --region us-east-1 --name securebank-eks
kubectl config current-context
```

### RDS Connection Failed
```bash
# Check RDS is publicly accessible
aws rds describe-db-instances --db-instance-identifier securebank-payment-db

# Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### S3 Bucket Not Public
```bash
# Check public access block
aws s3api get-public-access-block --bucket securebank-payment-receipts-production

# Check bucket policy
aws s3api get-bucket-policy --bucket securebank-payment-receipts-production
```

### Pods Not Starting
```bash
kubectl describe pod <pod-name> -n securebank
kubectl logs <pod-name> -n securebank
```

---

**Questions?** Contact: jimmie@linkops-industries.com

**Git Tag for Demo:** `v1.0-vulnerable-demo`

**Deployment Time:** ~15 minutes
**Teardown Time:** ~5 minutes
**Demo Duration:** 5 minutes
**Violations:** 106+
**Cost Exposure:** $950K/month
**ROI:** 5,180%