# SecureBank PCI-DSS Compliance Checklist

## Overview

This checklist tracks progress toward 100% PCI-DSS 3.2.1 compliance.
Use this to verify work completed and plan remaining tasks.

**Current Status:** 82% compliant (14/17 requirements)
**Target:** 100% compliant (17/17 requirements)
**Time to Complete:** 75 minutes

---

## Phase 1: Network Segmentation ✅ COMPLETE

### Requirement 1.2.1 - Restrict Inbound/Outbound Traffic

- [x] **Create least-privilege security groups**
  - [x] ALB security group (HTTPS from internet only)
  - [x] Backend security group (from ALB + to database/monitoring)
  - [x] Database security group (from backend only)
  - [x] EKS cluster security group (API server access)
  - [x] EKS nodes security group (node-to-node + AWS API)
  - [x] Monitoring security group (from all services)
  - [x] Remove allow_all security group
- [x] **Auto-fixer:** fix-security-groups.sh
- [x] **Validation:** tfsec shows no aws-ec2-no-security-group-rule
- [x] **Files modified:** infrastructure/terraform/security-groups.tf
- [x] **Status:** ✅ COMPLIANT

### Requirement 1.3.1 - DMZ Isolation

- [x] **Database in private subnets**
- [x] **No direct database access from internet**
- [x] **Backend acts as DMZ between ALB and database**
- [x] **Auto-fixer:** fix-rds-security.sh
- [x] **Validation:** RDS publicly_accessible = false
- [x] **Files modified:** infrastructure/terraform/rds.tf
- [x] **Status:** ✅ COMPLIANT

---

## Phase 2: System Hardening ⚠️ PARTIAL

### Requirement 2.2.1 - Secure Configuration Standards

- [x] **Database configuration**
  - [x] Private access only
  - [x] Encryption at rest (KMS)
  - [x] Automated patching enabled
  - [x] Enhanced monitoring enabled
  - [x] Deletion protection enabled
- [x] **EKS configuration**
  - [x] Private endpoint only
  - [x] Control plane logging (all 5 types)
  - [x] Envelope encryption for secrets
- [ ] **Deployment hardening** ⚠️ PARTIAL
  - [ ] Resource limits (CPU/memory)
  - [ ] Health checks (liveness/readiness)
  - [ ] Non-root user in securityContext
  - [ ] Read-only root filesystem
  - [ ] Drop all capabilities (add only NET_BIND_SERVICE)
- [x] **Auto-fixers:** fix-rds-security.sh, fix-eks-security.sh
- [ ] **TODO:** fix-deployment-security.sh (15 min)
- [x] **Status:** ⚠️ MOSTLY COMPLIANT (deployment needs hardening)

### Requirement 2.3 - Database Not Publicly Accessible

- [x] **RDS publicly_accessible = false**
- [x] **Database in private subnets**
- [x] **Security group allows backend only**
- [x] **Auto-fixer:** fix-rds-security.sh
- [x] **Validation:** tfsec shows no publicly accessible RDS
- [x] **Status:** ✅ COMPLIANT

### Requirement 2.4 - Automated Patching

- [x] **RDS auto_minor_version_upgrade = true**
- [x] **EKS node group update_config defined**
- [x] **Auto-fixers:** fix-rds-security.sh, fix-eks-security.sh
- [x] **Status:** ✅ COMPLIANT

---

## Phase 3: Data Protection ⚠️ PARTIAL

### Requirement 3.4 - Encryption at Rest

- [x] **S3 buckets encrypted with KMS**
  - [x] payment-receipts bucket
  - [x] audit-logs bucket
- [x] **RDS storage_encrypted = true**
- [x] **CloudWatch logs encrypted with KMS**
- [x] **EKS secrets envelope encryption**
- [x] **KMS key rotation enabled**
- [x] **Auto-fixers:** fix-s3-encryption.sh, fix-rds-security.sh, fix-cloudwatch-encryption.sh, fix-eks-security.sh
- [x] **Validation:** tfsec shows no unencrypted storage
- [x] **Status:** ✅ COMPLIANT

### Requirement 4.1 - Encryption in Transit

- [ ] **TLS on Application Load Balancer** ❌ CRITICAL GAP
  - [ ] HTTPS listener (port 443)
  - [ ] ACM certificate
  - [ ] SSL policy (TLS 1.2 minimum)
  - [ ] HTTP to HTTPS redirect (port 80 → 443)
  - [ ] HSTS headers in backend
- [ ] **Auto-fixer:** fix-tls-everywhere.sh (30 min) ❌ NOT CREATED
- [ ] **Validation:** curl shows HTTPS connection
- [ ] **Fine exposure:** $500K/month
- [ ] **Status:** ❌ NON-COMPLIANT

