# ============================================================================
# RDS - PUBLIC DATABASE WITH CVV/PIN STORAGE
# ============================================================================
# ❌ PCI 2.3: Database accessible from internet
# ❌ PCI 3.4: No storage encryption
# ❌ PCI 10.7: Backup retention too short
# ❌ PCI 2.4: No automated patching
# ❌ PCI 10.1: No enhanced monitoring
# ============================================================================

resource "aws_db_subnet_group" "main" {
  # LocalStack has limited RDS support - make subnet group optional
  count      = var.deployment_target == "aws" ? 1 : 0
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "SecureBank DB subnet group"
  }
}

# ❌ CRITICAL: Public RDS storing CVV/PIN
resource "aws_db_instance" "payment_db" {
  # LocalStack has limited RDS support
  count = var.deployment_target == "aws" ? 1 : 0

  identifier     = "${var.project_name}-payment-db"
  engine         = "postgres"
  engine_version = "14.10"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"

  # ❌ PCI 3.4: No storage encryption
  storage_encrypted = false  # ❌ CRITICAL!
  # kms_key_id = aws_kms_key.rds.arn

  db_name  = var.project_name
  username = var.db_username  # ❌ "admin"
  password = var.db_password  # ❌ "supersecret"

  # ❌ PCI 2.3: Publicly accessible database!
  publicly_accessible = true  # ❌ CRITICAL!

  vpc_security_group_ids = [aws_security_group.allow_all.id]
  db_subnet_group_name   = aws_db_subnet_group.main[0].name

  # ❌ PCI 10.7: Backup retention too short
  backup_retention_period = 1  # ❌ Should be 90+ days

  # ❌ PCI 2.4: No automated patching
  auto_minor_version_upgrade = false

  # ❌ PCI 10.1: No enhanced monitoring
  enabled_cloudwatch_logs_exports = []  # ❌ Should log all queries

  # ❌ Deletion protection disabled
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name        = "${var.project_name}-payment-db"
    Contains    = "CVV-PIN-PAN"  # ❌ Advertising sensitive data!
    Compliance  = "PCI-DSS"
    Encryption  = "NONE"  # ❌ Red flag!
  }
}

# LocalStack alternative - use container-based PostgreSQL
# For LocalStack deployments, use docker-compose PostgreSQL instead
# See docker-compose.yml for local database configuration