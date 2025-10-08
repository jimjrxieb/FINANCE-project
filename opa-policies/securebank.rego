# ============================================================================
# OPA POLICY: SecureBank PCI-DSS Compliance
# ============================================================================
# What a Cloud Security Engineer would write:
# - Role-based access control (RBAC)
# - PCI-DSS requirement enforcement
# - Prevent data exfiltration
# - Audit policy decisions
#
# ❌ INTENTIONAL: Policies exist but NOT ENFORCED in application code!
# ============================================================================

package securebank

import future.keywords.if
import future.keywords.in

# ============================================================================
# DEFAULT DENY
# ============================================================================

default allow = false

# ============================================================================
# ADMIN RULES
# ============================================================================

# Allow admin full access
allow if {
    input.user.role == "admin"
    input.user.mfa_verified  # ❌ But MFA not implemented!
}

# ❌ INTENTIONAL VIOLATION: Admin without MFA can still access some endpoints
allow if {
    input.user.role == "admin"
    input.resource != "admin"  # Admin panel requires MFA
}

# ============================================================================
# MERCHANT RULES
# ============================================================================

# Merchants can read their own payments
allow if {
    input.user.role == "merchant"
    input.action == "read"
    input.resource == "payment"
    input.user.id == to_number(input.merchant_id)  # ❌ But app doesn't pass this!
}

# Merchants can create payments
allow if {
    input.user.role == "merchant"
    input.action == "create"
    input.resource == "payment"
}

# Merchants can read their own data
allow if {
    input.user.role == "merchant"
    input.action == "read"
    input.resource == "merchant"
    input.user.id == to_number(input.merchant_id)
}

# ============================================================================
# GUEST/UNAUTHENTICATED RULES
# ============================================================================

# Allow unauthenticated access to auth endpoints
allow if {
    input.resource == "auth"
    input.action in ["create", "read"]  # Login, register
}

# ❌ INTENTIONAL VIOLATION: Health check exposes system info
allow if {
    input.path == "/health"
}

# ============================================================================
# PCI-DSS VIOLATION DETECTION
# ============================================================================

# Deny access to "all payments" endpoint (PCI 7.1)
deny["PCI-DSS 7.1: Cannot access all payments"] if {
    input.path == "/api/payments/list"
    input.user.role != "admin"
}

# Deny CVV exposure in API responses (PCI 3.2.2)
deny_cvv_exposure[msg] if {
    some i
    input.response.data[i].cvv
    msg := sprintf("PCI-DSS 3.2.2 CRITICAL: CVV in API response at index %v", [i])
}

# Deny PIN exposure (PCI 3.2.3)
deny_pin_exposure[msg] if {
    some i
    input.response.data[i].pin
    msg := sprintf("PCI-DSS 3.2.3 CRITICAL: PIN in API response at index %v", [i])
}

# Deny full PAN exposure (PCI 3.3)
deny_full_pan[msg] if {
    some i
    card_number := input.response.data[i].card_number
    count(card_number) > 4  # More than last 4 digits
    not contains(card_number, "*")  # Not masked
    msg := sprintf("PCI-DSS 3.3: Full PAN exposed at index %v", [i])
}

# ============================================================================
# PASSWORD POLICY ENFORCEMENT
# ============================================================================

# Deny weak passwords (PCI 8.2)
deny_weak_password[msg] if {
    input.action == "create"
    input.resource in ["auth", "merchant"]
    password := input.body.password
    count(password) < 12
    msg := "PCI-DSS 8.2: Password must be at least 12 characters"
}

deny_weak_password[msg] if {
    input.action == "create"
    input.resource in ["auth", "merchant"]
    password := input.body.password
    not regex.match(`[A-Z]`, password)
    msg := "PCI-DSS 8.2: Password must contain uppercase letter"
}

deny_weak_password[msg] if {
    input.action == "create"
    input.resource in ["auth", "merchant"]
    password := input.body.password
    not regex.match(`[a-z]`, password)
    msg := "PCI-DSS 8.2: Password must contain lowercase letter"
}

deny_weak_password[msg] if {
    input.action == "create"
    input.resource in ["auth", "merchant"]
    password := input.body.password
    not regex.match(`[0-9]`, password)
    msg := "PCI-DSS 8.2: Password must contain number"
}

deny_weak_password[msg] if {
    input.action == "create"
    input.resource in ["auth", "merchant"]
    password := input.body.password
    not regex.match(`[!@#$%^&*]`, password)
    msg := "PCI-DSS 8.2: Password must contain special character"
}

# ============================================================================
# MFA ENFORCEMENT
# ============================================================================

# Require MFA for admin actions (PCI 8.3)
deny_no_mfa[msg] if {
    input.user.role == "admin"
    not input.user.mfa_verified
    input.resource in ["merchant", "payment", "admin"]
    input.action in ["create", "update", "delete"]
    msg := "PCI-DSS 8.3: Admin requires MFA for sensitive actions"
}

# ============================================================================
# AUDIT REQUIREMENTS
# ============================================================================

# Flag cardholder data access for audit logging (PCI 10.2)
requires_audit if {
    input.resource == "payment"
    input.action == "read"
}

requires_audit if {
    input.resource == "payment"
    input.action in ["create", "update", "delete"]
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Check if user owns the resource
owns_resource(resource_id) if {
    to_string(input.user.id) == to_string(resource_id)
}