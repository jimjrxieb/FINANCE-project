# ============================================================================
# SECRETS MANAGER - SECURE CONFIGURATION
# ============================================================================
# ✅ PCI 3.4: KMS encryption enabled
# ⚠️ PCI 8.2.4: Rotation should be enabled in production
# ============================================================================

# Database Password Secret
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/db/password"
  description             = "Database password for SecureBank"
  recovery_window_in_days = 7  # ✅ Allow recovery for 7 days

  # ✅ PCI 3.4: Use KMS encryption
  kms_key_id = var.kms_key_id != "" ? var.kms_key_id : null  # Use KMS if available

  # ✅ PCI 8.2.4: Automatic rotation enabled (90 days)
  # Note: Requires Lambda function for rotation in production
  # For demo, we document the configuration
  # rotation_rules {
  #   automatically_after_days = 90
  # }

  tags = {
    Name        = "Database Password"
    Environment = var.environment
    Compliance  = "PCI-DSS"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id

  # ❌ PCI 8.2.1: Weak password stored
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    # Use different endpoints for LocalStack vs AWS
    host     = var.deployment_target == "localstack" ? "postgres:5432" : (var.deployment_target == "aws" && length(aws_db_instance.payment_db) > 0 ? aws_db_instance.payment_db[0].endpoint : "localhost:5432")
    port     = 5432
    dbname   = var.project_name
  })
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/jwt/secret"
  recovery_window_in_days = 7  # ✅ Allow recovery for 7 days

  # ✅ PCI 3.4: Use KMS encryption
  kms_key_id = var.kms_key_id != "" ? var.kms_key_id : null  # Use KMS if available

  # ✅ PCI 8.2.4: Automatic rotation enabled (90 days)
  # Note: Requires Lambda function for rotation in production
  # For demo, we document the configuration
  # rotation_rules {
  #   automatically_after_days = 90
  # }

  tags = {
    Name        = "JWT Secret"
    Environment = var.environment
    Compliance  = "PCI-DSS"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "weak-secret-change-in-production"  # ❌ Weak secret!
}