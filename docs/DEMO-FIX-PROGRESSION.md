# Demo Fix Progression - SecureBank DevSecOps Workflow

**Date:** October 8, 2025
**Branch:** `fix/secops-secured`
**Base Branch:** `demo/securebank-broken`
**Status:** 🟡 IN PROGRESS (30% Complete)

---

## Project Overview

**Purpose:** Demonstrate complete DevSecOps workflow from insecure baseline to production-ready secure application

**Demo Flow:**
1. **Baseline** (`demo/securebank-broken`) - 106+ PCI-DSS violations, fully functional
2. **LocalStack Testing** - Test fixes in AWS-compatible sandbox (free)
3. **Security Fixes** (`fix/secops-secured`) - This branch
4. **Deployment** - Deploy to real AWS with OPA policy enforcement
5. **Validation** - Show compliance + cost savings ($950K/month in fines avoided)

**Target Audiences:**
- **FIS (Fidelity)** - Entry-to-mid level DevOps/Cloud Security Engineer role
- **Jade/Constant (GP-Copilot)** - AI-assisted DevSecOps platform for Guidepoint partnership

---

## Current Progress

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Working insecure baseline application
- [x] All 106+ violations visible and documented
- [x] LocalStack integration working
- [x] Frontend displaying CVV/PIN correctly
- [x] Database with test transaction data
- [x] Complete troubleshooting documentation

### 🟡 Phase 2: Security Infrastructure (IN PROGRESS - 30%)
- [x] Created standard directory structure
  - `.github/workflows/` for CI/CD
  - `policies/opa/` for policy-as-code
  - `scripts/` for automation
  - `docs/` for documentation
- [x] Moved OPA policy to correct location (`policies/opa/securebank.rego`)
- [x] **Created comprehensive CI/CD security pipeline** (GitHub Actions)
  - SAST scanning (Semgrep)
  - Secret detection (Gitleaks)
  - Dependency scanning (npm audit + SBOM generation)
  - Container image scanning (Trivy)
  - OPA policy testing
  - Terraform security scanning (tfsec + Checkov)
  - Kubernetes manifest scanning (kubesec + kube-linter)
  - **PCI-DSS compliance validation** (CVV/PIN checks, encryption, network isolation)
  - Security report generation
- [ ] Backend security fixes (NOT STARTED)
- [ ] Frontend security fixes (NOT STARTED)
- [ ] Infrastructure security fixes (NOT STARTED)
- [ ] Deployment automation scripts (NOT STARTED)
- [ ] Security documentation (NOT STARTED)

### ⏳ Phase 3: Backend Security Fixes (NOT STARTED - 0%)
- [ ] Remove CVV storage from database schema
- [ ] Remove PIN storage from database schema
- [ ] Implement card tokenization (store tokens, not full PANs)
- [ ] Integrate AWS Secrets Manager for credentials
- [ ] Implement data encryption at rest (KMS)
- [ ] Add field-level encryption for sensitive data
- [ ] Increase bcrypt rounds from 4 to 12+
- [ ] Implement httpOnly secure cookies (not localStorage)
- [ ] Add rate limiting middleware
- [ ] Implement input validation/sanitization
- [ ] Add comprehensive audit logging
- [ ] Integrate OPA middleware for access control
- [ ] Add HTTPS/TLS enforcement

### ⏳ Phase 4: Frontend Security Fixes (NOT STARTED - 0%)
- [ ] Mask card numbers (show only last 4 digits)
- [ ] Remove CVV display completely
- [ ] Remove PIN display completely
- [ ] Implement Content Security Policy (CSP) headers
- [ ] Add X-Frame-Options, X-Content-Type-Options
- [ ] Remove sensitive data from localStorage
- [ ] Implement secure session management
- [ ] Add XSS protection
- [ ] Update API calls to use secure endpoints

### ⏳ Phase 5: Infrastructure Security Fixes (NOT STARTED - 0%)
- [ ] Make RDS private (no public access)
- [ ] Enable RDS encryption at rest
- [ ] Make S3 buckets private
- [ ] Enable S3 encryption (SSE-KMS)
- [ ] Implement VPC with private subnets
- [ ] Create proper security groups (least privilege)
- [ ] Add NAT Gateway for outbound traffic
- [ ] Implement network ACLs
- [ ] Add WAF rules
- [ ] Configure KMS encryption keys
- [ ] Secure Kubernetes manifests:
  - Remove privileged containers
  - Add security contexts (non-root user)
  - Implement network policies
  - Add resource limits
  - Remove hardcoded secrets (use K8s secrets)
  - Add pod security policies

