# SecureBank SecOps Framework - Quick Start Guide

## Morning Session Jump-Start

This guide gets you productive in **5 minutes** without reading the full save point.

---

## Current Status (1 Minute Read)

**Compliance:** 82% PCI-DSS compliant (14/17 requirements) ✅
**Branch:** `fix/secops-secured`
**Last Session:** Completed Phase 3 (Auto-Remediation) + Phase 4 (Policy Enforcement)

**What's Working:**
- ✅ Database isolated from internet (private, encrypted, 90-day backups)
- ✅ S3 buckets encrypted with KMS, versioning enabled
- ✅ IAM policies use least-privilege (no wildcards)
- ✅ 6 targeted security groups (replaced allow_all)
- ✅ CloudWatch logs encrypted, 90-day retention
- ✅ EKS cluster private endpoint, logging enabled
- ✅ OPA policies configured for deny mode

**What's NOT Working (3 Critical Gaps):**
- ❌ **Gap #1:** OPA Gatekeeper controller NOT INSTALLED (policies exist but don't enforce)
- ❌ **Gap #2:** No TLS on Application Load Balancer (plaintext HTTP)
- ❌ **Gap #3:** Hardcoded DB_PASSWORD in deployment.yaml

**Fine Exposure:** $950K/month until gaps fixed
**Time to 100%:** 75 minutes with 4 auto-fixers

---

## Path to 100% Compliance (5 Minutes)

### Step 1: Install OPA Gatekeeper (10 min) - CRITICAL

**Why:** Policies don't actually enforce without controller installed

```bash
# Install Gatekeeper controller
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# Wait for ready
kubectl wait --for=condition=ready pod -l control-plane=controller-manager -n gatekeeper-system --timeout=180s

# Apply constraint templates
kubectl apply -f infrastructure/k8s/opa-gatekeeper.yaml

# Verify webhooks registered
kubectl get validatingwebhookconfigurations | grep gatekeeper
kubectl get mutatingwebhookconfigurations | grep gatekeeper

# Test enforcement (should be DENIED)
kubectl run test-root --image=nginx --restart=Never
```

**Expected Output:**
```
Error from server: admission webhook "validation.gatekeeper.sh" denied the request:
[require-non-root] Container nginx must set runAsNonRoot to true (PCI-DSS 2.2.4)
```

### Step 2: Enable TLS on ALB (30 min) - CRITICAL

**Create auto-fixer:**

```bash
cd /home/jimmie/linkops-industries/GP-copilot/GP-CONSULTING/secops-framework/3-fixers/auto-fixers
./create-tls-fixer.sh  # Create fix-tls-everywhere.sh
```

**Or manually modify:**

File: `infrastructure/terraform/alb.tf`

```hcl
# Add HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"  # PCI-DSS 4.1
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ACM certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "securebank.example.com"  # Change to your domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

### Step 3: Fix Secrets Management (20 min) - HIGH

**Create auto-fixer:**

```bash
cd /home/jimmie/linkops-industries/GP-copilot/GP-CONSULTING/secops-framework/3-fixers/auto-fixers
./create-secrets-fixer.sh  # Create fix-secrets-management.sh
```

**Or manually:**

File: `infrastructure/terraform/secrets.tf` (new file)

```hcl
# Create secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.project_name}/db-password"
  description = "Database password for SecureBank"
  kms_key_id  = aws_kms_key.securebank.arn
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password  # Move from deployment.yaml
}

# IRSA role for backend pod
resource "aws_iam_role" "backend_pod" {
  name = "${var.project_name}-backend-pod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Condition = {
        StringEquals = {
          "${aws_iam_openid_connect_provider.eks.url}:sub" = "system:serviceaccount:securebank:backend"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "backend_secrets" {
  name = "secrets-access"
  role = aws_iam_role.backend_pod.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = aws_secretsmanager_secret.db_password.arn
    }]
  })
}
```

File: `infrastructure/k8s/backend-deployment.yaml`

```yaml
# BEFORE:
env:
- name: DB_PASSWORD
  value: "supersecret"  # ❌ Hardcoded

# AFTER:
env:
- name: DB_PASSWORD
  valueFrom:
    secretProviderClass:
      name: securebank-secrets
      key: db-password

# Add service account with IRSA annotation
serviceAccountName: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend
  namespace: securebank
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/securebank-backend-pod
```

### Step 4: Harden Deployments (15 min) - MEDIUM

File: `infrastructure/k8s/backend-deployment.yaml`

```yaml
spec:
  template:
    spec:
      containers:
      - name: backend
        image: securebank-backend:latest

        # Add security context
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE

        # Add resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

        # Add health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Verify Fixes Work (2 Minutes)

