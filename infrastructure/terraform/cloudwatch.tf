# ============================================================================
# CLOUDWATCH - LOGGING SENSITIVE DATA
# ============================================================================
# ❌ PCI 10.1: Log group without retention
# ✅ PCI 3.4: KMS encryption enabled
# ============================================================================

resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/${var.project_name}/application"
  retention_in_days = 365  # ✅ PCI-DSS 10.7 - 1 year retention (increased from 90 days)

  # ✅ PCI 3.4: KMS encryption enabled
  kms_key_id = aws_kms_key.securebank.arn  # ✅ Encrypted with project KMS key

  tags = {
    Name = "SecureBank Application Logs"
  }
}