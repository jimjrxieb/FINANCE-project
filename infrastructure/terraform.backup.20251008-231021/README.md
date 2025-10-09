# SecureBank Terraform Infrastructure

**LocalStack + AWS Deployment - Production-Realistic Infrastructure with Intentional PCI-DSS Violations**

## 🎯 Deployment Options

This Terraform configuration supports **two deployment targets**:

1. **LocalStack** - FREE local AWS emulation for development/testing ($0)
2. **AWS** - Real AWS cloud for demos/validation (~$183/month or $6/day)

### Quick Start

```bash
# FREE - Deploy to LocalStack (default)
terraform apply

# PAID - Deploy to real AWS
terraform apply -var="deployment_target=aws"
```

See [Deployment Guide](#-deployment-targets) below for details.

---

## 📁 File Structure

```
terraform/
├── versions.tf              # Terraform version & provider requirements
├── backend.tf               # Remote state configuration (S3)
├── provider.tf              # AWS provider configuration
├── variables.tf             # Input variables
├── outputs.tf               # Output values
├── vpc.tf                   # VPC, subnets, IGW, route tables
├── security-groups.tf       # Security groups (overly permissive)
├── rds.tf                   # RDS PostgreSQL (public, unencrypted)
├── s3.tf                    # S3 buckets (public, unencrypted)
├── secrets-manager.tf       # AWS Secrets Manager
├── eks.tf                   # EKS cluster & node group
├── iam.tf                   # IAM roles & policies
├── ecr.tf                   # ECR container registries
├── cloudwatch.tf            # CloudWatch log groups
├── terraform.tfvars.example # Example variables file
└── .gitignore               # Git ignore rules
```

## 🚀 Deployment Targets

### Option 1: LocalStack (FREE - Recommended for Testing)

**What is LocalStack?**
- Free local AWS emulation running on your laptop
- Emulates S3, Secrets Manager, CloudWatch, and more
- Perfect for development and testing
- **Cost: $0**

**What works:**
- ✅ S3 buckets
- ✅ Secrets Manager
- ✅ CloudWatch Logs
- ✅ VPC/Networking (basic)

**What doesn't work (use docker-compose instead):**
- ❌ RDS → Use PostgreSQL container
- ❌ EKS → Use docker-compose
- ❌ ECR → Use local Docker images

**Deploy to LocalStack:**

```bash
# 1. Start LocalStack
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -e SERVICES=s3,secretsmanager,cloudwatch,iam,ec2 \
  localstack/localstack:latest

# 2. Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform apply  # Default is localstack

# 3. Start application (uses docker-compose for database)
cd ../..
docker-compose up
```

### Option 2: Real AWS (COSTS MONEY - Demo/Validation Only)

⚠️ **WARNING: This costs real money!**

**Cost breakdown:**
- 1 hour: ~$0.25
- 8 hours (demo): ~$2
- 1 day: ~$6
- 1 month: ~$183

**What you get:**
- ✅ Real RDS PostgreSQL (public, unencrypted)
- ✅ Real EKS cluster (public endpoint)
- ✅ Real S3 buckets (public)
- ✅ Full AWS infrastructure violations

**Deploy to AWS:**

```bash
# 1. Configure AWS credentials
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"

# 2. Deploy to AWS
cd infrastructure/terraform
terraform init
terraform apply -var="deployment_target=aws"

# 3. IMPORTANT: Destroy when done to stop costs!
terraform destroy -var="deployment_target=aws"
```

### Comparison

| Feature | LocalStack | AWS |
|---------|-----------|-----|
| **Cost** | FREE | ~$183/month |
| **Setup time** | 30 seconds | 15 minutes |
| **RDS** | ❌ (use docker) | ✅ Real RDS |
| **EKS** | ❌ (use docker) | ✅ Real EKS |
| **S3** | ✅ Emulated | ✅ Real S3 |
| **App violations** | ✅ All present | ✅ All present |
| **Infra violations** | ⚠️ Limited | ✅ All present |
| **Use case** | Development, testing | Client demos, validation |

---

## 🚀 Quick Start

### 1. Configure Variables

```bash
# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

**terraform.tfvars:**
```hcl
aws_region   = "us-east-1"
environment  = "production"
project_name = "securebank"
db_username  = "admin"
db_password  = "YourSecurePassword123!"  # Change this!
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Deployment

```bash
# See what will be created
terraform plan

# Save plan to file
terraform plan -out=tfplan
```

### 4. Deploy Infrastructure

```bash
# Apply the plan
terraform apply tfplan

# Or apply directly with confirmation
terraform apply
```

**Deployment time:** ~15 minutes (RDS and EKS are slowest)

### 5. View Outputs

```bash
# Show all outputs
terraform output

# Show specific output
terraform output rds_endpoint

# Save outputs to file
terraform output > ../../AWS-OUTPUTS.txt
```

## 📊 Resources Created

| Resource | Count | Notes |
|----------|-------|-------|
| VPC | 1 | 10.0.0.0/16 |
| Subnets | 2 | Public only (❌ no private) |
| Internet Gateway | 1 | |
| Route Tables | 1 | |
| Security Groups | 1 | ❌ Allows 0.0.0.0/0 |
| RDS PostgreSQL | 1 | ❌ Public, unencrypted |
| S3 Buckets | 2 | ❌ Public, unencrypted |
| EKS Cluster | 1 | ❌ Public endpoint |
| EKS Node Group | 1 | 2x t3.medium nodes |
| ECR Repositories | 2 | Backend + Frontend |
| IAM Roles | 3 | ❌ Overly permissive |
| Secrets Manager | 2 | DB password + JWT |
| CloudWatch Logs | 1 | ❌ 1 day retention |

**Total:** 30+ resources

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| EKS Control Plane | $73.00 |
| EC2 (2x t3.medium) | $60.00 |
| RDS (db.t3.micro) | $15.00 |
| S3 Storage | $5.00 |
| Data Transfer | $15.00 |
| CloudWatch | $10.00 |
| ECR | $5.00 |
| **TOTAL** | **~$183/month** |

## 🔒 Intentional Violations (20+)

### Infrastructure Layer

| Violation | PCI Req | File | Line | Severity |
|-----------|---------|------|------|----------|
| Public RDS | 2.3 | rds.tf | 38 | CRITICAL |
| RDS no encryption | 3.4 | rds.tf | 27 | CRITICAL |
| Public S3 bucket | 1.2.1 | s3.tf | 24 | CRITICAL |
| S3 no encryption | 3.4 | s3.tf | 51 | HIGH |
| EKS public endpoint | 2.2.1 | eks.tf | 19 | HIGH |
| Security group 0.0.0.0/0 | 1.2.1 | security-groups.tf | 20 | CRITICAL |
| IAM admin access | 7.1.2 | iam.tf | 81 | HIGH |
| No private subnets | 1.2.1 | vpc.tf | 31 | MEDIUM |
| Hardcoded password | 8.2.1 | variables.tf | 29 | CRITICAL |
| No state encryption | 3.4 | backend.tf | 13 | HIGH |

**Total:** 20+ violations
**Cost Exposure:** $500K+/month in PCI-DSS fines

## 🧪 Testing

### Verify RDS is Public

```bash
# Get RDS endpoint
RDS_HOST=$(terraform output -raw rds_endpoint | cut -d: -f1)

# Try to connect (should work - that's the violation!)
PGPASSWORD=YourPassword123! psql -h $RDS_HOST -U admin -d securebank -c "SELECT version();"
```

### Verify S3 is Public

```bash
# Get bucket name
S3_BUCKET=$(terraform output -raw s3_payment_receipts)

# Check public access
aws s3api get-bucket-acl --bucket $S3_BUCKET

# Should show "Grantee: All Users" ❌
```

### Verify EKS Public Endpoint

```bash
# Configure kubectl
aws eks update-kubeconfig \
  --name $(terraform output -raw eks_cluster_name) \
  --region us-east-1

# Check cluster endpoint
kubectl cluster-info
```

## 🧹 Cleanup

### Destroy Everything

```bash
# Destroy all resources
terraform destroy

# Or destroy without confirmation
terraform destroy -auto-approve
```

**⚠️  WARNING:** This deletes:
- All databases (data lost forever)
- All S3 buckets (data lost forever)
- EKS cluster
- All networking
- Everything

**Cost after destroy:** $0

### Destroy Specific Resources

```bash
# Destroy only RDS
terraform destroy -target=aws_db_instance.payment_db

# Destroy only S3 buckets
terraform destroy -target=aws_s3_bucket.payment_receipts
terraform destroy -target=aws_s3_bucket.audit_logs
```

## 📝 Common Commands

```bash
# Format all .tf files
terraform fmt

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources in state
terraform state list

# Import existing resource
terraform import aws_vpc.main vpc-xxxxx

# Refresh state
terraform refresh

# Taint resource for recreation
terraform taint aws_db_instance.payment_db

# Unlock state (if locked)
terraform force-unlock <LOCK_ID>
```

## �� State Management

### Remote State (S3 Backend)

**NOTE:** Backend is configured but intentionally insecure:

```hcl
# backend.tf
backend "s3" {
  bucket = "securebank-terraform-state"
  key    = "prod/terraform.tfstate"
  region = "us-east-1"
  # ❌ No encryption enabled
  # ❌ No versioning
}
```

**To use remote state:**

1. Create S3 bucket first:
   ```bash
   aws s3 mb s3://securebank-terraform-state
   ```

2. Uncomment backend block in backend.tf

3. Re-initialize:
   ```bash
   terraform init -migrate-state
   ```

### Local State (Default)

By default, state is stored locally in `terraform.tfstate`

**⚠️  DO NOT commit terraform.tfstate to git!**

## 🛡️ Secure Version (Reference)

For comparison, here's what a SECURE version would look like:

**variables.tf:**
```hcl
variable "db_password" {
  type      = string
  sensitive = true  # ✅ Mark as sensitive
  # No default! Force user to provide
}
```

**rds.tf:**
```hcl
resource "aws_db_instance" "payment_db" {
  storage_encrypted = true  # ✅ Enable encryption
  publicly_accessible = false  # ✅ Private only
  backup_retention_period = 90  # ✅ 90-day backups
  enabled_cloudwatch_logs_exports = ["postgresql"]  # ✅ Enable logging
}
```

**s3.tf:**
```hcl
resource "aws_s3_bucket_public_access_block" "payment_receipts" {
  block_public_acls       = true  # ✅ Block public
  block_public_policy     = true  # ✅ Block public
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## 📚 Documentation

- [AWS-DEPLOYMENT-GUIDE.md](../../AWS-DEPLOYMENT-GUIDE.md) - Full deployment guide
- [CLOUD-PLATFORM-SUMMARY.md](../../CLOUD-PLATFORM-SUMMARY.md) - Platform overview
- [VIOLATION-GUIDE.md](../../docs/VIOLATION-GUIDE.md) - All violations documented

## ⚠️  Legal Disclaimer

**FOR DEMONSTRATION AND TRAINING PURPOSES ONLY**

This infrastructure contains intentional security vulnerabilities for:
- Cloud Security Engineer training
- GP-Copilot product demonstration
- PCI-DSS compliance education

**DO NOT use in production environments!**

---

**Questions?** See [AWS-DEPLOYMENT-GUIDE.md](../../AWS-DEPLOYMENT-GUIDE.md)