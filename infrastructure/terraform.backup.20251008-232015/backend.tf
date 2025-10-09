# ============================================================================
# TERRAFORM BACKEND CONFIGURATION - INTENTIONALLY INSECURE
# ============================================================================
# ❌ PCI 3.4: Storing state in S3 without encryption
# ❌ PCI 10.5.2: No state file versioning
# ============================================================================

terraform {
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