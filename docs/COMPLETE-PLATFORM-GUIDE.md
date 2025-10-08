# SecureBank Payment Platform - Complete Guide
## Enterprise-Grade PCI-DSS Demo with 46+ Intentional Violations

**Version:** 2.0 (with React Frontend + Enterprise Security Stack)
**Date:** 2025-10-08
**Status:** ✅ Production-Ready Demo Platform

---

## 🎯 What You Have Now

**A complete, production-realistic payment platform with:**
- ✅ **Backend API** (Node.js + Express) - 36 violations
- ✅ **Frontend Dashboard** (React + TypeScript) - 10 violations
- ✅ **Enterprise Security Stack** (OPA, Vault, K8s ready)
- ✅ **Infrastructure** (Docker Compose, Nginx, PostgreSQL)
- ✅ **Documentation** (100+ pages)

**Total Violations:** **46+ PCI-DSS violations** across all layers

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Generate SSL certificates
cd infrastructure/nginx && chmod +x generate-certs.sh && ./generate-certs.sh && cd ../..

# 2. Start all services
docker-compose up -d

# 3. Access dashboard
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
# Login: admin / admin123
```

**Done!** Platform is running.

---

## 📊 Services Running

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 3001 | http://localhost:3001 | React dashboard (shows CVV!) |
| **Backend API** | 3000 | http://localhost:3000 | Payment API |
| **HTTPS** | 443 | https://localhost:443 | Nginx (weak TLS) |
| **PostgreSQL** | 5432 | localhost:5432 | Database (CVV storage) |
| **Redis** | 6379 | localhost:6379 | Cache (no password) |
| **Vault** | 8200 | http://localhost:8200 | Secrets (dev mode) |
| **OPA** | 8181 | http://localhost:8181 | Policy engine |

---

## 🔐 Test Violations

### 1. Frontend: Display CVV/PIN (CRITICAL!)

```bash
# Open browser
open http://localhost:3001

# Login
Username: admin
Password: admin123

# Dashboard shows:
# ❌ Full card numbers (PCI 3.3)
# ❌ CVV codes (PCI 3.2.2 - FORBIDDEN!)
# ❌ PIN codes (PCI 3.2.3 - FORBIDDEN!)
```

### 2. Backend: Store CVV/PIN (CRITICAL!)

```bash
# Process payment with CVV/PIN storage
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": 1,
    "cardNumber": "4532123456789012",
    "cvv": "123",
    "pin": "1234",
    "expiryDate": "12/25",
    "cardholderName": "John Doe",
    "amount": 99.99
  }'

# Verify CVV/PIN stored in database
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT card_number, cvv, pin FROM payments;"
```

### 3. SQL Injection

```bash
# Bypass merchant filter
curl "http://localhost:3000/api/payments/merchant/1' OR '1'='1"

# Returns ALL payments from ALL merchants!
```

### 4. OPA Policy (Not Enforced!)

```bash
# OPA is running but policies not enforced
curl http://localhost:8181/v1/data/securebank/allow \
  -d '{"input": {"user": {"role": "guest"}, "action": "read", "resource": "payment"}}'

# Policy says: DENY
# But app still allows access (fails open!)
```

---

## 📁 File Structure

```
FINANCE-project/
├── backend/                      # Node.js API
│   ├── controllers/             # Payment, Merchant, Auth
│   │   ├── payment.controller.js    # CVV storage, SQL injection
│   │   ├── merchant.controller.js   # No RBAC
│   │   └── auth.controller.js       # No MFA
│   ├── models/
│   │   ├── Payment.js               # Stores CVV/PIN (CRITICAL!)
│   │   └── Merchant.js              # Weak password hashing
│   ├── routes/                  # No authentication required
│   ├── middleware/
│   │   └── opa.middleware.js        # Fails open!
│   ├── config/
│   │   ├── database.js              # Unsafe queries
│   │   └── vault.js                 # (TODO) Falls back to hardcoded
│   └── server.js                # CORS disabled, no headers
│
├── frontend/                    # React Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   └── TransactionCard.tsx  # Shows CVV/PIN!
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx        # No MFA, logs passwords
│   │   │   └── DashboardPage.tsx    # Shows all merchant data
│   │   ├── services/
│   │   │   └── api.ts               # HTTP not HTTPS, logs card data
│   │   └── types/
│   │       └── index.ts             # Exposes sensitive fields
│   └── Dockerfile               # Runs as root
│
├── opa-policies/                # Policy-as-Code
│   └── securebank.rego          # PCI-DSS policies (not enforced!)
│
├── infrastructure/
│   ├── nginx/
│   │   ├── nginx.conf           # TLS 1.0/1.1, weak ciphers
│   │   └── generate-certs.sh    # Self-signed certs
│   └── postgres/
│       └── init.sql             # CVV/PIN columns!
│
├── docker-compose.yml           # 7 services, no segmentation
│
└── Documentation/ (7 files, 150+ pages)
    ├── CODEBASE-AUDIT-REPORT.md
    ├── VIOLATION-GUIDE.md
    ├── README-SECUREBANK.md
    ├── REFACTOR-COMPLETE.md
    ├── PHASE2-COMPLETE.md
    ├── COMPLETE-PLATFORM-GUIDE.md (this file)
    └── QUICKSTART.md
