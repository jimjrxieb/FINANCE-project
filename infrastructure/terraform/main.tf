# ============================================================================
# TERRAFORM AWS INFRASTRUCTURE - INTENTIONALLY INSECURE
# ============================================================================
# SecureBank Payment Platform - Cloud Infrastructure
# Target: FIS (Fidelity National Information Services) Demo
#
# What a Cloud Security Engineer would implement:
# - Private subnets for sensitive workloads
# - Encrypted storage with KMS
# - VPC endpoints for AWS services
# - Security groups with least privilege
# - WAF protection
# - GuardDuty, Security Hub, Config
#
# Intentional Violations (20+):
# - Public RDS with CVV/PIN storage
# - Public S3 buckets with payment data
# - Security groups allow 0.0.0.0/0
# - No encryption at rest
# - No VPC endpoints (traffic goes over internet)
# - Secrets in plaintext
# - Root account usage
# - No CloudTrail
# ============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ❌ PCI 3.4: Storing state in S3 without encryption
  backend "s3" {
    bucket = "securebank-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"

    # ❌ PCI 3.4: No encryption
    # encrypt = true
    # kms_key_id = "arn:aws:kms:..."

    # ❌ PCI 10.5.2: No state file versioning
    # versioning = true
  }
}

provider "aws" {
  region = var.aws_region

  # ❌ PCI 7.1: Using root account credentials
  # PROPER: Use IAM roles with least privilege

  default_tags {
    tags = {
      Project     = "SecureBank"
      Environment = "production"
      ManagedBy   = "Terraform"
      # ❌ PCI 12.3: No data classification tag
    }
  }
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# ❌ PCI 8.2.1: Default credentials in variables
variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "admin"  # ❌ CRITICAL: Default username!
}

variable "db_password" {
  description = "Database admin password"
  type        = string
  default     = "supersecret"  # ❌ CRITICAL: Hardcoded password!
  # PROPER: Should use sensitive = true and no default
}

# ============================================================================
# VPC - INSECURE NETWORK ARCHITECTURE
# ============================================================================

# ❌ PCI 1.2.1: No network segmentation
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "securebank-vpc"
  }
}

# ❌ PCI 1.3.1: Public subnet for database
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true  # ❌ Auto-assigns public IPs!

  tags = {
    Name = "securebank-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "securebank-public-2"
  }
}

# ❌ PCI 1.2.1: Should have private subnets for workloads
# PROPER: Private subnets with NAT Gateway

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "securebank-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "securebank-public-rt"
  }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# ============================================================================
# SECURITY GROUPS - OVERLY PERMISSIVE
# ============================================================================

# ❌ PCI 1.2.1: Security group allows all inbound traffic
resource "aws_security_group" "allow_all" {
  name        = "securebank-allow-all"
  description = "Allow all inbound traffic"  # ❌ CRITICAL!
  vpc_id      = aws_vpc.main.id

  # ❌ PCI 1.3.1: Allows 0.0.0.0/0 to database
  ingress {
    description = "Allow all inbound"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # ❌ CRITICAL: Open to internet!
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "securebank-allow-all"
  }
}

# ============================================================================
# RDS - PUBLIC DATABASE WITH CVV/PIN STORAGE
# ============================================================================

# ❌ PCI 2.3: Database accessible from internet
resource "aws_db_subnet_group" "main" {
  name       = "securebank-db-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "SecureBank DB subnet group"
  }
}

