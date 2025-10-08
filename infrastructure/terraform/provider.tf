# ============================================================================
# AWS PROVIDER CONFIGURATION
# ============================================================================

provider "aws" {
  region = var.aws_region

  # ❌ PCI 7.1: Using root account credentials
  # PROPER: Use IAM roles with least privilege

  default_tags {
    tags = {
      Project     = "SecureBank"
      Environment = var.environment
      ManagedBy   = "Terraform"
      # ❌ PCI 12.3: No data classification tag
    }
  }
}