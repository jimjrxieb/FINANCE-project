# ============================================================================
# KMS - Encryption Keys
# ============================================================================

# Main project KMS key
resource "aws_kms_key" "securebank" {
  description             = "SecureBank main encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  # ✅ PCI 7.1: Defined key policy with least privilege
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = [
            "s3.amazonaws.com",
            "rds.amazonaws.com",
            "secretsmanager.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "s3.${var.aws_region}.amazonaws.com",
              "rds.${var.aws_region}.amazonaws.com",
              "secretsmanager.${var.aws_region}.amazonaws.com"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-main"
    PCI_DSS = "3.4"
  }
}

resource "aws_kms_alias" "securebank" {
  name          = "alias/${var.project_name}-main"
  target_key_id = aws_kms_key.securebank.key_id
}

# Secrets encryption key
resource "aws_kms_key" "secrets" {
  description             = "SecureBank secrets encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  # ✅ PCI 7.1: Defined key policy with least privilege
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager to use the key"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-secrets"
    PCI_DSS = "3.4"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
