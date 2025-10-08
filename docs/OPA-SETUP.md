# OPA (Open Policy Agent) Setup - Intentionally Misconfigured

## 🎯 Overview

This project includes **OPA infrastructure that exists but doesn't enforce policies** - a common real-world security gap that demonstrates why automated compliance checking is critical.

---

## 📊 Current OPA Setup

### ✅ What We HAVE:

| Component | Status | Location | Purpose |
|-----------|--------|----------|---------|
| **OPA Policies** | ✅ Created | `opa-policies/securebank.rego` | PCI-DSS compliance rules |
| **OPA Docker** | ✅ Running | `docker-compose.yml` | Local OPA server |
| **OPA Middleware** | ✅ Coded | `backend/middleware/opa.middleware.js` | API authorization |
| **OPA K8s Deployment** | ✅ Created | `infrastructure/k8s/opa-gatekeeper.yaml` | Gatekeeper + constraints |

### ❌ What's BROKEN (Intentional):

| Violation | PCI Req | Impact |
|-----------|---------|--------|
| **Policies in audit mode only** | 6.6 | Violations logged but not blocked |
| **No mutation webhooks** | 2.2.4 | Can't auto-fix insecure configs |
| **Middleware fails open** | 6.6 | Allows requests when OPA down |
| **Constraints not enforced** | 2.2.1 | Privileged pods still allowed |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                          │
│  ┌──────────────┐    ┌─────────────────┐              │
│  │  Application │───▶│ OPA Gatekeeper  │              │
│  │  Pod Request │    │  (Admission     │              │
│  │              │    │   Controller)   │              │
│  └──────────────┘    └─────────────────┘              │
│         │                      │                        │
│         │              ┌───────▼────────┐              │
│         │              │  Constraint    │              │
│         │              │  Templates     │              │
│         │              │  (Rego Rules)  │              │
│         │              └────────────────┘              │
│         │                      │                        │
│         │              ❌ enforcementAction: dryrun     │
│         │              (Should be "deny"!)              │
│         ▼                                               │
│  ┌──────────────┐                                      │
│  │ Pod Created  │  ← Violations allowed!                │
│  │ (Privileged, │                                       │
│  │  Root User)  │                                       │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│                                                          │
│  ┌──────────────┐    ┌─────────────────┐              │
│  │   API        │───▶│  OPA Middleware │              │
│  │   Request    │    │                 │              │
│  └──────────────┘    └─────────────────┘              │
│                              │                          │
│                    ┌─────────▼──────────┐              │
│                    │  OPA Server        │              │
│                    │  (localhost:8181)  │              │
│                    └────────────────────┘              │
│                              │                          │
│                    ❌ Fails open if OPA down!          │
│                    ❌ Policies not enforced             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Components Explained

### 1. OPA Policies (`opa-policies/securebank.rego`)

**Purpose:** Define PCI-DSS compliance rules in Rego language

**What it checks:**
- ✅ Detects CVV storage in database queries
- ✅ Detects PIN storage in database queries
- ✅ Identifies privileged containers
- ✅ Finds containers running as root
- ✅ Checks for missing resource limits

**❌ Violation:** Policies exist but **not actively enforced** - only log violations

```rego
# Example policy (exists but not enforced)
deny_cvv_storage[msg] {
    input.query
    contains(lower(input.query), "cvv")
    msg := "PCI-DSS 3.2.2 VIOLATION: CVV storage detected!"
}
```

### 2. OPA Middleware (`backend/middleware/opa.middleware.js`)

**Purpose:** Check API requests against OPA policies

**❌ Violation:** **Fails open** when OPA unavailable

```javascript
catch (error) {
  // ❌ CRITICAL: Fails open - allows request!
  console.error('OPA policy check failed:', error.message);
  console.warn('SECURITY WARNING: Failing open - allowing request!');
  return next();  // ❌ Should DENY, not allow!
}
```

**What SHOULD happen:**
```javascript
catch (error) {
  // ✅ Fail closed - deny request
  return res.status(503).json({
    message: 'Policy engine unavailable - request denied'
  });
}
```

