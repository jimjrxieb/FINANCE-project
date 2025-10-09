# ============================================================================
# IAM ROLES - OVERLY PERMISSIVE
# ============================================================================
# ❌ PCI 7.1: Overly permissive policies
# ❌ PCI 7.1.2: Administrator access to application role
# ============================================================================

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster" {
  count = var.deployment_target == "aws" ? 1 : 0
  name  = "${var.project_name}-eks-cluster-role"

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

  tags = {
    Name = "${var.project_name}-eks-cluster-role"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count      = var.deployment_target == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

# EKS Node Role
resource "aws_iam_role" "eks_node" {
  count = var.deployment_target == "aws" ? 1 : 0
  name  = "${var.project_name}-eks-node-role"

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

  tags = {
    Name = "${var.project_name}-eks-node-role"
  }
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  count      = var.deployment_target == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count      = var.deployment_target == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node[0].name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  count      = var.deployment_target == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node[0].name
}

# ❌ PCI 7.1: Overly permissive policy for application
resource "aws_iam_role" "app_role" {
  name = "${var.project_name}-app-role"

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

  tags = {
    Name = "${var.project_name}-app-role"
  }
}

# ✅ PCI 7.1: Least-privilege IAM policies (no wildcards)

# S3 Access Policy (specific buckets only)
resource "aws_iam_role_policy" "app_s3" {
  name = "s3-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-payment-receipts-*/*",
          "arn:aws:s3:::${var.project_name}-audit-logs-*/*"
        ]
      },
      {
        Sid    = "S3BucketList"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-payment-receipts-*",
          "arn:aws:s3:::${var.project_name}-audit-logs-*"
        ]
      }
    ]
  })
}

# Secrets Manager Access (specific secrets only)
resource "aws_iam_role_policy" "app_secrets" {
  name = "secrets-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:*:*:secret:${var.project_name}/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs (specific log groups)
resource "aws_iam_role_policy" "app_logs" {
  name = "logs-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:*:*:log-group:/aws/${var.project_name}/*"
        ]
      }
    ]
  })
}

# KMS Encryption/Decryption (specific keys)
resource "aws_iam_role_policy" "app_kms" {
  name = "kms-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          "arn:aws:kms:*:*:key/*"
        ]
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "s3.*.amazonaws.com",
              "secretsmanager.*.amazonaws.com"
            ]
          }
        }
      }
    ]
  })
}