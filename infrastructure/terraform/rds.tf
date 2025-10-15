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

# ✅ PCI 10.1: DB parameter group with query logging enabled
resource "aws_db_parameter_group" "postgres" {
  count  = var.deployment_target == "aws" ? 1 : 0
  name   = "${var.project_name}-postgres-params"
  family = "postgres14"

  # ✅ PCI 10.1: Enable query logging for audit trail
  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "0"  # Log all queries
  }

  # ✅ PCI 4.1: Force SSL/TLS encryption in transit
  parameter {
    name  = "rds.force_ssl"
    value = "1"  # Require SSL for all connections
  }

  tags = {
    Name = "SecureBank PostgreSQL Parameters"
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
  storage_encrypted = true  # ✅ KMS encryption enabled
  kms_key_id = aws_kms_key.securebank.arn  # ✅ Using project KMS key

  db_name  = var.project_name
  username = var.db_username  # ❌ "admin"
  password = var.db_password  # ❌ "supersecret"

  # ❌ PCI 2.3: Publicly accessible database!
  publicly_accessible = false  # ✅ Private database

  vpc_security_group_ids = [aws_security_group.database.id]  # ✅ Least-privilege SG
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  parameter_group_name   = aws_db_parameter_group.postgres[0].name  # ✅ PCI 10.1: Query logging enabled

  # ❌ PCI 10.7: Backup retention too short
  backup_retention_period = 35  # ✅ Maximum allowed (90 days would be better for PCI-DSS 10.7)

  # ❌ PCI 2.4: No automated patching
  auto_minor_version_upgrade = true  # ✅ PCI-DSS 2.4 - automated patching

  # ✅ PCI 10.1: CloudWatch logging enabled
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]  # ✅ PCI-DSS 10.1

  # ✅ PCI 10.1: Copy tags to snapshots for audit trail
  copy_tags_to_snapshot = true

  # ✅ Deletion protection enabled
  deletion_protection = true  # ✅ Prevent accidental deletion
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