### 3. OPA Gatekeeper (Kubernetes Admission Controller)

**Purpose:** Validate and mutate Kubernetes resources before creation

**Components:**

#### a) Constraint Templates
Define reusable policy logic:
- `K8sRequireNonRoot` - Block root containers
- `K8sBlockPrivileged` - Block privileged containers
- `K8sBlockCVVPIN` - Block CVV/PIN in ConfigMaps/Secrets

#### b) Constraints
Apply templates to specific resources:

```yaml
# ❌ IN AUDIT MODE (doesn't block!)
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireNonRoot
metadata:
  name: require-non-root
spec:
  enforcementAction: dryrun  # ❌ Should be "deny"!
  match:
    namespaces:
      - securebank
```

#### c) Mutations (DISABLED)
Automatically fix insecure configurations:

```yaml
# ❌ COMMENTED OUT - Not enforcing!
# apiVersion: mutations.gatekeeper.sh/v1alpha1
# kind: Assign
# metadata:
#   name: add-security-context
# spec:
#   location: "spec.template.spec.securityContext"
#   parameters:
#     assign:
#       value:
#         runAsNonRoot: true  # Would auto-add this
#         runAsUser: 1000
```

---

## 🚀 Deployment

### Local (Docker Compose)

```bash
# OPA server starts automatically
docker-compose up -d

# Check OPA is running
curl http://localhost:8181/health

# Test policy
curl -X POST http://localhost:8181/v1/data/securebank/deny_cvv_storage \
  -d '{"input": {"query": "SELECT cvv FROM payments"}}'

# Response shows violation detected (but not enforced!)
```

### Kubernetes (EKS)

```bash
# 1. Install OPA Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# 2. Deploy OPA server + policies
kubectl apply -f infrastructure/k8s/opa-gatekeeper.yaml

# 3. Verify OPA is running
kubectl get pods -n gatekeeper-system
kubectl get pods -n securebank -l app=opa

# 4. Check constraints (in audit mode)
kubectl get constraints

# 5. View violations (logged but not blocked)
kubectl get k8srequirenonroot require-non-root -o yaml
# Check status.violations - shows violations but pods still created!
```

---

## 🧪 Testing OPA

### Test 1: CVV Storage Detection

```bash
# This SHOULD be blocked but isn't
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "4532015112830366",
    "cvv": "123",
    "pin": "1234"
  }'

# ❌ Payment processed successfully
# ❌ CVV/PIN stored in database
# ✅ OPA logs violation (but doesn't block)
```

**OPA logs:**
```
WARN: PCI-DSS 3.2.2 VIOLATION: CVV storage detected
WARN: Request allowed (fail-open behavior)
```

### Test 2: Privileged Container

```yaml
# Try to create privileged pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-privileged
  namespace: securebank
spec:
  template:
    spec:
      containers:
      - name: test
        image: nginx
        securityContext:
          privileged: true  # ❌ Should be blocked!
```

```bash
kubectl apply -f test-privileged.yaml

# ❌ Pod created successfully (should be denied!)
# ✅ Gatekeeper logs violation

kubectl get k8sblockprivileged block-privileged-containers -o yaml
# Shows violation in status.violations but pod still running
```

### Test 3: Root User Container

```bash
# Backend deployment runs as root
kubectl get deployment securebank-backend -n securebank -o yaml | grep runAsUser
# runAsUser: 0  ← Running as root!

# Check OPA constraint
kubectl get k8srequirenonroot require-non-root -o yaml
# Shows violation detected but enforcementAction: dryrun
```

---

## 📊 Violations Allowed

Because OPA is in **audit mode**, these violations are **logged but not blocked:**

| Violation | Detected | Blocked | Impact |
|-----------|----------|---------|--------|
| CVV storage in DB | ✅ Yes | ❌ No | $500K fine |
| PIN storage in DB | ✅ Yes | ❌ No | $500K fine |
| Privileged containers | ✅ Yes | ❌ No | Container escape |
| Root user | ✅ Yes | ❌ No | Privilege escalation |
| No resource limits | ✅ Yes | ❌ No | DoS attacks |
| Hardcoded secrets | ✅ Yes | ❌ No | Credential leak |

