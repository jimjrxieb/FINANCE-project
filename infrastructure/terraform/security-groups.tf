# ============================================================================
# SECURITY GROUPS - OVERLY PERMISSIVE
# ============================================================================
# ❌ PCI 1.2.1: Security group allows all inbound traffic
# ❌ PCI 1.3.1: Allows 0.0.0.0/0 to database
# ============================================================================

resource "aws_security_group" "allow_all" {
  name        = "${var.project_name}-allow-all"
  description = "Allow all inbound traffic"  # ❌ CRITICAL!
  vpc_id      = aws_vpc.main.id

  # ❌ PCI 1.3.1: Allows 0.0.0.0/0 to database
  ingress {
    description = "Allow all inbound"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # ❌ CRITICAL: Open to internet!
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-allow-all"
  }
}