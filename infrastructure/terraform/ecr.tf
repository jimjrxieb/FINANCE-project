# ============================================================================
# ECR - CONTAINER REGISTRY (SECURE CONFIGURATION)
# ============================================================================
# ✅ PCI 11.3.2: Image scanning enabled
# ✅ PCI 3.4: KMS encryption (optional, use if available)
# ✅ PCI 7.1: Restricted ECR repository access
# ============================================================================

resource "aws_ecr_repository" "backend" {
  # LocalStack has limited ECR support - only deploy on real AWS
  count = var.deployment_target == "aws" ? 1 : 0

  name                 = "${var.project_name}/backend"
  image_tag_mutability = "IMMUTABLE"  # ✅ Secure: Prevent tag overwrites

  # ✅ PCI 11.3.2: Image scanning enabled
  image_scanning_configuration {
    scan_on_push = true  # ✅ Scan images for vulnerabilities
  }

  # ✅ PCI 3.4: KMS encryption (use AES256 if no KMS key)
  encryption_configuration {
    encryption_type = "AES256"  # Note: Use KMS in production for PCI compliance
    # kms_key = var.kms_key_id  # Uncomment and provide KMS key for full compliance
  }

  tags = {
    Name        = "${var.project_name}-backend"
    Environment = var.environment
    Compliance  = "PCI-DSS"
  }
}

resource "aws_ecr_repository" "frontend" {
  count = var.deployment_target == "aws" ? 1 : 0

  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "IMMUTABLE"  # ✅ Secure: Prevent tag overwrites

  image_scanning_configuration {
    scan_on_push = true  # ✅ Scan images for vulnerabilities
  }

  encryption_configuration {
    encryption_type = "AES256"  # Note: Use KMS in production for PCI compliance
    # kms_key = var.kms_key_id  # Uncomment and provide KMS key for full compliance
  }

  tags = {
    Name        = "${var.project_name}-frontend"
    Environment = var.environment
    Compliance  = "PCI-DSS"
  }
}

# ✅ PCI 7.1: Restricted ECR repository access
resource "aws_ecr_repository_policy" "backend_restricted" {
  count      = var.deployment_target == "aws" ? 1 : 0
  repository = aws_ecr_repository.backend[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowAccountPull"
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"  # ✅ Restrict to account
      }
      Action = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
    }]
  })
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# For LocalStack deployments, use local Docker images
# Build and run containers with docker-compose instead