```bash
# Re-run scanners
cd /home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project
./secops/1-auditors/run-all-scans.sh

# Check results
cat secops/2-findings/tfsec-findings.json | jq '.results[] | select(.severity=="CRITICAL") | length'
# Expected: 0

cat secops/2-findings/semgrep-findings.json | jq '.results[] | select(.extra.severity=="ERROR") | length'
# Expected: 0

# Test Gatekeeper enforcement
kubectl run test-privileged --image=nginx --restart=Never --privileged=true
# Expected: DENIED by K8sBlockPrivileged policy

# Verify TLS
curl -I https://securebank.example.com
# Expected: HTTP/2 200
```

---

## File Locations (Reference)

**Auto-Fixer Scripts:**
- Shared library: `GP-CONSULTING/secops-framework/3-fixers/auto-fixers/`
- Project symlink: `FINANCE-project/secops/3-fixers/`

**Analysis Documents:**
- `FINANCE-project/docs/SESSION-SAVEPOINT-2025-10-09.md` - Full save point
- `FINANCE-project/docs/PCI-DSS-GAP-ANALYSIS.md` - Detailed gap analysis
- `FINANCE-project/docs/OPA-GATEKEEPER-ANALYSIS.md` - Gatekeeper deep dive
- `FINANCE-project/docs/AUDIT-READINESS-ASSESSMENT.md` - Audit simulation

**Infrastructure Files:**
- `infrastructure/terraform/` - AWS resource definitions
- `infrastructure/k8s/` - Kubernetes manifests

---

## Common Issues

### Issue: Gatekeeper Policies Don't Block

**Symptom:** Root container deploys successfully (should be denied)

**Cause:** Gatekeeper controller not installed

**Fix:**
```bash
kubectl get validatingwebhookconfigurations | grep gatekeeper
# If empty, run Step 1 above
```

### Issue: Terraform Plan Fails

**Symptom:** `Error: Duplicate resource` or syntax error

**Cause:** Auto-fixer created duplicate or malformed code

**Fix:**
```bash
# Rollback to backup
cd infrastructure/terraform
mv rds.tf.bak rds.tf  # Example
terraform plan  # Verify
```

### Issue: False Positive CRITICAL Violations

**Symptom:** Scanner flags ALB with 0.0.0.0/0 as CRITICAL

**Cause:** ALBs must be public for HTTPS, scanner can't distinguish

**Fix:**
```hcl
# Add tfsec ignore comment
# tfsec:ignore:aws-ec2-no-public-ingress-sgr ALB must accept HTTPS from internet
ingress {
  cidr_blocks = ["0.0.0.0/0"]
}
```

---

## Quick Commands

```bash
# Show project structure
tree -L 3 -I 'node_modules|.terraform'

# Check git status
git status

# Show recent commits
git log --oneline -10

# Run all scanners
./secops/1-auditors/run-all-scans.sh

# Run all auto-fixers
./secops/3-fixers/auto-fixers/fix-*.sh

# Aggregate findings
./secops/2-findings/aggregate-findings.sh

# Enable Gatekeeper enforcement
./secops/4-mutators/enable-gatekeeper-enforcement.sh

# Verify Kubernetes
kubectl get pods -n securebank
kubectl get validatingwebhookconfigurations
kubectl get constrainttemplates -n gatekeeper-system
```

---

## Next Steps Decision Tree

**Want to reach 100% compliance?**
→ Follow Steps 1-4 above (75 minutes)

**Want to test current state?**
→ Run scanners, deploy to LocalStack, verify fixes

**Want to understand gaps?**
→ Read [PCI-DSS-GAP-ANALYSIS.md](./PCI-DSS-GAP-ANALYSIS.md)

**Want to understand Gatekeeper?**
→ Read [OPA-GATEKEEPER-ANALYSIS.md](./OPA-GATEKEEPER-ANALYSIS.md)

**Want full context?**
→ Read [SESSION-SAVEPOINT-2025-10-09.md](./SESSION-SAVEPOINT-2025-10-09.md)

---

## Success Criteria

After completing Steps 1-4, you should have:

- ✅ PCI-DSS Compliance: 100% (17/17 requirements)
- ✅ CRITICAL violations: 0
- ✅ HIGH violations: <5 (acceptable false positives)
- ✅ Gatekeeper: Installed and enforcing (test with root container denial)
- ✅ TLS: HTTPS on ALB with HTTP→HTTPS redirect
- ✅ Secrets: No hardcoded credentials, Secrets Manager integrated
- ✅ Deployments: Resource limits, health checks, non-root user

**Audit Outcome:** PASS ✅
**Fine Exposure:** $0/month
**Cost Avoidance:** $11.4M/year

---

## Questions?

See full save point: [SESSION-SAVEPOINT-2025-10-09.md](./SESSION-SAVEPOINT-2025-10-09.md)

**Start with Step 1** - Install OPA Gatekeeper (closes biggest audit gap)