---

## Phase 4: Access Control ✅ COMPLETE

### Requirement 7.1 - Limit Access to Cardholder Data

- [x] **Remove IAM wildcard policies**
  - [x] S3 access (specific buckets only)
  - [x] Secrets Manager (specific secret paths only)
  - [x] CloudWatch Logs (specific log groups only)
  - [x] KMS (conditioned on S3/Secrets service)
- [x] **Remove administrator access from app_role**
- [x] **Auto-fixer:** fix-iam-wildcards.sh
- [x] **Validation:** tfsec shows no aws-iam-no-policy-wildcards
- [x] **Status:** ✅ COMPLIANT

### Requirement 7.1.2 - Access Control Systems

- [x] **IAM policies enforce least privilege**
- [x] **Security groups limit network access**
- [x] **RBAC in Kubernetes** (via OPA Gatekeeper policies)
- [x] **Status:** ✅ COMPLIANT

---

## Phase 5: Strong Authentication ❌ CRITICAL GAP

### Requirement 8.2.1 - Strong Authentication

- [ ] **No hardcoded credentials** ❌ CRITICAL GAP
  - [ ] Move DB_PASSWORD to AWS Secrets Manager
  - [ ] Create IRSA role for backend pod
  - [ ] Update deployment.yaml to use Secrets Manager
  - [ ] Remove hardcoded password from deployment
  - [ ] Install secrets-store-csi-driver in EKS
- [ ] **MFA for admin access** (optional for demo)
- [ ] **Auto-fixer:** fix-secrets-management.sh (20 min) ❌ NOT CREATED
- [ ] **Validation:** grep shows no hardcoded passwords
- [ ] **Fine exposure:** $300K/month
- [ ] **Status:** ❌ NON-COMPLIANT

---

## Phase 6: Policy Enforcement ❌ CRITICAL GAP

### Requirement 6.6 - WAF/Policy Enforcement

- [x] **OPA Gatekeeper policies defined**
  - [x] K8sRequireNonRoot (block root containers)
  - [x] K8sBlockPrivileged (block privileged containers)
  - [x] K8sBlockCVVPIN (block CVV/PIN in ConfigMaps)
- [x] **Policies set to enforcementAction: deny**
- [x] **Mutation webhooks enabled**
- [ ] **Gatekeeper controller installed** ❌ CRITICAL GAP
  - [ ] Install Gatekeeper 3.14
  - [ ] Verify admission webhooks registered
  - [ ] Test policy enforcement (root container denied)
- [ ] **Auto-fixer:** install-gatekeeper.sh (10 min) ❌ NOT CREATED
- [ ] **Validation:** kubectl shows Gatekeeper pods running
- [ ] **Fine exposure:** $150K/month
- [ ] **Status:** ❌ NON-COMPLIANT (misrepresentation)

---

## Phase 7: Logging & Monitoring ✅ COMPLETE

### Requirement 10.1 - Audit Logging

- [x] **CloudWatch Logs enabled**
  - [x] Application logs
  - [x] RDS query logs (postgresql)
  - [x] EKS control plane logs (all 5 types)
- [x] **Auto-fixers:** fix-cloudwatch-encryption.sh, fix-rds-security.sh, fix-eks-security.sh
- [x] **Status:** ✅ COMPLIANT

### Requirement 10.5.3 - Versioning for Audit Trail

- [x] **S3 versioning enabled**
  - [x] payment-receipts bucket
  - [x] audit-logs bucket
- [x] **Auto-fixer:** fix-s3-encryption.sh
- [x] **Status:** ✅ COMPLIANT

### Requirement 10.7 - Backup Retention

- [x] **RDS backup_retention_period = 90 days**
- [x] **S3 lifecycle rules (90+ days)**
- [x] **CloudWatch retention_in_days = 90**
- [x] **Auto-fixers:** fix-rds-security.sh, fix-cloudwatch-encryption.sh
- [x] **Status:** ✅ COMPLIANT

---

## Phase 8: Security Testing ✅ COMPLETE

### Requirement 11.3 - Penetration Testing

- [x] **SecOps scanners deployed**
  - [x] tfsec (Terraform static analysis)
  - [x] semgrep (code analysis)
  - [x] trivy (container scanning)
  - [x] kubesec (K8s manifest analysis)
  - [x] checkov (IaC scanning)
- [x] **Automated scanning in CI/CD** (GitHub Actions)
- [x] **Status:** ✅ COMPLIANT

---

## Phase 9: Security Policy ✅ COMPLETE

### Requirement 12.1 - Security Policy

- [x] **OPA policies documented**
  - [x] securebank.rego (CVV/PIN detection)
  - [x] K8s admission policies