### ⏳ Phase 6: Deployment Automation (NOT STARTED - 0%)
- [ ] Create `deploy-localstack.sh` script
- [ ] Create `deploy-aws.sh` script
- [ ] Create `security-scan.sh` script
- [ ] Create `rollback.sh` script
- [ ] Implement blue-green deployment strategy
- [ ] Add deployment health checks
- [ ] Create infrastructure validation tests

### ⏳ Phase 7: Documentation (NOT STARTED - 0%)
- [ ] Write SECURITY-FIXES.md (what was changed)
- [ ] Write COMPLIANCE-REPORT.md (PCI-DSS status)
- [ ] Write DEPLOYMENT-GUIDE.md (how to deploy)
- [ ] Write COST-ANALYSIS.md (savings calculation)
- [ ] Update README.md for secure version

### ⏳ Phase 8: Testing & Validation (NOT STARTED - 0%)
- [ ] Test LocalStack deployment
- [ ] Verify all security controls
- [ ] Run security scanner (should pass)
- [ ] Test AWS deployment
- [ ] Validate OPA policy enforcement
- [ ] Perform penetration testing
- [ ] Document test results

---

## Files Created So Far

### ✅ New Files (This Session)
```
.github/
└── workflows/
    └── securebank-security.yml    # Comprehensive security CI/CD pipeline

policies/
└── opa/
    └── securebank.rego            # PCI-DSS compliance policies (moved from opa-policies/)

docs/
└── DEMO-FIX-PROGRESSION.md        # This file (save point)
```

### 🔄 Modified Files
```
(None yet - all changes are new additions)
```

### ❌ Removed Files
```
SecOps/                            # Non-standard directory structure
├── backend-sec/                   # Empty placeholder (removed)
├── frontend-sec/                  # Empty placeholder (removed)
├── deploy-sec/                    # Empty placeholder (removed)
└── infra-sec/securebank.rego     # Moved to policies/opa/
```

---

## Key Decisions Made

### 1. Directory Structure
**Decision:** Use industry-standard structure
- `.github/workflows/` for CI/CD (not custom names)
- `policies/opa/` for OPA policies (not `infra-sec/`)
- `scripts/` for automation (not `deploy-sec/`)
- `docs/` for documentation

**Rationale:**
- Reviewers expect standard conventions
- GitHub Actions requires `.github/workflows/`
- Makes project professional and maintainable

### 2. CI/CD Pipeline
**Decision:** Comprehensive security scanning in GitHub Actions
- Multiple scanning tools (defense in depth)
- PCI-DSS specific compliance checks
- Security report generation

**Rationale:**
- Demonstrates senior-level DevSecOps knowledge
- Shows understanding of compliance requirements
- Automated validation prevents manual errors

### 3. OPA Policy Location
**Decision:** Move from `opa-policies/` to `policies/opa/`
**Rationale:**
- Allows for multiple policy types (OPA, Rego, Sentinel)
- Standard convention in enterprise projects

---

## Technical Architecture

### Current Baseline (demo/securebank-broken)
```
┌─────────────────────────────────────────────────────────────┐
│                    INSECURE BASELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React)                                           │
│  ├── Displays full card numbers                            │
│  ├── Displays CVV codes (123, 456, 789)                   │
│  ├── Displays PIN codes (1234, 5678, 9012)                │
│  ├── HTTP only (no HTTPS)                                  │
│  └── Tokens in localStorage                                │
│                                                             │
│  Backend (Node.js)                                          │
│  ├── Stores CVV in database (PCI 3.2.2 violation)         │
│  ├── Stores PIN in database (PCI 3.2.3 violation)         │
│  ├── Weak bcrypt (4 rounds)                                │
│  ├── No encryption at rest                                 │
│  └── No access control                                     │
│                                                             │
│  Database (PostgreSQL)                                      │
│  ├── Contains: card_number, cvv, pin, expiry              │
│  ├── Public access                                          │
│  └── Unencrypted                                           │
│                                                             │
│  Infrastructure                                             │
│  ├── Public RDS (0.0.0.0/0)                               │
│  ├── Public S3 buckets                                     │
│  ├── Privileged K8s containers                             │
│  └── No network segmentation                               │
│                                                             │
│  TOTAL: 106+ PCI-DSS Violations                            │
│  COST: $950,000/month in fines                             │
└─────────────────────────────────────────────────────────────┘
```

