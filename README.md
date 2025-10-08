# SecureBank Payment Platform - Cloud Security Engineer Training

**Production-Realistic Vulnerable Payment Platform for GP-Copilot Demonstration**

[![PCI-DSS](https://img.shields.io/badge/PCI--DSS-VIOLATED-red)](https://www.pcisecuritystandards.org/)
[![Violations](https://img.shields.io/badge/Violations-106+-critical)](./VIOLATION-GUIDE.md)
[![Cost Exposure](https://img.shields.io/badge/Cost%20Exposure-$950K%2Fmonth-red)](./AWS-DEPLOYMENT-GUIDE.md)
[![AWS](https://img.shields.io/badge/AWS-EKS%20%7C%20RDS%20%7C%20S3-orange)](./infrastructure/terraform/)
[![License](https://img.shields.io/badge/License-DEMO%20ONLY-yellow)](./LICENSE)

---

## 🎯 Overview

SecureBank is a **fully functional payment processing platform** built with intentional security vulnerabilities to demonstrate:

1. **What real-world PCI-DSS violations look like** in production cloud environments
2. **How GP-Copilot automatically detects** critical security issues
3. **The cost impact** of security violations ($950K/month in potential fines)
4. **Cloud Security Engineer skills** across AWS, Kubernetes, CI/CD, and monitoring

**Target Audience:**
- FIS (Fidelity National Information Services) demo
- Cloud Security Engineer training
- DevSecOps education
- PCI-DSS compliance workshops

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS CLOUD                                │
│                                                                  │
│  ┌──────────────┐      ┌─────────────┐      ┌──────────────┐  │
│  │   EKS        │      │   RDS       │      │     S3       │  │
│  │  (Public)    │─────▶│  (Public)   │      │  (Public)    │  │
│  │              │      │  CVV/PIN    │      │  Payment     │  │
│  │ - Backend    │      │  Storage    │      │  Receipts    │  │
│  │ - Frontend   │      └─────────────┘      └──────────────┘  │
│  │ - Monitoring │                                              │
│  └──────────────┘      ┌─────────────┐      ┌──────────────┐  │
│         │              │  Secrets    │      │  CloudWatch  │  │
│         └─────────────▶│  Manager    │      │  (Logs       │  │
│                        │  (Fallback) │      │   CVV/PIN)   │  │
│                        └─────────────┘      └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   GitHub Actions       │
                    │   CI/CD Pipeline       │
                    │   (No Security Scans)  │
                    └────────────────────────┘
```

---

## 🚨 Critical Violations

### Application Layer (46 violations)
- ❌ **CVV Storage** (PCI 3.2.2) - CRITICAL VIOLATION - $500K fine
- ❌ **PIN Storage** (PCI 3.2.3) - CRITICAL VIOLATION - $500K fine
- ❌ Full PAN displayed in UI
- ❌ SQL Injection vulnerabilities
- ❌ XSS in transaction display
- ❌ Tokens in localStorage
- ❌ Weak password hashing (4 rounds)
- ❌ No MFA authentication

### Infrastructure Layer (20 violations)
- ❌ Public RDS database
- ❌ No encryption at rest (RDS, S3)
- ❌ Public S3 buckets with payment data
- ❌ Security groups allow 0.0.0.0/0
- ❌ No VPC endpoints
- ❌ Hardcoded AWS credentials
- ❌ EKS cluster endpoint public

### Kubernetes Layer (25 violations)
- ❌ Privileged containers
- ❌ Runs as root (UID 0)
- ❌ hostNetwork enabled
- ❌ Mounts host filesystem
- ❌ No resource limits
- ❌ Secrets hardcoded in manifests
- ❌ No network policies

### CI/CD Layer (15 violations)
- ❌ No security scanning (SAST, DAST, SCA)
- ❌ No container image scanning
- ❌ Deploys to production without approval
- ❌ AWS credentials in GitHub Secrets
- ❌ No SBOM generation

**Total:** 106+ violations
**Cost Exposure:** $950,000/month in PCI-DSS fines

---

## 🚀 Quick Start

### Option 1: Full AWS Deployment (Production-Realistic)

**Prerequisites:**
- AWS Account (will cost ~$183/month)
- Terraform 1.0+
- kubectl
- AWS CLI configured
- Docker

**Deploy:**
```bash
# 1. Deploy AWS infrastructure
cd infrastructure/terraform
terraform init
terraform apply

# 2. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name securebank-eks

# 3. Build & push images to ECR
./scripts/build-and-push-ecr.sh

# 4. Deploy to Kubernetes
kubectl apply -f infrastructure/k8s/

# 5. Verify deployment
./scripts/verify-aws-deployment.sh
```

**Access:**
- Frontend: `http://<frontend-lb>.elb.amazonaws.com`
- Backend: `http://<backend-lb>.elb.amazonaws.com`
- Grafana: `http://<grafana-lb>.elb.amazonaws.com` (admin/admin)
- Prometheus: `http://<prometheus-lb>.elb.amazonaws.com:9090`

**Full Guide:** [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)

### Option 2: Local Docker Compose (Free)

```bash
# Run locally
docker-compose up -d

# Access
# - Frontend: http://localhost:3001
# - Backend: http://localhost:3000
# - Grafana: http://localhost:3002 (admin/admin)
```

**Local Guide:** [COMPLETE-PLATFORM-GUIDE.md](./COMPLETE-PLATFORM-GUIDE.md)

---

## 📸 Demo Flow (5 Minutes)

### 1. Show Infrastructure (1 min)
```bash
terraform output
kubectl get all -n securebank
```

### 2. Process Payment (1 min)
- Open frontend
- Login: `demo / Demo123!`
- Process payment with test card
- **Show CVV/PIN displayed in UI**

### 3. Show Data Breach (1 min)
```bash
# CVV/PIN in database
kubectl exec -it postgres-0 -- psql -U admin securebank
SELECT card_number, cvv, pin FROM payments LIMIT 5;

# Public S3 bucket
curl https://securebank-payment-receipts-production.s3.amazonaws.com/receipts/2025-10-07/1.json
```

### 4. Run GP-Copilot (1 min)
```bash
cd ~/GP-PLATFORM
./gp_jade scan --project=FINANCE-project --output=report.pdf
open report.pdf
```

### 5. Show ROI (1 min)
- Report shows 106 violations
- $950K/month cost exposure
- GP-Copilot finds in 30 seconds vs. weeks manually
- **5,180% ROI**

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md) | Full AWS deployment guide with Terraform |
| [VIOLATION-GUIDE.md](./VIOLATION-GUIDE.md) | Complete catalog of all 106 violations |
| [CODEBASE-AUDIT-REPORT.md](./CODEBASE-AUDIT-REPORT.md) | Initial audit and gap analysis |
| [COMPLETE-PLATFORM-GUIDE.md](./COMPLETE-PLATFORM-GUIDE.md) | Local Docker Compose guide |
| [FinancePRD.md](./FinancePRD.md) | Product requirements document |

---

## 🛠️ Technology Stack

### Backend
- Node.js 16 + Express.js
- PostgreSQL 14 (AWS RDS)
- Redis 7
- JWT authentication
- AWS SDK (S3, Secrets Manager, CloudWatch)

### Frontend
- React 18 + TypeScript
- Material-UI
- Chart.js
- React Router
- Axios

### Infrastructure
- **Cloud:** AWS (EKS, RDS, S3, ECR, Secrets Manager, CloudWatch)
- **IaC:** Terraform
- **Orchestration:** Kubernetes (EKS)
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Policy:** Open Policy Agent (OPA)
- **Secrets:** HashiCorp Vault (dev mode)

---

## 🎓 Learning Outcomes

After deploying and exploring this platform, you'll understand:

✅ How PCI-DSS violations happen in real production systems
✅ Why CVV/PIN storage is absolutely forbidden
✅ How public cloud resources expose sensitive data
✅ Why Kubernetes security contexts are critical
✅ How insecure CI/CD pipelines deploy vulnerable code
✅ The cost impact of security violations
✅ How automated tools (GP-Copilot) detect violations instantly

---

## 🔐 Security Violations by Category

### PCI-DSS Requirement Coverage

| Requirement | Description | Violations |
|-------------|-------------|------------|
| 1.x | Firewall Configuration | 8 |
| 2.x | System Hardening | 12 |
| 3.x | Protect Stored Data | 18 (CRITICAL) |
| 4.x | Encryption in Transit | 6 |
| 6.x | Secure Development | 15 |
| 7.x | Access Control | 10 |
| 8.x | Authentication | 14 |
| 10.x | Logging & Monitoring | 12 |
| 11.x | Security Testing | 8 |
| 12.x | Security Policy | 3 |

**Total:** 106 violations across all 12 PCI-DSS requirements

---

## 💰 Cost Analysis

### AWS Infrastructure Costs
- EKS Control Plane: $73/month
- EC2 Nodes (2x t3.medium): $60/month
- RDS (db.t3.micro): $15/month
- S3, CloudWatch, Data Transfer: $35/month
- **Total Infrastructure:** ~$183/month

### PCI-DSS Violation Fines (if discovered)
- CVV Storage: $500,000
- PIN Storage: $500,000
- Public Database: $200,000
- Public S3 Buckets: $150,000
- Insufficient Logging: $100,000
- **Total Exposure:** $950,000/month

### ROI Calculation
```
Cost to Run Demo: $183/month
Fines Prevented:  $950,000/month
ROI: 519,125%

Or simply: 5,180% monthly ROI
```

---

## 🧪 Testing Scenarios

### Test Case 1: CVV Storage Violation
```bash
# Process payment
curl -X POST http://<backend>/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"cardNumber":"4532015112830366","cvv":"123",...}'

# Verify CVV stored in database
kubectl exec -it postgres-0 -- psql -U admin securebank -c \
  "SELECT card_number, cvv FROM payments WHERE cvv IS NOT NULL;"
```

### Test Case 2: Public S3 Bucket
```bash
# Upload receipt
# Check public access
curl https://securebank-payment-receipts-production.s3.amazonaws.com/

# Download receipt (contains CVV/PIN!)
curl https://securebank-payment-receipts-production.s3.amazonaws.com/receipts/2025-10-07/1.json
```

### Test Case 3: Privileged Container Escape
```bash
# Get shell in privileged container
kubectl exec -it securebank-backend-xyz -n securebank -- /bin/bash

# Mount host filesystem (already mounted at /host)
ls /host
cat /host/etc/shadow

# Access Docker socket
docker ps  # Can control host Docker!
```

---

## 🆘 Troubleshooting

### Issue: EKS pods not starting
```bash
kubectl describe pod <pod-name> -n securebank
kubectl logs <pod-name> -n securebank
```

### Issue: RDS connection refused
```bash
# Check RDS is publicly accessible
aws rds describe-db-instances --db-instance-identifier securebank-payment-db

# Check security group allows your IP
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### Issue: S3 bucket not public
```bash
# Verify public access configuration
aws s3api get-public-access-block --bucket securebank-payment-receipts-production

# Check bucket policy
aws s3api get-bucket-policy --bucket securebank-payment-receipts-production
```

---

## 🧹 Cleanup

### Destroy AWS Infrastructure
```bash
# Delete Kubernetes resources
kubectl delete namespace securebank

# Destroy Terraform infrastructure
cd infrastructure/terraform
terraform destroy

# Verify cleanup
aws eks list-clusters
aws rds describe-db-instances
aws s3 ls
```

**⚠️  WARNING:** This deletes all data and resources.

### Revert to Vulnerable State (After Fixes)
```bash
# Use git tag to restore vulnerable demo version
git checkout v1.0-vulnerable-demo

# Redeploy
terraform apply
kubectl apply -f infrastructure/k8s/
```

---

## 📋 DevSecOps Project Coverage

This project demonstrates skills required for Cloud Security Engineer roles:

### Responsibilities Covered
✅ Evaluate security of AWS cloud infrastructure
✅ Perimeter security, system hardening, access control
✅ SDLC security (code scanning, penetration testing)
✅ Vulnerability scanner findings management
✅ Disaster recovery and breach response
✅ Compliance with ISO, PCI-DSS standards

### Qualifications Demonstrated
✅ AWS environments (VPC, EC2, IAM, S3, RDS, EKS, CloudTrail)
✅ Network architecture, firewalls, segmentation, encryption
✅ Logging, SIEM, log analysis
✅ Kubernetes and Docker security
✅ Python scripting (GP-Copilot integration)
✅ CI/CD security (GitHub Actions)

---

## ⚠️  Legal Disclaimer

**FOR DEMONSTRATION AND TRAINING PURPOSES ONLY**

This application contains intentional security vulnerabilities. It is designed for:
- Security training and education
- GP-Copilot product demonstrations
- Cloud Security Engineer skill development

**DO NOT:**
- Process real payment card data
- Deploy to production environments
- Use for actual financial transactions
- Connect to real payment networks

This platform demonstrates **what NOT to do** in production systems.

---

## 📞 Contact

**Project:** SecureBank Payment Platform Demo
**Organization:** LinkOps Industries
**Purpose:** FIS Demo & Cloud Security Engineer Training
**Git Tag:** `v1.0-vulnerable-demo`

**Documentation:**
- AWS Deployment: [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)
- Violations Catalog: [VIOLATION-GUIDE.md](./VIOLATION-GUIDE.md)
- Audit Report: [CODEBASE-AUDIT-REPORT.md](./CODEBASE-AUDIT-REPORT.md)

---

## 🎯 Next Steps

1. **Deploy to AWS:** Follow [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)
2. **Run Verification:** `./scripts/verify-aws-deployment.sh`
3. **Process Test Payment:** Use frontend to create payment with CVV/PIN
4. **Run GP-Copilot Scan:** Detect all 106 violations
5. **Generate Report:** Create compliance report for FIS demo
6. **Present ROI:** Show $950K cost avoidance

**Deployment Time:** ~15 minutes
**Demo Duration:** 5 minutes
**Violations:** 106+
**ROI:** 5,180%

---

**Built with intentional security violations to demonstrate real-world cloud security challenges.**