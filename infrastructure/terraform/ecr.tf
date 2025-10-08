# ============================================================================
# ECR - CONTAINER REGISTRY
# ============================================================================
# ❌ PCI 11.3.2: No image scanning
# ❌ PCI 3.4: No KMS encryption
# ❌ PCI 7.1: Public ECR repository
# ============================================================================

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}/backend"
  image_tag_mutability = "MUTABLE"  # ❌ Should be IMMUTABLE

  # ❌ PCI 11.3.2: No image scanning
  image_scanning_configuration {
    scan_on_push = false  # ❌ Should be true
  }

  # ❌ PCI 3.4: No KMS encryption
  encryption_configuration {
    encryption_type = "AES256"  # ❌ Should use KMS
  }

  tags = {
    Name = "${var.project_name}-backend"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.project_name}-frontend"
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