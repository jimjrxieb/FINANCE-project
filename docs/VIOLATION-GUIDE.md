# PCI-DSS VIOLATION GUIDE
## SecureBank Payment Platform - Complete List of Intentional Violations

**Purpose:** This document catalogs all intentional PCI-DSS violations in the SecureBank Payment Platform for GP-Copilot demonstration purposes.

**⚠️ WARNING:** This application is INTENTIONALLY INSECURE and should NEVER be used with real payment card data.

---

## VIOLATION SUMMARY

| Severity | Count | Example |
|----------|-------|---------|
| 🔴 **CRITICAL** | 8 | Storing CVV, SQL Injection, Default credentials |
| 🟠 **HIGH** | 16 | Weak TLS, No RBAC, Exposed database |
| 🟡 **MEDIUM** | 12 | Weak passwords, No MFA, No logging |
| **TOTAL** | **36** | **30+ violations as required** |

---

## CRITICAL VIOLATIONS (8)

### 1. CVV Storage (PCI 3.2.2) 🔴 **LICENSE REVOCATION RISK**
**File:** [backend/models/Payment.js](backend/models/Payment.js)
**Lines:** 20, 46-48
**Violation:** Storing CVV/CVC codes after authorization is **STRICTLY FORBIDDEN** by PCI-DSS.

**Code:**
```javascript
// FORBIDDEN: Storing CVV in database
this.cvv = data.cvv;
```

