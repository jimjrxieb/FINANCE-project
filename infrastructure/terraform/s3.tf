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

# ❌ PUBLIC BUCKET POLICY DISABLED FOR SECURITY
# resource "aws_s3_bucket_policy" "payment_receipts_public" {
#   bucket = aws_s3_bucket.payment_receipts.id
#
#   # ❌ PCI 7.1: Public read access to payment data
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid       = "PublicReadGetObject"
#         Effect    = "Allow"
#         Principal = "*"  # ❌ CRITICAL: Anyone can read!
#         Action    = "s3:GetObject"
#         Resource  = "${aws_s3_bucket.payment_receipts.arn}/*"
#       }
#     ]
#   })
# }

# ✅ PCI 3.4: Server-side encryption with KMS
resource "aws_s3_bucket_server_side_encryption_configuration" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.securebank.arn
    }
    bucket_key_enabled = true
  }
}

# ❌ PCI 10.5.3: No versioning for audit trail
resource "aws_s3_bucket_versioning" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  versioning_configuration {
    status = "Enabled"  # ✅ Enabled for audit trail
  }
}

# ✅ PCI 10.1: S3 access logging for payment receipts
resource "aws_s3_bucket_logging" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  target_bucket = aws_s3_bucket.audit_logs.id
  target_prefix = "s3-access-logs/payment-receipts/"
}

# ✅ PCI 3.1: Lifecycle configuration for data retention
resource "aws_s3_bucket_lifecycle_configuration" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  rule {
    id     = "archive-old-receipts"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years (PCI-DSS requirement)
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # ✅ Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ✅ PCI 10.1: S3 event notifications for security monitoring
resource "aws_s3_bucket_notification" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  # Send events to CloudWatch via SNS (would need SNS topic in production)
  # For now, we'll document the configuration
  # topic {
  #   topic_arn     = aws_sns_topic.s3_events.arn
  #   events        = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  #   filter_prefix = "receipts/"
  # }
}

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

# ✅ PCI 3.4: Server-side encryption for audit logs
resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.securebank.arn
    }
    bucket_key_enabled = true
  }
}

# ✅ PCI 10.5.3: Versioning for audit logs
resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ✅ PCI 10.7: Lifecycle configuration for audit log retention
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "retain-audit-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years (PCI-DSS requirement)
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # ✅ Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ✅ PCI 10.1: S3 event notifications for audit log monitoring
resource "aws_s3_bucket_notification" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  # Send events to CloudWatch via SNS (would need SNS topic in production)
  # For now, we'll document the configuration
  # topic {
  #   topic_arn     = aws_sns_topic.s3_audit_events.arn
  #   events        = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  # }
}