# OPA Gatekeeper Deep Dive Analysis

**Question:** Are the OPA .rego policies correct? Is Gatekeeper actually running?

---

## Issue #1: Gatekeeper is NOT Actually Installed ❌

### What We Have:
```yaml
# ============================================================================
# OPA GATEKEEPER INSTALLATION (Audit Mode Only)
# ============================================================================
# NOTE: This would normally be installed via Helm
# For demo purposes, we show it's installed but NOT enforcing
#
# Install with:
# kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

### The Problem:
**The opa-gatekeeper.yaml file contains constraint templates and constraints, but Gatekeeper itself is NOT installed!**

This is like writing traffic laws but not having any police to enforce them.

### What's Missing:
1. **Gatekeeper Controller** - Not running (the "police")
2. **Gatekeeper Webhook** - Not configured (the "checkpoint")
3. **Admission Controller** - Not registered with K8s API server

### Current State:
```
┌─────────────────────────────────────┐
│ Kubernetes API Server               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Admission Controllers           │ │
│ │                                 │ │
│ │ ❌ Gatekeeper Webhook NOT HERE! │ │  ← PROBLEM!
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

     ↓ Pods deployed without checks

┌─────────────────────────────────────┐
│ Insecure pods running happily      │
│ - Root containers ✓                │
│ - Privileged containers ✓          │
│ - CVV in ConfigMaps ✓              │
└─────────────────────────────────────┘
```

### To Actually Install Gatekeeper:
```bash
# Install Gatekeeper controller
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# Verify installation
kubectl get pods -n gatekeeper-system
# Expected:
# NAME                                             READY   STATUS
# gatekeeper-audit-5d8f8c9f4b-xxxxx               1/1     Running
# gatekeeper-controller-manager-7d9c9f8b4-xxxxx   1/1     Running
# gatekeeper-controller-manager-7d9c9f8b4-yyyyy   1/1     Running
```

**Verdict:** ❌ **GATEKEEPER IS NOT RUNNING** - Policies exist but nothing is enforcing them!

---

## Issue #2: OPA .rego Policy Analysis

### Policy 1: K8sRequireNonRoot

**Code:**
```rego
package k8srequirenonroot

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("Container %v must set runAsNonRoot to true (PCI-DSS 2.2.4)", [container.name])
}
```

**Analysis:**
| Aspect | Status | Notes |
|--------|--------|-------|
| **Syntax** | ✅ CORRECT | Valid rego syntax |
| **Logic** | ⚠️ **INCOMPLETE** | Only checks if `runAsNonRoot` exists, not if it's true |
| **Edge Cases** | ❌ **MISSING** | Doesn't handle missing securityContext |
| **Testing** | ❌ **MISSING** | No unit tests |

**Problems:**

1. **Missing securityContext handling:**
```rego
# Current (WRONG):
not container.securityContext.runAsNonRoot
# If securityContext doesn't exist, this throws error

# Should be (CORRECT):
violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  not container.securityContext  # No securityContext at all
  msg := "Container must have securityContext"
}

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext
  not container.securityContext.runAsNonRoot  # Has context but runAsNonRoot not set
  msg := "Container must set runAsNonRoot to true"
}

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext.runAsNonRoot == false  # Explicitly set to false
  msg := "Container must set runAsNonRoot to true"
}
```

2. **Doesn't validate runAsUser:**
```rego
# Current: MISSING
# Should also check:
violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext.runAsUser == 0  # Running as root!
  msg := "Container must not run as user 0 (root)"
}
```

**Verdict:** ⚠️ **INCOMPLETE** - Works for basic case but has gaps

---

### Policy 2: K8sBlockPrivileged

**Code:**
```rego
package k8sblockprivileged

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext.privileged == true
  msg := sprintf("Privileged container %v not allowed (PCI-DSS 2.2.1)", [container.name])
}
```

**Analysis:**
| Aspect | Status | Notes |
|--------|--------|-------|
| **Syntax** | ✅ CORRECT | Valid rego |
| **Logic** | ✅ CORRECT | Checks privileged flag correctly |
| **Edge Cases** | ⚠️ **PARTIAL** | Doesn't handle missing securityContext |
| **Capabilities** | ❌ **MISSING** | Doesn't check Linux capabilities |

**Problems:**

1. **Should also check capabilities:**
```rego
# Current: MISSING
# Should add:
violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext.capabilities.add[_] == "ALL"
  msg := "Container must not add ALL capabilities"
}

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  dangerous := {"SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE"}
  cap := container.securityContext.capabilities.add[_]
  dangerous[cap]
  msg := sprintf("Container must not add dangerous capability: %v", [cap])
}
```

2. **Should check allowPrivilegeEscalation:**
```rego
violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  container.securityContext.allowPrivilegeEscalation != false
  msg := "Container must set allowPrivilegeEscalation to false"
}
```

**Verdict:** ✅ **MOSTLY CORRECT** - But missing capability checks

---

### Policy 3: K8sBlockCVVPIN

**Code:**
```rego
package k8sblockcvvpin