### Target Secure Architecture (fix/secops-secured)
```
┌─────────────────────────────────────────────────────────────┐
│                    SECURE VERSION                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React)                                           │
│  ├── Masked card numbers (****1234)                        │
│  ├── No CVV display                                         │
│  ├── No PIN display                                         │
│  ├── HTTPS with TLS 1.3                                     │
│  ├── CSP headers                                            │
│  └── Secure httpOnly cookies                                │
│                                                             │
│  Backend (Node.js)                                          │
│  ├── No CVV storage                                         │
│  ├── No PIN storage                                         │
│  ├── Card tokenization                                      │
│  ├── AWS Secrets Manager integration                       │
│  ├── Strong bcrypt (12+ rounds)                            │
│  ├── Field-level encryption (KMS)                          │
│  ├── OPA policy enforcement                                │
│  ├── Rate limiting                                          │
│  └── Input validation                                      │
│                                                             │
│  Database (PostgreSQL)                                      │
│  ├── Tokens only (no full PANs)                            │
│  ├── Private subnet only                                    │
│  ├── Encrypted at rest (KMS)                               │
│  └── Encrypted in transit (TLS)                            │
│                                                             │
│  Infrastructure                                             │
│  ├── Private RDS (VPC only)                                │
│  ├── Private S3 (bucket policies)                          │
│  ├── Encrypted storage (KMS)                               │
│  ├── Non-privileged containers                             │
│  ├── Network policies                                       │
│  ├── Security groups (least privilege)                     │
│  └── WAF protection                                         │
│                                                             │
│  CI/CD Pipeline                                             │
│  ├── SAST (Semgrep)                                        │
│  ├── Secret scanning (Gitleaks)                            │
│  ├── SCA (npm audit + SBOM)                                │
│  ├── Container scanning (Trivy)                            │
│  ├── IaC scanning (tfsec, Checkov)                         │
│  ├── K8s scanning (kubesec, kube-linter)                   │
│  ├── OPA policy tests                                       │
│  └── PCI-DSS validation                                    │
│                                                             │
│  TOTAL: 0 PCI-DSS Violations                               │
│  SAVINGS: $950,000/month avoided                           │
└─────────────────────────────────────────────────────────────┘
```

---

## PCI-DSS Violations Tracker

### Requirements to Fix (106+ Total)

#### Application Layer (46 violations)
| Requirement | Violation | Status | Priority |
|-------------|-----------|--------|----------|
| PCI 3.2.2 | Storing CVV in database | ❌ Not Fixed | CRITICAL |
| PCI 3.2.3 | Storing PIN in database | ❌ Not Fixed | CRITICAL |
| PCI 3.3 | Displaying full PAN | ❌ Not Fixed | HIGH |
| PCI 3.4 | No encryption at rest | ❌ Not Fixed | CRITICAL |
| PCI 4.1 | HTTP instead of HTTPS | ❌ Not Fixed | HIGH |
| PCI 7.1 | No access control | ❌ Not Fixed | HIGH |
| PCI 8.2 | Weak passwords (bcrypt 4) | ❌ Not Fixed | HIGH |
| PCI 8.2.8 | Tokens in localStorage | ❌ Not Fixed | MEDIUM |
| PCI 10.1 | Logging sensitive data | ❌ Not Fixed | MEDIUM |

#### Infrastructure Layer (20 violations)
| Requirement | Violation | Status | Priority |
|-------------|-----------|--------|----------|
| PCI 1.2 | Public RDS database | ❌ Not Fixed | CRITICAL |
| PCI 1.3 | Public S3 buckets | ❌ Not Fixed | CRITICAL |
| PCI 3.4 | Unencrypted RDS | ❌ Not Fixed | CRITICAL |
| PCI 3.4 | Unencrypted S3 | ❌ Not Fixed | CRITICAL |
| PCI 1.2 | Security groups 0.0.0.0/0 | ❌ Not Fixed | HIGH |

