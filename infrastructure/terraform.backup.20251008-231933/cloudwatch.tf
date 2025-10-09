# ============================================================================
# CLOUDWATCH - LOGGING SENSITIVE DATA
# ============================================================================
# ❌ PCI 10.1: Log group without retention
# ❌ PCI 3.4: No encryption
# ============================================================================

resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/${var.project_name}/application"
  retention_in_days = 1  # ❌ Should be 90+ days

  # ❌ PCI 3.4: No encryption
  # kms_key_id = aws_kms_key.logs.arn

  tags = {
    Name = "SecureBank Application Logs"
  }
}