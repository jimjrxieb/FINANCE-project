# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "RDS endpoint (PUBLIC - CRITICAL VIOLATION!)"
  value       = var.deployment_target == "aws" && length(aws_db_instance.payment_db) > 0 ? aws_db_instance.payment_db[0].endpoint : "postgres:5432 (docker-compose)"
}

output "rds_public_ip" {
  description = "RDS is publicly accessible from"
  value       = "0.0.0.0/0 (ENTIRE INTERNET!)"
}

output "s3_payment_receipts" {
  description = "S3 bucket for payment receipts (PUBLIC!)"
  value       = aws_s3_bucket.payment_receipts.bucket
}

output "s3_payment_receipts_url" {
  description = "Public URL to payment receipts"
  value       = "https://${aws_s3_bucket.payment_receipts.bucket}.s3.amazonaws.com/ (PUBLIC READ!)"
}

output "s3_audit_logs" {
  description = "S3 bucket for audit logs (PUBLIC!)"
  value       = aws_s3_bucket.audit_logs.bucket
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint (PUBLIC!)"
  value       = var.deployment_target == "aws" && length(aws_eks_cluster.main) > 0 ? aws_eks_cluster.main[0].endpoint : "N/A (LocalStack - use docker-compose)"
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = var.deployment_target == "aws" && length(aws_eks_cluster.main) > 0 ? aws_eks_cluster.main[0].name : "N/A (LocalStack - use docker-compose)"
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = var.deployment_target == "aws" && length(aws_ecr_repository.backend) > 0 ? aws_ecr_repository.backend[0].repository_url : "N/A (LocalStack - use local Docker)"
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = var.deployment_target == "aws" && length(aws_ecr_repository.frontend) > 0 ? aws_ecr_repository.frontend[0].repository_url : "N/A (LocalStack - use local Docker)"
}

output "deployment_target" {
  description = "Current deployment target"
  value       = var.deployment_target
}

output "warning" {
  description = "SECURITY WARNING"
  value       = <<-EOT
    ⚠️  CRITICAL SECURITY VIOLATIONS DETECTED ⚠️

    This infrastructure contains 20+ intentional PCI-DSS violations:

    1. RDS database is PUBLICLY ACCESSIBLE storing CVV/PIN
    2. S3 buckets are PUBLIC with payment data
    3. EKS cluster endpoint is PUBLIC
    4. Security groups allow 0.0.0.0/0
    5. No encryption at rest (RDS, S3, EKS secrets)
    6. No VPC endpoints (traffic over internet)
    7. IAM roles with Administrator access
    8. No CloudTrail, GuardDuty, Security Hub
    9. Public ECR repositories
    10. Hardcoded credentials in Terraform

    Estimated PCI-DSS fines: $500,000+ per month
    Data breach risk: CRITICAL

    FOR DEMONSTRATION PURPOSES ONLY!
  EOT
}