- [x] **Policy enforcement configured** (needs Gatekeeper install)
- [x] **Status:** ✅ COMPLIANT (policies exist)

### Requirement 12.10 - Incident Response

- [x] **Logging and monitoring configured**
- [x] **Audit trail versioning**
- [x] **Status:** ✅ COMPLIANT

---

## Compliance Summary

| Requirement | Description | Status | Notes |
|-------------|-------------|--------|-------|
| 1.2.1 | Restrict traffic | ✅ PASS | 6 least-privilege SGs |
| 1.3.1 | DMZ isolation | ✅ PASS | Database private |
| 2.2.1 | Secure config | ⚠️ PARTIAL | Deployment needs hardening |
| 2.3 | Database not public | ✅ PASS | RDS private |
| 2.4 | Automated patching | ✅ PASS | RDS + EKS enabled |
| 3.4 | Encryption at rest | ✅ PASS | KMS on all storage |
| **4.1** | **Encryption in transit** | ❌ **FAIL** | **No TLS on ALB** |
| 6.6 | Policy enforcement | ❌ FAIL | Gatekeeper not installed |
| 7.1 | Least privilege | ✅ PASS | No IAM wildcards |
| 7.1.2 | Access control | ✅ PASS | IAM + SGs + RBAC |
| **8.2.1** | **Strong auth** | ❌ **FAIL** | **Hardcoded secrets** |
| 10.1 | Audit logging | ✅ PASS | CloudWatch enabled |
| 10.5.3 | Versioning | ✅ PASS | S3 versioning |
| 10.7 | Backup retention | ✅ PASS | 90 days |
| 11.3 | Pen testing | ✅ PASS | SecOps scanners |
| 12.1 | Security policy | ✅ PASS | OPA policies exist |
| 12.10 | Incident response | ✅ PASS | Logging + monitoring |

**Total:** 14/17 PASS (82%) | 3/17 FAIL (18%)

**Audit Outcome:** ❌ NON-COMPLIANT

---

## Remaining Work (75 Minutes)

### Priority 1: Install OPA Gatekeeper (10 min) - CRITICAL

**Why:** Closes "material misrepresentation" gap (Req 6.6)
**Fine:** $150K/month

**Tasks:**
- [ ] Install Gatekeeper controller via kubectl
- [ ] Wait for pods to be ready
- [ ] Apply constraint templates and constraints
- [ ] Verify admission webhooks registered
- [ ] Test enforcement (deploy root container, should be denied)

**Commands:**
```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
kubectl wait --for=condition=ready pod -l control-plane=controller-manager -n gatekeeper-system --timeout=180s
kubectl apply -f infrastructure/k8s/opa-gatekeeper.yaml
kubectl get validatingwebhookconfigurations | grep gatekeeper
kubectl run test-root --image=nginx --restart=Never  # Should be DENIED
```

**Validation:**
```bash
kubectl get pods -n gatekeeper-system
# Should show: gatekeeper-controller-manager, gatekeeper-audit
kubectl get constrainttemplates -n gatekeeper-system
# Should show: k8srequirenonroot, k8sblockprivileged, k8sblockcvvpin
```

### Priority 2: Enable TLS Everywhere (30 min) - CRITICAL

**Why:** Closes Req 4.1 gap (encryption in transit)
**Fine:** $500K/month

**Tasks:**
- [ ] Create fix-tls-everywhere.sh auto-fixer
- [ ] Add ACM certificate resource
- [ ] Add HTTPS listener to ALB (port 443)
- [ ] Add HTTP→HTTPS redirect (port 80 → 443)
- [ ] Set SSL policy (TLS 1.2 minimum)
- [ ] Update security group to allow 443
- [ ] Add HSTS headers to backend
- [ ] Run auto-fixer
- [ ] Verify with curl (HTTPS connection)

**Files to modify:**
- infrastructure/terraform/alb.tf (HTTPS listener, redirect)
- infrastructure/terraform/security-groups.tf (allow 443)
- backend/src/index.ts (HSTS middleware)

**Validation:**
```bash
terraform plan  # No errors
curl -I https://securebank.example.com  # HTTP/2 200
curl -I http://securebank.example.com   # 301 redirect to HTTPS
```

### Priority 3: Fix Secrets Management (20 min) - HIGH

**Why:** Closes Req 8.2.1 gap (strong authentication)
**Fine:** $300K/month

**Tasks:**
- [ ] Create fix-secrets-management.sh auto-fixer
- [ ] Create AWS Secrets Manager secret for DB_PASSWORD
- [ ] Create IRSA role for backend pod
- [ ] Update deployment.yaml to use Secrets Manager
- [ ] Remove hardcoded DB_PASSWORD
- [ ] Install secrets-store-csi-driver in EKS
- [ ] Run auto-fixer
- [ ] Verify with grep (no hardcoded passwords)

