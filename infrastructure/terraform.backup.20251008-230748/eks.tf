# ============================================================================
# EKS - INSECURE KUBERNETES CLUSTER
# ============================================================================
# ❌ PCI 2.2.1: EKS cluster with public endpoint
# ❌ PCI 10.1: Control plane logging disabled
# ❌ PCI 3.4: No envelope encryption for secrets
# ❌ PCI 2.4: No automated patching
# ============================================================================

resource "aws_eks_cluster" "main" {
  # LocalStack has limited EKS support - only deploy on real AWS
  count = var.deployment_target == "aws" ? 1 : 0

  name     = "${var.project_name}-eks"
  role_arn = aws_iam_role.eks_cluster[0].arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    endpoint_private_access = false  # ❌ Should be true
    endpoint_public_access  = true   # ❌ Should be false
    public_access_cidrs     = ["0.0.0.0/0"]  # ❌ CRITICAL!
    security_group_ids      = [aws_security_group.allow_all.id]
  }

  # ❌ PCI 10.1: Control plane logging disabled
  enabled_cluster_log_types = []  # ❌ Should log all

  # ❌ PCI 3.4: No envelope encryption for secrets
  # encryption_config {
  #   provider {
  #     key_arn = aws_kms_key.eks.arn
  #   }
  #   resources = ["secrets"]
  # }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  tags = {
    Name = "${var.project_name}-eks"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  count = var.deployment_target == "aws" ? 1 : 0

  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.project_name}-nodes"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  # ❌ PCI 2.2.1: Using public AMI without hardening
  # ❌ PCI 2.4: No automated patching
  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy
  ]

  tags = {
    Name = "${var.project_name}-node-group"
  }
}

# For LocalStack deployments, use docker-compose instead
# See docker-compose.yml and kubernetes/manifests/ for local K8s setup