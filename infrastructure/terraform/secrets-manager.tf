# ============================================================================
# SECRETS MANAGER - WITH PLAINTEXT FALLBACK
# ============================================================================
# ❌ PCI 8.2.1: Secrets without rotation
# ❌ PCI 8.2.4: No automatic rotation
# ============================================================================

# Database Password Secret
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/db/password"
  description             = "Database password for SecureBank"
  recovery_window_in_days = 0  # ❌ Immediate deletion, no recovery!

  # ❌ PCI 8.2.4: No automatic rotation
  # rotation_rules {
  #   automatically_after_days = 90
  # }

  tags = {
    Name = "Database Password"
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
  recovery_window_in_days = 0

  tags = {
    Name = "JWT Secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "weak-secret-change-in-production"  # ❌ Weak secret!
}