```

---

## 🎓 Enterprise Security Components

### OPA (Open Policy Agent)

**Purpose:** Policy-based access control

**Files:**
- `backend/middleware/opa.middleware.js` - Authorization middleware
- `opa-policies/securebank.rego` - PCI-DSS policies

**How to Use:**
```bash
# 1. OPA is already running (docker-compose)

# 2. Load policies
curl -X PUT http://localhost:8181/v1/policies/securebank \
  --data-binary @opa-policies/securebank.rego

# 3. Test policy
curl -X POST http://localhost:8181/v1/data/securebank/allow \
  -d '{
    "input": {
      "user": {"role": "merchant", "id": 1},
      "action": "read",
      "resource": "payment",
      "merchant_id": "1"
    }
  }'

# 4. Enable in backend (currently commented out)
# Edit backend/server.js to use middleware
```

**Violations:**
- ❌ Fails open (allows access when OPA down)
- ❌ Policies exist but not enforced
- ❌ No caching

---

### HashiCorp Vault

**Purpose:** Secrets management

**Running:** Dev mode (token: `root`)

**Access:**
```bash
# Vault UI
open http://localhost:8200

# Token: root

# Store secret
docker-compose exec vault vault kv put secret/database \
  username=postgres password=supersecret

# Retrieve secret
docker-compose exec vault vault kv get secret/database
```

**Violations:**
- ❌ Dev mode (not production-ready)
- ❌ Token hardcoded
- ❌ Falls back to hardcoded secrets

---

### PostgreSQL Security

**Audit Database:**
```bash
# Check for CVV storage (FORBIDDEN!)
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT 'CRITICAL: CVV storage' AS violation, COUNT(*) FROM payments WHERE cvv IS NOT NULL;"

# Check for PIN storage (FORBIDDEN!)
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT 'CRITICAL: PIN storage' AS violation, COUNT(*) FROM payments WHERE pin IS NOT NULL;"

# Check encryption status
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT name, setting FROM pg_settings WHERE name IN ('ssl', 'password_encryption');"
```

**Violations:**
- ❌ CVV/PIN storage (CRITICAL!)
- ❌ No encryption at rest
- ❌ Weak password encryption (md5)
- ❌ No SSL/TLS

---

## 📊 Violation Summary

### By Severity

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 **CRITICAL** | 10 | CVV storage, PIN storage, SQL injection |
| 🟠 **HIGH** | 18 | Weak TLS, No RBAC, Database exposed |
| 🟡 **MEDIUM** | 18 | Weak passwords, No MFA, Tamperable logs |
| **TOTAL** | **46+** | |

### By Layer

| Layer | Violations | Key Issues |
|-------|------------|------------|
| **Frontend** | 10 | Display CVV/PIN, XSS, localStorage tokens |
| **Backend** | 20 | SQL injection, CVV storage, No auth |
| **Database** | 6 | CVV/PIN columns, No encryption, Weak auth |
| **Infrastructure** | 10 | No segmentation, Weak TLS, Exposed services |

### By PCI-DSS Requirement

| Req | Title | Violations |
|-----|-------|------------|
| **1** | Firewalls | 4 |
| **2** | Default Credentials | 5 |
| **3** | Data Protection | 6 (CRITICAL) |
| **4** | Encryption in Transit | 5 |
| **6** | Secure Development | 8 |
| **7** | Access Control | 4 |
| **8** | Authentication | 8 |
| **10** | Logging | 4 |
| **11** | Security Testing | 1 |
| **12** | Security Policy | 1 |

---

## 🧪 Testing Scenarios

### Scenario 1: The Critical Finding (CVV Storage)

```bash
# 1. Process payment
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{"merchantId":1,"cardNumber":"4532123456789012","cvv":"123","pin":"1234","expiryDate":"12/25","cardholderName":"Test User","amount":50.00}'

# 2. Verify it's in database
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT id, card_number, cvv, pin, amount FROM payments ORDER BY id DESC LIMIT 1;"

# 3. See it in frontend
# Open http://localhost:3001
# Login: admin/admin123
# CVV/PIN displayed on dashboard!
```

**Impact:** License revocation, $100K/month fine

---

### Scenario 2: SQL Injection Data Exfiltration

```bash
# Normal query (merchant 1's payments)
curl "http://localhost:3000/api/payments/merchant/1"

# SQL injection (ALL merchants' payments)
curl "http://localhost:3000/api/payments/merchant/1' OR '1'='1"