**Database:** [infrastructure/postgres/init.sql:25](infrastructure/postgres/init.sql#L25)
```sql
cvv VARCHAR(4),  -- ❌ FORBIDDEN!
```

**Impact:**
- **Fine:** $5,000-$100,000 per month
- **License Revocation:** Immediate loss of payment processing license
- **Business Impact:** Cannot process payments = business shutdown

**Remediation:** Remove CVV fields from database, application code, and APIs immediately.

---

### 2. PIN Storage (PCI 3.2.3) 🔴 **LICENSE REVOCATION RISK**
**File:** [backend/models/Payment.js](backend/models/Payment.js)
**Lines:** 22, 49
**Violation:** Storing PIN data is **STRICTLY FORBIDDEN**.

**Code:**
```javascript
// FORBIDDEN: Storing PIN
this.pin = data.pin;
```

**Database:**
```sql
pin VARCHAR(6),  -- ❌ FORBIDDEN!
```

**Impact:** Same as CVV violation - license revocation.

---

### 3. Unencrypted PAN Storage (PCI 3.2.1) 🔴
**File:** [infrastructure/postgres/init.sql:22](infrastructure/postgres/init.sql#L22)
**Violation:** Storing full Primary Account Number without encryption.

**Code:**
```sql
card_number VARCHAR(19),  -- ❌ No encryption!
```

**Impact:**
- **Fine:** $250,000+ per violation
- **Data Breach Cost:** $4M average
- **Class-action lawsuit risk**

**Remediation:** Implement AES-256 encryption or tokenization.

---

### 4. SQL Injection (PCI 6.5.1) 🔴
**File:** [backend/controllers/payment.controller.js:123-130](backend/controllers/payment.controller.js#L123)
**Violation:** Unparameterized SQL queries allow SQL injection attacks.

**Code:**
```javascript
// CRITICAL SQL INJECTION
const query = `SELECT * FROM payments WHERE merchant_id = '${merchantId}'`;
```

**Attack Example:**
```bash
curl "http://localhost:3000/api/payments/merchant/1' OR '1'='1"
# Returns ALL payments from ALL merchants!
```

**Impact:** Complete database compromise, data exfiltration.

**Remediation:** Use parameterized queries:
```javascript
const query = 'SELECT * FROM payments WHERE merchant_id = $1';
await pool.query(query, [merchantId]);
```

---

### 5. Logging Card Data (PCI 10.1) 🔴
**File:** [backend/models/Payment.js:30-35](backend/models/Payment.js#L30)
**Violation:** Logging full card numbers, CVV, and PIN.

**Code:**
```javascript
console.log('Processing payment: Card ${cardNumber}, CVV ${cvv}');
```

**Impact:**
- Card data in log files
- Log aggregation systems contain PANs
- Long-term storage of sensitive data

**Remediation:** Never log card data. Mask if absolutely necessary (show only last 4 digits).

---

### 6. Default Admin Credentials (PCI 2.1) 🔴
**File:** [backend/.env.example:20-21](backend/.env.example#L20)
**Violation:** Hardcoded default credentials.

**Code:**
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**Attack:** Instant account takeover.

**Remediation:** Force password change on first login, generate random credentials.

---

### 7. CSRF Protection Disabled (PCI 6.5.9) 🔴
**File:** [backend/server.js:24](backend/server.js#L24)
**Violation:** Cross-Site Request Forgery protection disabled.

**Code:**
```javascript
app.use(cors({ origin: '*', credentials: true }));
```

**Impact:** Attackers can forge requests from victim's browser.

---

### 8. Plaintext Password Storage (Alternative to BCrypt) 🔴
**File:** [backend/models/Merchant.js:38-40](backend/models/Merchant.js#L38)
**Violation:** Weak password hashing (only 4 rounds instead of 12+).

**Code:**
```javascript
const WEAK_SALT_ROUNDS = 4;  // ❌ Should be 12-15
```

**Impact:** Passwords easily cracked if database compromised.

---

## HIGH SEVERITY VIOLATIONS (16)

### 9. Weak TLS Configuration (PCI 4.1) 🟠
**File:** [infrastructure/nginx/nginx.conf:42](infrastructure/nginx/nginx.conf#L42)
**Violation:** TLS 1.0 and 1.1 enabled (deprecated).

**Code:**
```nginx
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;  # ❌ TLS 1.0/1.1 weak
```

**Remediation:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

---

### 10. Weak Cipher Suites (PCI 4.1) 🟠
**File:** [infrastructure/nginx/nginx.conf:46](infrastructure/nginx/nginx.conf#L46)
**Violation:** DES, 3DES, RC4 ciphers enabled.

**Code:**
```nginx
ssl_ciphers 'DES-CBC3-SHA:AES128-SHA...';
```

**Remediation:** Use only modern AEAD ciphers (AES-GCM, ChaCha20).

---

### 11. Self-Signed Certificate (PCI 4.1.1) 🟠
**File:** [infrastructure/nginx/nginx.conf:53-54](infrastructure/nginx/nginx.conf#L53)
**Violation:** Using self-signed instead of CA-signed certificate.

**Remediation:** Obtain certificate from trusted CA (Let's Encrypt, DigiCert).

---

### 12. No Network Segmentation (PCI 1.2.1) 🟠
**File:** [docker-compose.yml:100-107](docker-compose.yml#L100)
**Violation:** All services on single network.

**Code:**
```yaml
networks:
  default:  # ❌ No segmentation
```

**Remediation:** Create separate networks:
- DMZ (nginx)
- Application (API)
- Data (database, redis)
- Management (vault)

---

### 13. Direct Internet Exposure of Database (PCI 1.3.2) 🟠
**File:** [docker-compose.yml:44-45](docker-compose.yml#L44)
**Violation:** PostgreSQL accessible from internet.

**Code:**
```yaml
ports:
  - "5432:5432"  # ❌ Database exposed!
```

**Remediation:** Only expose via API, use internal networking.

---

### 14. No RBAC (PCI 7.1) 🟠
**File:** [backend/routes/payment.routes.js](backend/routes/payment.routes.js)
**Violation:** No role-based access control.

**Code:**
```javascript
// ❌ No authentication middleware
router.post('/process', paymentController.processPayment);
```

**Impact:** Anyone can process payments, view any merchant's data.

**Remediation:** Implement authentication and authorization middleware.

---

### 15. No Encryption at Rest (PCI 3.4) 🟠
**File:** [docker-compose.yml:48-52](docker-compose.yml#L48)
**Violation:** Database volumes not encrypted.

**Remediation:** Use encrypted volumes or database-level encryption (pgcrypto).

---

### 16-24. Additional High Severity Violations
- **No HSTS header** (PCI 4.1) - [nginx.conf:71](infrastructure/nginx/nginx.conf#L71)
- **Missing security headers** (PCI 6.5.10) - [nginx.conf:73-76](infrastructure/nginx/nginx.conf#L73)
- **No rate limiting** (PCI 8.2.5) - [backend/routes/auth.routes.js](backend/routes/auth.routes.js)
- **Weak JWT secret** (PCI 8.2.1) - [backend/.env.example:16](backend/.env.example#L16)
- **Redis no password** (PCI 2.1) - [docker-compose.yml:66](docker-compose.yml#L66)
- **Running as root** (PCI 2.2) - [backend/Dockerfile:34](backend/Dockerfile#L34)
- **Database default credentials** (PCI 2.1) - [backend/.env.example:7](backend/.env.example#L7)
- **H2 Console exposed** (not present here, but was in original) - (PCI 2.2.2)
- **Overly permissive security groups** (PCI 1.2.1) - From audit report

---

## MEDIUM SEVERITY VIOLATIONS (12)

### 25. No MFA (PCI 8.3) 🟡
**File:** [backend/controllers/auth.controller.js:57](backend/controllers/auth.controller.js#L57)
**Violation:** No multi-factor authentication.

**Remediation:** Implement TOTP, SMS, or hardware token MFA.

---

### 26. Weak Password Policy (PCI 8.2) 🟡
**File:** [backend/models/Merchant.js:24-27](backend/models/Merchant.js#L24)
**Violation:** Only 4 characters required.

**Code:**
```javascript
if (merchantData.password.length < 4) {  // ❌ Too weak!
```

**Remediation:** Require 12+ characters, complexity rules.

---

### 27. No Account Lockout (PCI 8.2.5) 🟡
**File:** [backend/controllers/auth.controller.js:69](backend/controllers/auth.controller.js#L69)
**Violation:** Unlimited login attempts.

**Remediation:** Lock account after 6 failed attempts, require unlock.

---

### 28. Tamperable Audit Logs (PCI 10.5) 🟡
**File:** [infrastructure/postgres/init.sql:42-49](infrastructure/postgres/init.sql#L42)
**Violation:** Logs can be modified or deleted.

**Code:**
```sql
CREATE TABLE audit_logs (...);  -- ❌ Regular table, not append-only
```

**Remediation:** Implement append-only logs with hash chain.

---

### 29-36. Additional Medium Severity Violations
- **No password history** (PCI 8.2.4) - No table/check
- **Long JWT expiration** (PCI 8.2.8) - 7 days instead of 15 minutes
- **Password in toString()** (PCI 8.2.3) - [backend/models/Merchant.js:143](backend/models/Merchant.js#L143)
- **No input validation** (PCI 6.5.1) - Multiple controllers
- **Detailed error messages** (PCI 6.5.5) - [backend/server.js:65-73](backend/server.js#L65)
- **No anti-malware** (PCI 5.1) - [backend/Dockerfile](backend/Dockerfile)
- **Outdated dependencies** (PCI 6.2) - No audit in Dockerfile
- **No vulnerability scanning** (PCI 11.2) - No CI/CD scans
- **No security policy** (PCI 12.1) - Missing documentation
- **Information disclosure** (PCI 6.5.5) - [backend/server.js:33-41](backend/server.js#L33)
- **Debug endpoints exposed** (PCI 2.2.2) - [backend/server.js:44-51](backend/server.js#L44)
- **Exposing stack traces** (PCI 6.5.5) - [backend/server.js:70](backend/server.js#L70)

---

## VIOLATION COUNT BY PCI REQUIREMENT

| Requirement | Title | Violations | Severity |
|-------------|-------|------------|----------|
| **1** | Firewalls | 3 | HIGH |
| **2** | Default Credentials | 4 | CRITICAL |
| **3** | Data Protection | 4 | CRITICAL |
| **4** | Encryption in Transit | 4 | HIGH |
| **5** | Anti-Malware | 1 | MEDIUM |
| **6** | Secure Development | 7 | CRITICAL/HIGH |
| **7** | Access Control | 3 | HIGH |
| **8** | Authentication | 7 | HIGH/MEDIUM |
| **9** | Physical Security | 0 | N/A (cloud) |
| **10** | Logging & Monitoring | 3 | CRITICAL/MEDIUM |
| **11** | Security Testing | 2 | MEDIUM |
| **12** | Security Policy | 1 | MEDIUM |
| **TOTAL** | | **39** | |

---

## COST OF NON-COMPLIANCE

### Per-Violation Fines (Monthly)
- **CVV Storage:** $5,000 - $100,000/month
- **PIN Storage:** $5,000 - $100,000/month
- **Unencrypted PAN:** $5,000 - $100,000/month
- **Other violations:** $500 - $10,000/month each

### Total Estimated Fines
- **Minimum:** $150,000/month
- **Maximum:** $500,000+/month
- **Annual:** $1.8M - $6M+

### Additional Costs
- **Data Breach:** $4.24M average (IBM 2024)
- **License Revocation:** 100% business loss
- **Class-Action Lawsuits:** $10M+
- **Reputation Damage:** Immeasurable

---

## GP-COPILOT DETECTION

All 36+ violations should be detected by GP-Copilot using the finance-pci-dss profile.

**Expected Scan Results:**
```
🏦 GP-Copilot Finance Compliance Scan (PCI-DSS v4.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Found 36+ PCI-DSS violations

CRITICAL (8):
  • Storing CVV (PCI 3.2.2) - License revocation risk
  • Storing PIN (PCI 3.2.3) - License revocation risk
  • SQL Injection (PCI 6.5.1) - Data breach risk
  ...

Estimated Cost of Non-Compliance: $5M+
```

---

**END OF VIOLATION GUIDE**
**Last Updated:** 2025-10-07
**Total Violations:** 36+