# ❌ CRITICAL: Public RDS storing CVV/PIN
resource "aws_db_instance" "payment_db" {
  identifier     = "securebank-payment-db"
  engine         = "postgres"
  engine_version = "14.10"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"

  # ❌ PCI 3.4: No storage encryption
  storage_encrypted = false  # ❌ CRITICAL!
  # kms_key_id = aws_kms_key.rds.arn

  db_name  = "securebank"
  username = var.db_username  # ❌ "admin"
  password = var.db_password  # ❌ "supersecret"

  # ❌ PCI 2.3: Publicly accessible database!
  publicly_accessible = true  # ❌ CRITICAL!

  vpc_security_group_ids = [aws_security_group.allow_all.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # ❌ PCI 10.7: Backup retention too short
  backup_retention_period = 1  # ❌ Should be 90+ days

  # ❌ PCI 2.4: No automated patching
  auto_minor_version_upgrade = false

  # ❌ PCI 10.1: No enhanced monitoring
  enabled_cloudwatch_logs_exports = []  # ❌ Should log all queries

  # ❌ Deletion protection disabled
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name        = "securebank-payment-db"
    Contains    = "CVV-PIN-PAN"  # ❌ Advertising sensitive data!
    Compliance  = "PCI-DSS"
    Encryption  = "NONE"  # ❌ Red flag!
  }
}

# ============================================================================
# S3 - PUBLIC BUCKETS WITH PAYMENT DATA
# ============================================================================

# ❌ PCI 3.4: Public S3 bucket storing payment receipts
resource "aws_s3_bucket" "payment_receipts" {
  bucket = "securebank-payment-receipts-${var.environment}"

  # ❌ PCI 3.4: Force destroy allows data loss
  force_destroy = true

  tags = {
    Name       = "Payment Receipts"
    Contains   = "Payment Data"  # ❌ Contains PII/PCI data!
    Public     = "true"
  }
}