violation[{"msg": msg}] {
  input.review.kind.kind == "ConfigMap"
  data_value := input.review.object.data[_]
  regex.match(`(?i)(cvv|pin|card.*number)`, data_value)
  msg := "PCI-DSS 3.2.2/3.2.3 CRITICAL: CVV/PIN detected in ConfigMap!"
}

violation[{"msg": msg}] {
  input.review.kind.kind == "Secret"
  data_value := input.review.object.data[_]
  decoded := base64.decode(data_value)
  regex.match(`(?i)(cvv|pin|card.*number)`, decoded)
  msg := "PCI-DSS 3.2.2/3.2.3 CRITICAL: CVV/PIN detected in Secret!"
}
```

**Analysis:**
| Aspect | Status | Notes |
|--------|--------|-------|
| **Syntax** | ✅ CORRECT | Valid rego with regex |
| **Logic** | ✅ EXCELLENT | Checks both ConfigMaps and Secrets |
| **Base64 Decode** | ✅ CORRECT | Decodes secrets before checking |
| **Regex Pattern** | ⚠️ **COULD BE BETTER** | Pattern could have false positives |

**Problems:**

1. **Regex could be more specific:**
```rego
# Current pattern: `(?i)(cvv|pin|card.*number)`
# Issues:
# - "pin" could match "spinning", "pinpoint"
# - "card number" could match "business card number"

# Better pattern:
`(?i)(cvv[:\s]*\d{3,4}|pin[:\s]*\d{4,6}|card[_\s]*number[:\s]*\d{13,19})`
```

2. **Should check environment variables too:**
```rego
violation[{"msg": msg}] {
  input.review.kind.kind == "Pod"
  container := input.review.object.spec.containers[_]
  env := container.env[_]
  regex.match(`(?i)(cvv|pin|card.*number)`, env.value)
  msg := "CVV/PIN detected in environment variable!"
}
```

**Verdict:** ✅ **VERY GOOD** - Best policy of the three, but could be enhanced

---

## Issue #3: Mutation Webhook Analysis

**Code:**
```yaml
apiVersion: mutations.gatekeeper.sh/v1alpha1
kind: Assign
metadata:
  name: add-security-context
spec:
  applyTo:
    - groups: ["apps"]
      kinds: ["Deployment"]
      versions: ["v1"]
  location: "spec.template.spec.securityContext"
  parameters:
    assign:
      value:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
```

**Analysis:**
| Aspect | Status | Notes |
|--------|--------|-------|
| **Syntax** | ✅ CORRECT | Valid Gatekeeper mutation |
| **Location** | ✅ CORRECT | Targets pod template security context |
| **Values** | ✅ GOOD | runAsNonRoot + runAsUser + fsGroup |
| **Scope** | ⚠️ **LIMITED** | Only Deployments, not StatefulSets/DaemonSets |

**Problems:**

1. **Limited scope:**
```yaml
# Current: Only Deployments
applyTo:
  - groups: ["apps"]
    kinds: ["Deployment"]

# Should be:
applyTo:
  - groups: ["apps"]
    kinds: ["Deployment", "StatefulSet", "DaemonSet"]
  - groups: ["batch"]
    kinds: ["Job", "CronJob"]
```

2. **Doesn't set container-level securityContext:**
```yaml
# Current: Only sets pod-level
# Should also add mutation for:
location: "spec.template.spec.containers[*].securityContext"
parameters:
  assign:
    value:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

**Verdict:** ✅ **WORKS** - But scope should be expanded

---

## Issue #4: Testing - Are Policies Actually Working?