#### Kubernetes Layer (25 violations)
| Requirement | Violation | Status | Priority |
|-------------|-----------|--------|----------|
| PCI 2.2.4 | Privileged containers | ❌ Not Fixed | CRITICAL |
| PCI 2.2.4 | Running as root | ❌ Not Fixed | HIGH |
| PCI 1.2 | No network policies | ❌ Not Fixed | HIGH |
| PCI 2.2.4 | No resource limits | ❌ Not Fixed | MEDIUM |
| PCI 8.2.8 | Hardcoded secrets | ❌ Not Fixed | HIGH |

#### CI/CD Layer (15 violations)
| Requirement | Violation | Status | Priority |
|-------------|-----------|--------|----------|
| PCI 6.3.2 | No SAST scanning | ✅ FIXED | HIGH |
| PCI 6.3.2 | No container scanning | ✅ FIXED | HIGH |
| PCI 6.3.2 | No SBOM generation | ✅ FIXED | MEDIUM |
| PCI 6.4.6 | Direct prod deployment | ❌ Not Fixed | HIGH |

**Fixed So Far:** 3/106 (2.8%)
**Priority:** Focus on CRITICAL violations first (CVV/PIN storage, encryption, public access)

---

## Demo Script (For Interview)

### Part 1: Show the Problem (5 min)
```bash
# On demo/securebank-broken branch
git checkout demo/securebank-broken
docker-compose up -d

# Open browser to http://localhost:3001
# Login: admin / admin123
# Point out:
# - Full card numbers visible
# - CVV codes displayed (123, 456, 789)
# - PIN codes displayed (1234, 5678, 9012)
# - "This would cost $950K/month in PCI-DSS fines"
```

### Part 2: Show the Fix (10 min)
```bash
# Switch to fix branch
git checkout fix/secops-secured

# Show CI/CD pipeline
cat .github/workflows/securebank-security.yml

# Explain:
# - Comprehensive security scanning
# - PCI-DSS compliance validation
# - Automated checks prevent human error

# Show OPA policy
cat policies/opa/securebank.rego

# Explain:
# - Policy-as-Code
# - Enforces access control
# - Validates compliance
```

### Part 3: Show the Deployment (5 min)
```bash
# Test in LocalStack first (free)
./scripts/deploy-localstack.sh

# Deploy to AWS
./scripts/deploy-aws.sh

# Show security scan results
# All checks passing ✅

# Show cost savings
# $950K/month avoided ✅
```

### Part 4: Q&A Points
- **DevOps Skills:** Docker, Terraform, AWS, LocalStack, CI/CD
- **Security Knowledge:** PCI-DSS, SAST, SCA, container scanning, OPA
- **Automation:** GitHub Actions, deployment scripts, policy enforcement
- **Real-world Experience:** Sandbox → Fix → Deploy workflow

---

## Next Steps (When You Return)

### Immediate Priority (Critical Fixes)
1. **Backend: Remove CVV/PIN Storage**
   ```bash
   # Remove cvv and pin columns from schema
   # Implement tokenization
   # Add encryption layer
   ```

2. **Backend: Integrate AWS Secrets Manager**
   ```bash
   # Store DB credentials in Secrets Manager
   # Update connection logic
   ```

3. **Frontend: Mask Card Display**
   ```bash
   # Show only last 4 digits
   # Remove CVV/PIN display completely
   ```

### Medium Priority (Security Hardening)
4. **Infrastructure: Make RDS Private**
5. **Infrastructure: Enable Encryption**
6. **Backend: Increase bcrypt rounds**
7. **Frontend: Implement CSP headers**

### Low Priority (Nice to Have)
8. **Kubernetes: Security contexts**
9. **Documentation: Write compliance report**
10. **Testing: Penetration testing**

---

## Commands to Resume Work

```bash
# Verify you're on the right branch
git branch
# Should show: * fix/secops-secured

# Check what's been done
git status
git log --oneline -5

# Continue building fixes
# (Start with backend CVV/PIN removal)

# When done, commit and push
git add -A
git commit -m "Add [description of fixes]"
git push origin fix/secops-secured
```