# ❌ PCI 1.2.1: Public read access to payment data
resource "aws_s3_bucket_public_access_block" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  block_public_acls       = false  # ❌ CRITICAL!
  block_public_policy     = false  # ❌ CRITICAL!
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "payment_receipts_public" {
  bucket = aws_s3_bucket.payment_receipts.id

  # ❌ PCI 7.1: Public read access to payment data
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"  # ❌ CRITICAL: Anyone can read!
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.payment_receipts.arn}/*"
      }
    ]
  })
}

# ❌ PCI 3.4: No encryption at rest
# PROPER: Should use aws_s3_bucket_server_side_encryption_configuration

# ❌ PCI 10.5.3: No versioning for audit trail
resource "aws_s3_bucket_versioning" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  versioning_configuration {
    status = "Disabled"  # ❌ Should be Enabled
  }
}

# ❌ PCI 10.1: No access logging
# PROPER: Should use aws_s3_bucket_logging

# Second bucket for audit logs (also public!)
resource "aws_s3_bucket" "audit_logs" {
  bucket = "securebank-audit-logs-${var.environment}"

  force_destroy = true

  tags = {
    Name     = "Audit Logs"
    Contains = "PCI Audit Logs"
  }
}

# ❌ PCI 10.5: Audit logs are public!
resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ============================================================================
# SECRETS MANAGER - WITH PLAINTEXT FALLBACK
# ============================================================================

# ❌ PCI 8.2.1: Secrets without rotation
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "securebank/db/password"
  description             = "Database password for SecureBank"
  recovery_window_in_days = 0  # ❌ Immediate deletion, no recovery!

  # ❌ PCI 8.2.4: No automatic rotation
  # rotation_rules {
  #   automatically_after_days = 90
  # }

  tags = {
    Name = "Database Password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id

  # ❌ PCI 8.2.1: Weak password stored
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.payment_db.endpoint
    port     = 5432
    dbname   = "securebank"
  })
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "securebank/jwt/secret"
  recovery_window_in_days = 0

  tags = {
    Name = "JWT Secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "weak-secret-change-in-production"  # ❌ Weak secret!
}

# ============================================================================
# EKS - INSECURE KUBERNETES CLUSTER
# ============================================================================

# ❌ PCI 2.2.1: EKS cluster with public endpoint
resource "aws_eks_cluster" "main" {
  name     = "securebank-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    endpoint_private_access = false  # ❌ Should be true
    endpoint_public_access  = true   # ❌ Should be false
    public_access_cidrs     = ["0.0.0.0/0"]  # ❌ CRITICAL!
    security_group_ids      = [aws_security_group.allow_all.id]
  }

  # ❌ PCI 10.1: Control plane logging disabled
  enabled_cluster_log_types = []  # ❌ Should log all

  # ❌ PCI 3.4: No envelope encryption for secrets
  # encryption_config {
  #   provider {
  #     key_arn = aws_kms_key.eks.arn
  #   }
  #   resources = ["secrets"]
  # }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  tags = {
    Name = "securebank-eks"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "securebank-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  # ❌ PCI 2.2.1: Using public AMI without hardening
  # ❌ PCI 2.4: No automated patching
  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy
  ]

  tags = {
    Name = "securebank-node-group"
  }
}

# ============================================================================
# IAM ROLES - OVERLY PERMISSIVE
# ============================================================================

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster" {
  name = "securebank-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Role
resource "aws_iam_role" "eks_node" {
  name = "securebank-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}

# ❌ PCI 7.1: Overly permissive policy for application
resource "aws_iam_role" "app_role" {
  name = "securebank-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# ❌ PCI 7.1.2: Administrator access to application role
resource "aws_iam_role_policy" "app_admin" {
  name = "admin-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "*"  # ❌ CRITICAL: Full admin access!
      Resource = "*"
    }]
  })
}

# ============================================================================
# ECR - CONTAINER REGISTRY
# ============================================================================

resource "aws_ecr_repository" "backend" {
  name                 = "securebank/backend"
  image_tag_mutability = "MUTABLE"  # ❌ Should be IMMUTABLE

  # ❌ PCI 11.3.2: No image scanning
  image_scanning_configuration {
    scan_on_push = false  # ❌ Should be true
  }

  # ❌ PCI 3.4: No encryption
  encryption_configuration {
    encryption_type = "AES256"  # ❌ Should use KMS
  }

  tags = {
    Name = "securebank-backend"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "securebank/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = {
    Name = "securebank-frontend"
  }
}

# ❌ PCI 7.1: Public ECR repository
resource "aws_ecr_repository_policy" "backend_public" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowPublicPull"
      Effect = "Allow"
      Principal = "*"  # ❌ Anyone can pull images!
      Action = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ]
    }]
  })
}

# ============================================================================
# CLOUDWATCH - LOGGING SENSITIVE DATA
# ============================================================================

# ❌ PCI 10.1: Log group without retention
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/securebank/application"
  retention_in_days = 1  # ❌ Should be 90+ days

  # ❌ PCI 3.4: No encryption
  # kms_key_id = aws_kms_key.logs.arn

  tags = {
    Name = "SecureBank Application Logs"
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "RDS endpoint (PUBLIC - CRITICAL VIOLATION!)"
  value       = aws_db_instance.payment_db.endpoint
}

output "rds_public_ip" {
  description = "RDS is publicly accessible from"
  value       = "0.0.0.0/0 (ENTIRE INTERNET!)"
}

output "s3_payment_receipts" {
  description = "S3 bucket for payment receipts (PUBLIC!)"
  value       = aws_s3_bucket.payment_receipts.bucket
}

output "s3_payment_receipts_url" {
  description = "Public URL to payment receipts"
  value       = "https://${aws_s3_bucket.payment_receipts.bucket}.s3.amazonaws.com/ (PUBLIC READ!)"
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint (PUBLIC!)"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "warning" {
  description = "SECURITY WARNING"
  value       = <<-EOT
    ⚠️  CRITICAL SECURITY VIOLATIONS DETECTED ⚠️

    This infrastructure contains 20+ intentional PCI-DSS violations:

    1. RDS database is PUBLICLY ACCESSIBLE storing CVV/PIN
    2. S3 buckets are PUBLIC with payment data
    3. EKS cluster endpoint is PUBLIC
    4. Security groups allow 0.0.0.0/0
    5. No encryption at rest (RDS, S3, EKS secrets)
    6. No VPC endpoints (traffic over internet)
    7. IAM roles with Administrator access
    8. No CloudTrail, GuardDuty, Security Hub
    9. Public ECR repositories
    10. Hardcoded credentials in Terraform

    Estimated PCI-DSS fines: $500,000+ per month
    Data breach risk: CRITICAL

    FOR DEMONSTRATION PURPOSES ONLY!
  EOT
}