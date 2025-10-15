# ============================================================================
# AWS PROVIDER CONFIGURATION - LocalStack + AWS Support
# ============================================================================

provider "aws" {
  region = var.aws_region

  # ❌ PCI 7.1: Using root account credentials
  # PROPER: Use IAM roles with least privilege

  # LocalStack endpoint overrides
  dynamic "endpoints" {
    for_each = var.deployment_target == "localstack" ? [1] : []
    content {
      s3             = var.localstack_endpoint
      secretsmanager = var.localstack_endpoint
      rds            = var.localstack_endpoint
      cloudwatch     = var.localstack_endpoint
      cloudwatchlogs = var.localstack_endpoint
      iam            = var.localstack_endpoint
      ec2            = var.localstack_endpoint
      eks            = var.localstack_endpoint
      ecr            = var.localstack_endpoint
      sts            = var.localstack_endpoint
      kms            = var.localstack_endpoint
    }
  }

  # LocalStack doesn't validate credentials
  skip_credentials_validation = var.deployment_target == "localstack"
  skip_metadata_api_check     = var.deployment_target == "localstack"
  skip_requesting_account_id  = var.deployment_target == "localstack"
  s3_use_path_style           = var.deployment_target == "localstack"

  # LocalStack uses fake credentials
  access_key = var.deployment_target == "localstack" ? "test" : null
  secret_key = var.deployment_target == "localstack" ? "test" : null

  default_tags {
    tags = {
      Project          = "SecureBank"
      Environment      = var.environment
      ManagedBy        = "Terraform"
      DeploymentTarget = var.deployment_target
      # ❌ PCI 12.3: No data classification tag
    }
  }
}