**Total violations logged but not prevented:** 25+ in Kubernetes layer

---

## 🔧 Enabling Enforcement (How to Fix)

### Step 1: Enable Gatekeeper Constraints

```bash
# Edit constraint to change from audit to enforcement
kubectl edit k8srequirenonroot require-non-root -n gatekeeper-system

# Change:
spec:
  enforcementAction: dryrun  # ❌ Audit only

# To:
spec:
  enforcementAction: deny    # ✅ Actually blocks
```

### Step 2: Enable Mutations

```bash
# Uncomment mutation webhooks in opa-gatekeeper.yaml
kubectl apply -f infrastructure/k8s/opa-gatekeeper.yaml

# Now pods automatically get security context added
```

### Step 3: Fix Backend Middleware

```javascript
// backend/middleware/opa.middleware.js
catch (error) {
  // ✅ Fail closed instead of open
  return res.status(503).json({
    message: 'Policy enforcement unavailable - access denied',
    error: 'OPA_UNAVAILABLE'
  });
}
```

### Step 4: Test Enforcement

```bash
# Try to create privileged pod (should fail now)
kubectl apply -f test-privileged.yaml

# Expected output:
# Error from server: admission webhook "validation.gatekeeper.sh" denied the request:
# [block-privileged-containers] Privileged container not allowed (PCI-DSS 2.2.1)
```

---

## 📈 Impact of OPA Enforcement

### Before (Audit Mode):
- Violations: 106+
- Blocked: 0
- Cost exposure: $950K/month

### After (Enforcement Mode):
- Violations detected: 106+
- Violations blocked: 80+
- Violations requiring code fix: 26
- Cost exposure reduced: $750K/month → $200K/month

**Remaining violations** (require code changes, OPA can't auto-fix):
- CVV/PIN storage in application logic
- SQL injection vulnerabilities
- XSS in frontend
- Weak password hashing

---

## 🎯 Demo Points

**Show OPA exists but doesn't enforce:**

1. **Show policies exist:**
   ```bash
   cat opa-policies/securebank.rego
   kubectl get constraints
   ```

2. **Show violations logged:**
   ```bash
   kubectl logs -n gatekeeper-system -l control-plane=audit-controller
   # Shows violations detected
   ```

3. **Show violations NOT blocked:**
   ```bash
   kubectl get pods -n securebank
   # Privileged pods running despite policy
   ```

4. **Show fail-open behavior:**
   ```bash
   # Stop OPA server
   docker-compose stop opa

   # API requests still work (should fail!)
   curl http://localhost:3000/api/payments/process
   ```

5. **ROI of enabling OPA:**
   > "OPA policies exist but aren't enforced. Enabling enforcement would prevent 80+ violations automatically, reducing exposure from $950K to $200K/month - a 79% reduction. This is what GP-Copilot detects and recommends fixing."

---

## 📚 Additional Resources

- [OPA Gatekeeper Docs](https://open-policy-agent.github.io/gatekeeper/)
- [OPA Policy Reference](https://www.openpolicyagent.org/docs/latest/policy-reference/)
- [PCI-DSS Requirement 6.6](https://www.pcisecuritystandards.org/)
- [Kubernetes Admission Controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)

---

## ✅ Summary

**OPA Setup Status:**

✅ **Installed:** OPA server, Gatekeeper, policies, middleware
❌ **Enforced:** Audit mode only - violations logged but not blocked
❌ **Mutations:** Disabled - can't auto-fix configurations
❌ **Fail-safe:** Middleware fails open when OPA unavailable

**This demonstrates a common real-world gap:** Security tools installed but not configured to actually prevent violations.

**GP-Copilot value:** Detects that OPA exists but isn't enforcing, recommends enabling constraint enforcement and mutation webhooks.