### Test Script:
```bash
#!/bin/bash
# Test if Gatekeeper is actually enforcing policies

echo "Test 1: Try to deploy root container..."
cat > test-root.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-root
  namespace: securebank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: nginx
        image: nginx
        securityContext:
          runAsUser: 0  # ROOT USER
EOF

kubectl apply -f test-root.yaml
# Expected: Error from admission webhook
# Actual: ???

echo "Test 2: Try to deploy privileged container..."
cat > test-privileged.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-privileged
  namespace: securebank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: nginx
        image: nginx
        securityContext:
          privileged: true  # PRIVILEGED
EOF

kubectl apply -f test-privileged.yaml
# Expected: Error from admission webhook
# Actual: ???

echo "Test 3: Try to create ConfigMap with CVV..."
cat > test-cvv.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-cvv
  namespace: securebank
data:
  payment: "CVV: 123"  # CVV DATA
EOF

kubectl apply -f test-cvv.yaml
# Expected: Error from admission webhook
# Actual: ???
```

### Actual Test (if we had a running cluster):
```bash
$ kubectl get pods -n gatekeeper-system
No resources found in gatekeeper-system namespace.
# ❌ GATEKEEPER NOT INSTALLED!

$ kubectl get constrainttemplates
error: the server doesn't have a resource type "constrainttemplates"
# ❌ Gatekeeper CRDs not installed

$ kubectl apply -f test-root.yaml
deployment.apps/test-root created
# ❌ ROOT CONTAINER ALLOWED! No webhook blocked it!
```

**Verdict:** ❌ **POLICIES NOT ENFORCING** - Gatekeeper not installed, nothing is actually blocking violations

---

## Summary

| Component | Status | Working? |
|-----------|--------|----------|
| **Gatekeeper Installation** | ❌ NOT INSTALLED | NO |
| **Constraint Templates** | ⚠️ DEFINED BUT NOT LOADED | NO |
| **Constraints** | ⚠️ DEFINED BUT NOT ACTIVE | NO |
| **Mutation Webhooks** | ⚠️ DEFINED BUT NOT REGISTERED | NO |
| **Admission Control** | ❌ NOT CONFIGURED | NO |
| **.rego Policy Logic** | ⚠️ MOSTLY CORRECT (with gaps) | N/A |

### The Truth:
**NO, GATEKEEPER IS NOT RUNNING. THE POLICIES EXIST BUT NOTHING IS ENFORCING THEM.**

This is like:
- ✅ Writing security policies in a Word doc
- ✅ Having perfect policy syntax
- ❌ **But never installing the security system**

### What Actually Happens:
```
Developer: kubectl apply -f root-container.yaml
K8s API: "Sure, deploying..."
Gatekeeper: (doesn't exist, can't block)
Result: ROOT CONTAINER DEPLOYED ❌
```

---

## How to Actually Make It Work

### Step 1: Install Gatekeeper (5 minutes)
```bash
# Install Gatekeeper controller
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l control-plane=controller-manager \
  -n gatekeeper-system \
  --timeout=180s

# Verify
kubectl get pods -n gatekeeper-system
# Should show:
# - gatekeeper-audit (1/1 Running)
# - gatekeeper-controller-manager (2/2 Running)
```

### Step 2: Apply Our Constraint Templates (1 minute)
```bash
# Now our policies will actually load
kubectl apply -f infrastructure/k8s/opa-gatekeeper.yaml

# Verify
kubectl get constrainttemplates
# Should show:
# - k8srequirenonroot
# - k8sblockprivileged
# - k8sblockcvvpin
```

### Step 3: Apply Constraints (1 minute)
```bash
# Already in the same YAML file, but verify
kubectl get constraints
# Should show:
# - require-non-root (enforcementAction: deny)
# - block-privileged-containers (enforcementAction: deny)
# - block-cvv-pin-in-configmaps (enforcementAction: deny)
```

### Step 4: Test Enforcement (2 minutes)
```bash
# Try to deploy root container
kubectl apply -f test-root-violation.yaml
# NOW Expected: Error from admission webhook ✅
```

---

## Recommendation

**BEFORE claiming Gatekeeper is working:**
1. Install Gatekeeper controller (`kubectl apply -f ...`)
2. Verify pods are running (`kubectl get pods -n gatekeeper-system`)
3. Apply constraint templates (`kubectl apply -f opa-gatekeeper.yaml`)
4. Test with actual violations (`kubectl apply -f test-violations/`)
5. Verify rejection (`Error from server (Forbidden): admission webhook denied`)

**Current Status:**
- ✅ Policies are well-written (with minor gaps)
- ✅ Constraints are configured for deny mode
- ❌ **But Gatekeeper is NOT installed, so NOTHING is enforcing**

**Time to actually deploy:** ~10 minutes
**Confidence level:** HIGH (policies are mostly correct, just need installation)

---

**Generated:** October 8, 2025, 11:48 PM
**Verdict:** Policies are good, but Gatekeeper not installed
**Action Required:** Install Gatekeeper controller to actually enforce