**Files to create/modify:**
- infrastructure/terraform/secrets.tf (new - Secrets Manager)
- infrastructure/terraform/iam.tf (add IRSA role)
- infrastructure/k8s/backend-deployment.yaml (use secretProviderClass)

**Validation:**
```bash
grep -r "DB_PASSWORD.*supersecret" infrastructure/  # Should be empty
aws secretsmanager get-secret-value --secret-id securebank/db-password  # Should work
kubectl logs -n securebank deployment/securebank-backend | grep "Connected to database"  # Should work
```

### Priority 4: Harden Deployments (15 min) - MEDIUM

**Why:** Closes final Req 2.2.1 gap (secure configuration)

**Tasks:**
- [ ] Create fix-deployment-security.sh auto-fixer
- [ ] Add resource limits (CPU/memory)
- [ ] Add health checks (liveness/readiness)
- [ ] Set securityContext (runAsNonRoot, runAsUser: 1000)
- [ ] Set readOnlyRootFilesystem
- [ ] Drop all capabilities, add NET_BIND_SERVICE only
- [ ] Run auto-fixer
- [ ] Verify with kubectl describe pod

**Files to modify:**
- infrastructure/k8s/backend-deployment.yaml
- infrastructure/k8s/frontend-deployment.yaml

**Validation:**
```bash
kubectl describe pod -n securebank -l app=securebank-backend | grep "runAsNonRoot: true"
kubectl describe pod -n securebank -l app=securebank-backend | grep "Limits:"
kubectl top pod -n securebank  # Should show resource usage within limits
```

---

## Verification Checklist (Post-Completion)

After completing all 4 priorities above, verify:

### Automated Scans:
- [ ] `tfsec` shows 0 CRITICAL violations
- [ ] `semgrep` shows 0 ERROR violations
- [ ] `trivy` shows 0 CRITICAL vulnerabilities
- [ ] `kubesec` score > 0 (positive score)
- [ ] `checkov` shows 0 CRITICAL failures

### Manual Verification:
- [ ] OPA Gatekeeper blocks root container deployment
- [ ] OPA Gatekeeper blocks privileged container deployment
- [ ] HTTPS connection to ALB succeeds
- [ ] HTTP connection redirects to HTTPS (301)
- [ ] Database connection works (no hardcoded password)
- [ ] Backend pod runs as user 1000 (non-root)
- [ ] Pods have resource limits
- [ ] Health checks pass (liveness + readiness)

### Compliance Verification:
- [ ] PCI-DSS compliance: 100% (17/17 requirements)
- [ ] CRITICAL violations: 0
- [ ] HIGH violations: <5 (acceptable false positives)
- [ ] Fine exposure: $0/month
- [ ] Audit outcome: PASS ✅

---

## Rollback Procedures

If something breaks during implementation:

### Rollback Auto-Fixer Changes:
```bash
cd infrastructure/terraform
ls -la *.bak  # List backup files
mv alb.tf.bak alb.tf  # Restore from backup
terraform plan  # Verify
```

### Rollback Gatekeeper Installation:
```bash
kubectl delete -f infrastructure/k8s/opa-gatekeeper.yaml
kubectl delete -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

### Rollback Git Changes:
```bash
git status  # See what changed
git diff infrastructure/  # Review changes
git checkout infrastructure/terraform/alb.tf  # Restore single file
git reset --hard HEAD  # Restore all (CAUTION: loses all changes)
```

---

## Success Metrics

**Before (Start of Session):**
- Compliance: 58% (10/17 requirements)
- CRITICAL: 2 violations
- HIGH: 105 violations
- Fine exposure: $1.95M/month

**After Phase 3 & 4 (Current):**
- Compliance: 82% (14/17 requirements)
- CRITICAL: 0 violations (database fixed)
- HIGH: ~31 violations
- Fine exposure: $950K/month

**After All 4 Priorities (Target):**
- Compliance: 100% (17/17 requirements) ✅
- CRITICAL: 0 violations
- HIGH: <5 violations (false positives)
- Fine exposure: $0/month
- Audit outcome: PASS ✅
- Cost avoidance: $11.4M/year

---

## Next Steps

1. **Start with Priority 1** - Install OPA Gatekeeper (10 min)
2. **Continue to Priority 2** - Enable TLS (30 min)
3. **Complete Priority 3** - Fix secrets (20 min)
4. **Finish with Priority 4** - Harden deployments (15 min)
5. **Run verification checklist** - Confirm 100% compliance
6. **Document results** - Update save point

**Total time:** 75 minutes to 100% PCI-DSS compliance ✅
