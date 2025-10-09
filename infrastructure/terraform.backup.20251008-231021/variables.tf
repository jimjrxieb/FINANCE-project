# ============================================================================
# TERRAFORM VARIABLES - INTENTIONALLY INSECURE
# ============================================================================

# Deployment Target - LocalStack vs AWS
variable "deployment_target" {
  description = "Where to deploy: localstack or aws"
  type        = string
  default     = "localstack"

  validation {
    condition     = contains(["localstack", "aws"], var.deployment_target)
    error_message = "Must be 'localstack' or 'aws'"
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "LocalStack endpoint URL"
  type        = string
  default     = "http://localhost:4566"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

# ❌ PCI 8.2.1: Default credentials in variables
variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "admin"  # ❌ CRITICAL: Default username!

  # PROPER: No default, force user to provide
  # sensitive = false  # Should be true
}

variable "db_password" {
  description = "Database admin password"
  type        = string
  default     = "supersecret"  # ❌ CRITICAL: Hardcoded password!

  # PROPER: Should use sensitive = true and no default
  # sensitive = true
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "securebank"
}