# Returns full card data for ALL merchants!
```

**Impact:** Complete database compromise

---

### Scenario 3: No Access Control

```bash
# Login as merchant 1
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# View ALL payments (not just merchant 1's)
curl http://localhost:3000/api/payments/list \
  -H "Authorization: Bearer $TOKEN"

# View OTHER merchant's data
curl http://localhost:3000/api/merchants/2/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**Impact:** No RBAC, merchant can view all data

---

## 🎬 Demo Flow (5 Minutes)

### Slide 1: The Platform (30s)
- Show architecture diagram
- "This is SecureBank - processes payments like Stripe"

### Slide 2: Run GP-Copilot (1min)
```bash
jade scan --profile finance-pci-dss .

# Expected: 46+ violations in 10 seconds
```

### Slide 3: The Critical Finding (1min)
- Show CVV storage code
- Show database with CVV/PIN
- Show frontend displaying CVV
- "License revocation risk - $100K/month"

### Slide 4: The Report (1min)
- Executive summary
- Compliance gap: NON-COMPLIANT
- Cost: $5M+ exposure
- Remediation: 60 hours ($9K)

### Slide 5: The Pitch (1.5min)
- Manual audit: $25K, 2 weeks, AFTER built
- GP-Copilot: $20K/year, 10 seconds, DURING development
- ROI: 250x-500x
- Next: 30-day trial on YOUR infrastructure

---

## 🛠️ Advanced Usage

### Enable OPA Enforcement

```javascript
// Edit backend/server.js
const opaMiddleware = require('./middleware/opa.middleware');

// Add to routes
app.use('/api/payments', opaMiddleware.authorize, paymentRoutes);
app.use('/api/merchants', opaMiddleware.authorize, merchantRoutes);
```

### Use Vault for Secrets

```javascript
// Edit backend/config/database.js
const vaultClient = require('./vault');

// Get credentials from Vault
const creds = await vaultClient.getDatabaseCredentials();
```

### Run Security Audit

```bash
# Database audit
docker-compose exec db psql -U postgres -d securebank < scripts/database-security-audit.sql

# Container audit
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image securebank-api:latest

# OPA policy tests
docker-compose exec opa opa test /policies -v
```

---

## 📈 Next Steps

### Phase 3: GP-Copilot Integration
1. **Custom Scanners:**
   - `pci_card_storage_scanner.py` - Detect CVV/PIN storage
   - `pci_tls_scanner.py` - Detect weak TLS
   - `pci_access_control_scanner.py` - Detect no RBAC
   - `pci_logging_scanner.py` - Detect audit gaps

2. **Compliance Reports:**
   - Executive summary (CISO/CFO)
   - Technical breakdown (developers)
   - Remediation roadmap
   - ROI calculator

3. **Demo Materials:**
   - 5-minute demo video
   - Sales one-pager
   - Case study template

---

## 🎓 Learning Outcomes

**By using SecureBank, you'll learn:**

1. **PCI-DSS Compliance:**
   - All 12 requirements
   - Common violations
   - Remediation strategies

2. **Enterprise Security Tools:**
   - OPA (policy-as-code)
   - Vault (secrets management)
   - Container security
   - Network security

3. **Real-World Vulnerabilities:**
   - SQL injection
   - XSS
   - Insecure authentication
   - Data exposure

4. **Cloud Security Engineering:**
   - Infrastructure as code
   - Security automation
   - Compliance as code

---

## 🚨 Important Warnings

**⚠️ NEVER use SecureBank with real payment data!**

- Contains **46+ intentional security vulnerabilities**
- **CRITICAL violations** that would result in license revocation
- **For demonstration purposes ONLY**
- Not production-ready
- Not secure
- Not compliant

**Use for:**
- ✅ Security training
- ✅ Compliance demos
- ✅ GP-Copilot demonstrations
- ✅ Understanding PCI-DSS

**Do NOT use for:**
- ❌ Real payments
- ❌ Production systems
- ❌ Storing actual card data
- ❌ Processing real transactions

---

## 📞 Support

**Documentation:**
- [QUICKSTART.md](QUICKSTART.md) - 2-minute setup
- [VIOLATION-GUIDE.md](VIOLATION-GUIDE.md) - All 46+ violations
- [README-SECUREBANK.md](README-SECUREBANK.md) - Full documentation

**Troubleshooting:**
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Clean start
docker-compose down -v
./setup.sh
```

---

## 📊 Success Metrics

✅ **Realistic payment platform** (not toy app)
✅ **46+ intentional PCI-DSS violations**
✅ **One-command deployment**
✅ **React dashboard with violations**
✅ **Enterprise security stack integrated**
✅ **150+ pages of documentation**

**Ready for GP-Copilot integration and FIS demo!** 🚀

---

**Last Updated:** 2025-10-08
**Version:** 2.0 (Complete Platform)
**Status:** ✅ Production-Ready Demo