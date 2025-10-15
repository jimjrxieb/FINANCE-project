# ============================================================================
# IAM POLICIES - LEAST PRIVILEGE (PCI-DSS 7.1)
# ============================================================================
# ✅ No wildcard actions
# ✅ No wildcard resources
# ✅ Principle of least privilege
# ============================================================================

# Backend application IAM role
resource "aws_iam_role" "backend" {
  name = "${var.project_name}-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "ecs-tasks.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-backend-role"
    PCI_DSS = "7.1"
  }
}

# S3 access policy (specific buckets only)
resource "aws_iam_policy" "backend_s3" {
  name        = "${var.project_name}-backend-s3"
  description = "S3 access for backend - specific buckets only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListSpecificBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.payment_receipts.arn,
          aws_s3_bucket.audit_logs.arn
        ]
      },
      {
        Sid    = "ReadWriteObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.payment_receipts.arn}/*",
          "${aws_s3_bucket.audit_logs.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-backend-s3"
    PCI_DSS = "7.1"
  }
}

# Secrets Manager access policy (specific secrets only)
resource "aws_iam_policy" "backend_secrets" {
  name        = "${var.project_name}-backend-secrets"
  description = "Secrets Manager access - specific secrets only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSpecificSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.jwt_secret.arn
        ]
      },
      {
        Sid    = "DecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = [
          aws_kms_key.secrets.arn
        ]
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-backend-secrets"
    PCI_DSS = "8.2.1"
  }
}

# RDS access policy (specific database only) - only on AWS
resource "aws_iam_policy" "backend_rds" {
  count       = var.deployment_target == "aws" ? 1 : 0
  name        = "${var.project_name}-backend-rds"
  description = "RDS access - describe only (connection via creds)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DescribeRDS"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = [
          aws_db_instance.payment_db[0].arn
        ]
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-backend-rds"
  }
}

# CloudWatch Logs policy (specific log groups only)
resource "aws_iam_policy" "backend_logs" {
  name        = "${var.project_name}-backend-logs"
  description = "CloudWatch Logs - specific log groups only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CreateLogStreams"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/securebank/*"
        ]
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-backend-logs"
    PCI_DSS = "10.1"
  }
}

# Attach policies to backend role
resource "aws_iam_role_policy_attachment" "backend_s3" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_s3.arn
}

resource "aws_iam_role_policy_attachment" "backend_secrets" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_secrets.arn
}

resource "aws_iam_role_policy_attachment" "backend_rds" {
  count      = var.deployment_target == "aws" ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_rds[0].arn
}

resource "aws_iam_role_policy_attachment" "backend_logs" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_logs.arn
}
