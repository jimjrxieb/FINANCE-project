# ============================================================================
# SECURITY GROUPS - LEAST PRIVILEGE (PCI-DSS COMPLIANT)
# ============================================================================
# ✅ PCI 1.2.1: Restrict inbound/outbound traffic to necessary only
# ✅ PCI 1.3.1: No direct database access from internet
# ============================================================================

# ALB Security Group (Internet-facing)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "Allow HTTPS from internet to ALB only"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-alb"
    PCI_DSS     = "1.2.1"
    Description = "Public ALB - HTTPS only"
  }
}

# ALB Ingress Rules
resource "aws_security_group_rule" "alb_ingress_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTPS from internet"
  security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_ingress_http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTP redirect to HTTPS"
  security_group_id = aws_security_group.alb.id
}

# ALB Egress Rules
resource "aws_security_group_rule" "alb_egress_backend" {
  type                     = "egress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
  description              = "To backend app"
  security_group_id        = aws_security_group.alb.id
}

# Backend Security Group (Private)
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend"
  description = "Backend app - only from ALB"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-backend"
    PCI_DSS     = "1.2.1"
    Description = "Backend - ALB to DB only"
  }
}

# Backend Ingress Rules
resource "aws_security_group_rule" "backend_ingress_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  description              = "From ALB only"
  security_group_id        = aws_security_group.backend.id
}

# Backend Egress Rules
resource "aws_security_group_rule" "backend_egress_database" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.database.id
  description              = "To database"
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "backend_egress_redis" {
  type                     = "egress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.redis.id
  description              = "To Redis"
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "backend_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  # FIXME: Use VPC endpoints or prefix lists for AWS services
  # For now, restrict to known AWS service ranges
  # Production: Use aws_vpc_endpoint for S3, Secrets Manager, etc.
  cidr_blocks       = ["0.0.0.0/0"]  # TODO: Replace with VPC endpoint
  description       = "AWS API calls"
  security_group_id = aws_security_group.backend.id
}

# Database Security Group (Private - No Internet Access)
resource "aws_security_group" "database" {
  name        = "${var.project_name}-database"
  description = "PostgreSQL - only from backend"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-database"
    PCI_DSS     = "1.3.1"
    Description = "Database - No Internet"
  }
}

# Database Ingress Rules
resource "aws_security_group_rule" "database_ingress_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
  description              = "PostgreSQL from backend only"
  security_group_id        = aws_security_group.database.id
}

# Redis Security Group (Private)
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis"
  description = "Redis - only from backend"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-redis"
    Description = "Redis cache"
  }
}

# Redis Ingress Rules
resource "aws_security_group_rule" "redis_ingress_backend" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
  description              = "Redis from backend only"
  security_group_id        = aws_security_group.redis.id
}

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name        = "${var.project_name}-eks-cluster"
  description = "EKS cluster control plane"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-eks-cluster"
  }
}

# EKS Cluster Ingress Rules
resource "aws_security_group_rule" "eks_cluster_ingress_nodes" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_nodes.id
  description              = "From worker nodes"
  security_group_id        = aws_security_group.eks_cluster.id
}

# EKS Cluster Egress Rules
resource "aws_security_group_rule" "eks_cluster_egress_nodes" {
  type                     = "egress"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_nodes.id
  description              = "To worker nodes"
  security_group_id        = aws_security_group.eks_cluster.id
}

# EKS Worker Nodes Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-eks-nodes"
  description = "EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name                                           = "${var.project_name}-eks-nodes"
    "kubernetes.io/cluster/${var.project_name}"    = "owned"
  }
}

# EKS Nodes Ingress Rules
resource "aws_security_group_rule" "eks_nodes_ingress_self" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  self              = true
  description       = "Node to node"
  security_group_id = aws_security_group.eks_nodes.id
}

resource "aws_security_group_rule" "eks_nodes_ingress_cluster" {
  type                     = "ingress"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_cluster.id
  description              = "From cluster"
  security_group_id        = aws_security_group.eks_nodes.id
}

# EKS Nodes Egress Rules
resource "aws_security_group_rule" "eks_nodes_egress_cluster" {
  type                     = "egress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_cluster.id
  description              = "To cluster"
  security_group_id        = aws_security_group.eks_nodes.id
}

resource "aws_security_group_rule" "eks_nodes_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Internet for images/updates"
  security_group_id = aws_security_group.eks_nodes.id
}

# ============================================================================
# DEFAULT SECURITY GROUP - PCI 1.2.1
# ============================================================================
# ✅ PCI 1.2.1: Restrict default security group to deny all traffic
# Best practice: Never use default SG, always create explicit ones

resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # No ingress rules = deny all inbound
  # No egress rules = deny all outbound

  tags = {
    Name        = "${var.project_name}-default-deny-all"
    PCI_DSS     = "1.2.1"
    Description = "Default SG - Deny All"
  }
}
