# ============================================================================
# S3 - PUBLIC BUCKETS WITH PAYMENT DATA
# ============================================================================
# ❌ PCI 3.4: Public S3 bucket storing payment receipts
# ❌ PCI 1.2.1: Public read access to payment data
# ❌ PCI 10.5.3: No versioning for audit trail
# ❌ PCI 10.1: No access logging
# ============================================================================

# Payment Receipts Bucket (PUBLIC!)
resource "aws_s3_bucket" "payment_receipts" {
  # LocalStack doesn't require globally unique names
  bucket = var.deployment_target == "localstack" ? "${var.project_name}-payment-receipts" : "${var.project_name}-payment-receipts-${var.environment}-${data.aws_caller_identity.current.account_id}"

  # ❌ PCI 3.4: Force destroy allows data loss
  force_destroy = true

  tags = {
    Name     = "Payment Receipts"
    Contains = "Payment Data"  # ❌ Contains PII/PCI data!
    Public   = "true"
  }
}

# Get AWS account ID (only for real AWS)
data "aws_caller_identity" "current" {}

# ❌ PCI 1.2.1: Public read access to payment data
resource "aws_s3_bucket_public_access_block" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  block_public_acls       = true  # ❌ CRITICAL!
  block_public_policy     = true  # ❌ CRITICAL!
  ignore_public_acls      = true
  restrict_public_buckets = true
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

# Audit Logs Bucket (also public!)
resource "aws_s3_bucket" "audit_logs" {
  bucket = var.deployment_target == "localstack" ? "${var.project_name}-audit-logs" : "${var.project_name}-audit-logs-${var.environment}-${data.aws_caller_identity.current.account_id}"

  force_destroy = true

  tags = {
    Name     = "Audit Logs"
    Contains = "PCI Audit Logs"
  }
}

# ❌ PCI 10.5: Audit logs are public!
resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}