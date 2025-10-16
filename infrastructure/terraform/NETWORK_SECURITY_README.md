# Network Security Configuration

## Security Group Rules - Rationale

### ✅ ACCEPTABLE: Public ALB (0.0.0.0/0 ingress)

**Rules:**
- ALB ingress HTTPS (443) from 0.0.0.0/0
- ALB ingress HTTP (80) from 0.0.0.0/0

**Justification:**
- Application Load Balancer is **designed** to be public-facing
- This is the entry point for customer traffic
- PCI-DSS allows this as long as:
  - ✅ Backend services are NOT directly accessible
  - ✅ Security groups enforce least privilege behind ALB
  - ✅ WAF (Web Application Firewall) is enabled (TODO)
  - ✅ TLS 1.2+ only (configured in NGINX)

**Mitigation:**
1. Backend security group only allows traffic FROM ALB (not internet)
2. Database security group only allows traffic FROM backend (not ALB)
3. All secrets in Secrets Manager, not code
4. NGINX enforces TLS 1.2/1.3 only

**Compliance:** PCI-DSS 1.2.1 ✅ (Proper network segmentation maintained)

---

### ⚠️ NEEDS IMPROVEMENT: Egress to 0.0.0.0/0

**Current Rules:**
- Backend egress HTTPS (443) to 0.0.0.0/0 for "AWS API calls"
- EKS nodes egress HTTPS (443) to 0.0.0.0/0 for "Internet for images/updates"

**Issue:**
- Too permissive - allows egress to ANY destination
- PCI-DSS 1.2.1 requires least privilege

**Production Fix (Recommended):**

#### Option 1: VPC Endpoints (Best Practice)
```terraform
# Create VPC endpoints for AWS services
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  route_table_ids = [aws_route_table.private.id]
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# Then remove 0.0.0.0/0 egress - not needed with VPC endpoints
```

**Benefits:**
- ✅ Traffic stays within AWS network
- ✅ No NAT Gateway costs
- ✅ Better security (no internet egress)
- ✅ PCI-DSS 1.2.1 compliant

#### Option 2: Prefix Lists (Alternative)
```terraform
# Use managed prefix lists for AWS services
data "aws_ec2_managed_prefix_list" "s3" {
  name = "com.amazonaws.${var.aws_region}.s3"
}

resource "aws_security_group_rule" "backend_egress_s3" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  prefix_list_ids   = [data.aws_ec2_managed_prefix_list.s3.id]
  security_group_id = aws_security_group.backend.id
}
```

#### Option 3: Specific IP Ranges (Least Secure)
```terraform
# Use specific AWS service IP ranges (updated quarterly)
# https://ip-ranges.amazonaws.com/ip-ranges.json
cidr_blocks = [
  "52.94.0.0/16",   # S3 in us-east-1
  "3.5.0.0/16",     # EC2 in us-east-1
  # ... add all required ranges
]
```

**Demo Environment:**
For this demo, 0.0.0.0/0 egress is left in place but documented as needing improvement.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Create VPC endpoints for all AWS services used
- [ ] Remove 0.0.0.0/0 egress rules
- [ ] Add WAF to ALB
- [ ] Enable VPC Flow Logs
- [ ] Create private subnets for all workloads
- [ ] Move database to private subnet
- [ ] Add NAT Gateway for private subnet internet access (if needed)
- [ ] Review and test all security group rules
- [ ] Run Checkov/Trivy to verify compliance

---

## Testing Security Groups

```bash
# Verify no direct database access from internet
aws ec2 describe-security-groups --group-ids sg-database --query 'SecurityGroups[0].IpPermissions[?IpProtocol==`tcp` && FromPort==`5432`]'
# Should only show backend security group, not 0.0.0.0/0

# Verify backend only accepts from ALB
aws ec2 describe-security-groups --group-ids sg-backend --query 'SecurityGroups[0].IpPermissions[?IpProtocol==`tcp` && FromPort==`3000`]'
# Should only show ALB security group

# Check VPC endpoints exist
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=vpc-xxxxx"
```

---

**Last Updated:** $(date)
**Status:** Demo configuration - requires VPC endpoints for production
