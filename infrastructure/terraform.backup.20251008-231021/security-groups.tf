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

  # Allow HTTPS from internet (ALB only)
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # OK: ALB is public-facing
  }

  # Allow HTTP redirect to HTTPS
  ingress {
    description = "HTTP redirect to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress to backend in private subnets only
  egress {
    description     = "To backend app"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  tags = {
    Name        = "${var.project_name}-alb"
    PCI_DSS     = "1.2.1"
    Description = "Public ALB - HTTPS only"
  }
}

# Backend Security Group (Private)
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend"
  description = "Backend app - only from ALB"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from ALB
  ingress {
    description     = "From ALB only"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Egress to database only
  egress {
    description     = "To database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  # Egress to Redis only
  egress {
    description     = "To Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
  }

  # Egress for AWS API calls (VPC endpoints preferred)
  egress {
    description = "AWS API calls"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-backend"
    PCI_DSS     = "1.2.1"
    Description = "Backend - ALB to DB only"
  }
}

# Database Security Group (Private - No Internet Access)
resource "aws_security_group" "database" {
  name        = "${var.project_name}-database"
  description = "PostgreSQL - only from backend"
  vpc_id      = aws_vpc.main.id

  # ✅ PCI 1.3.1: NO internet access to database
  ingress {
    description     = "PostgreSQL from backend only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # No egress - database shouldn't initiate connections

  tags = {
    Name        = "${var.project_name}-database"
    PCI_DSS     = "1.3.1"
    Description = "Database - No Internet"
  }
}

# Redis Security Group (Private)
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis"
  description = "Redis - only from backend"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from backend only"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  tags = {
    Name        = "${var.project_name}-redis"
    Description = "Redis cache"
  }
}

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name        = "${var.project_name}-eks-cluster"
  description = "EKS cluster control plane"
  vpc_id      = aws_vpc.main.id

  # Allow worker nodes to communicate with cluster
  ingress {
    description     = "From worker nodes"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    description     = "To worker nodes"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = {
    Name = "${var.project_name}-eks-cluster"
  }
}

# EKS Worker Nodes Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-eks-nodes"
  description = "EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  # Allow nodes to communicate with each other
  ingress {
    description = "Node to node"
    from_port   = 0
    to_port     = 65535
    protocol    = "-1"
    self        = true
  }

  # Allow worker nodes to communicate with cluster
  ingress {
    description     = "From cluster"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  # Egress to cluster
  egress {
    description     = "To cluster"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  # Egress for pulling images, updates
  egress {
    description = "Internet for images/updates"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name                                           = "${var.project_name}-eks-nodes"
    "kubernetes.io/cluster/${var.project_name}"    = "owned"
  }
}