---

## Repository State

### Branches
- `main` - Original baseline
- `demo/securebank-broken` - Working insecure version (106+ violations)
- `fix/secops-secured` - **THIS BRANCH** - Security fixes in progress

### Services Status
```
✅ Frontend:   http://localhost:3001 (working on broken branch)
✅ Backend:    http://localhost:3000 (working on broken branch)
✅ Database:   localhost:5432 (test data loaded)
✅ LocalStack: http://localhost:4566 (healthy, S3/IAM/Secrets available)
```

### Git Status (fix/secops-secured)
```
Modified:   .claude/settings.local.json
Deleted:    opa-policies/securebank.rego
Added:      .github/workflows/securebank-security.yml
Added:      policies/opa/securebank.rego
Added:      docs/DEMO-FIX-PROGRESSION.md
```

**Uncommitted changes present - remember to commit before pushing!**

---

## Resources & References

### Documentation
- [PCI-DSS v4.0 Requirements](https://www.pcisecuritystandards.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### Tools Used
- **SAST:** Semgrep
- **Secret Detection:** Gitleaks
- **SCA:** npm audit, CycloneDX
- **Container Scanning:** Trivy
- **IaC Scanning:** tfsec, Checkov
- **K8s Scanning:** kubesec, kube-linter
- **Policy Engine:** Open Policy Agent (OPA)

---

## Notes & Learnings

### What Went Well
- ✅ Created comprehensive CI/CD pipeline with 8 different security scans
- ✅ Moved to industry-standard directory structure
- ✅ LocalStack working for sandbox testing
- ✅ Complete baseline documentation (TROUBLESHOOTING-SESSION.md, CURRENT-WORKING-STATE.md)

### Challenges Encountered
- LocalStack tmpfs mount issues (resolved by changing DATA_DIR)
- Frontend build caching (resolved with docker cp + rebuild)
- Network configuration changes requiring full restart

### Time Estimates
- **CI/CD Pipeline:** 1 hour ✅ DONE
- **Backend Fixes:** 3-4 hours (estimated)
- **Frontend Fixes:** 2 hours (estimated)
- **Infrastructure Fixes:** 4-5 hours (estimated)
- **Documentation:** 2 hours (estimated)
- **Testing:** 2 hours (estimated)

**Total Remaining:** ~13-15 hours of work

---

## Success Metrics

### For FIS Interview
- [ ] Demonstrate complete DevSecOps workflow
- [ ] Show security scanning results (before/after)
- [ ] Explain PCI-DSS requirements
- [ ] Deploy to real AWS infrastructure
- [ ] Calculate cost savings ($950K/month)

### For GP-Copilot Demo (Jade/Constant)
- [ ] Show AI-assisted fixing workflow
- [ ] Demonstrate 30x workforce multiplier concept
- [ ] Explain shadow clone deployment model
- [ ] Present partnership opportunity with Guidepoint
- [ ] Live demo during interview

---

## Contact & Project Info

**Project:** SecureBank - Intentionally Insecure Banking Platform
**Location:** `/home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project`
**GitHub:** (private repo)
**Status:** Active Development

**Created By:** Claude Code (AI Assistant)
**Last Updated:** October 8, 2025 - 3:45 PM UTC
**Next Session:** TBD

---

## Quick Reference

### Key Files to Edit Next
1. `backend/models/Payment.js` - Remove CVV/PIN columns
2. `backend/config/secrets.js` - Add Secrets Manager
3. `frontend/src/components/TransactionCard.tsx` - Mask card numbers
4. `infrastructure/terraform/rds.tf` - Make private + encrypt
5. `infrastructure/terraform/s3.tf` - Make private + encrypt

### Commands You'll Need
```bash
# Backend database migration
docker-compose exec -T db psql -U postgres -d securebank -c "ALTER TABLE payments..."

# Rebuild frontend
docker-compose exec -T frontend npm run build

# Test Terraform
cd infrastructure/terraform
terraform plan -var="deployment_target=localstack"

# Run security scans
./scripts/security-scan.sh
```

---

**END OF SAVE POINT**

**Resume from here when you return!** 🚀
