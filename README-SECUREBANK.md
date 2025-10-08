# SecureBank Payment Platform

**⚠️ INTENTIONALLY VULNERABLE - FOR DEMONSTRATION PURPOSES ONLY ⚠️**

A realistic payment processing platform containing **36+ intentional PCI-DSS violations** to demonstrate GP-Copilot's security scanning capabilities.

---

## Overview

**Purpose:** Demonstrate GP-Copilot's ability to detect critical PCI-DSS compliance violations that could cost organizations $500K+ in fines and license revocation.

**Target Customer:** FIS (Fidelity National Information Services) and other payment processors

**Business Value:** Prove ROI of automated compliance scanning vs. manual audits ($25K, 2 weeks)

---

## What This Is

A payment gateway API and merchant dashboard that:
- ✅ Processes credit card transactions (simulated)
- ✅ Manages merchant accounts
- ✅ Stores payment data
- ❌ **Contains 36+ intentional PCI-DSS violations**
- ❌ **Should NEVER be used with real payment data**

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         Merchant Dashboard (Future)         │
│         React + TypeScript (TODO)           │
└──────────────────┬──────────────────────────┘
                   │ HTTPS (weak TLS)
                   ↓
┌─────────────────────────────────────────────┐
│              Nginx Reverse Proxy            │
│  • TLS 1.0/1.1 (weak) ❌                     │
│  • Self-signed certificate ❌                │
│  • No security headers ❌                    │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│           Payment Gateway API (Node.js)     │
│  • Express REST API                         │
│  • SQL Injection vulnerabilities ❌          │
│  • Stores CVV/PIN ❌                         │
│  • No authentication ❌                      │
└───────┬──────────┬──────────┬───────────────┘
        │          │          │
   ┌────▼───┐ ┌───▼────┐ ┌──▼────┐
   │Postgres│ │ Redis  │ │ Vault │
   │(5432)  │ │ (6379) │ │(8200) │
   └────────┘ └────────┘ └───────┘
     ❌ CVV      ❌ No      ❌ Dev
     ❌ PIN      password   mode
```

---

## Tech Stack

**Backend:**
- Node.js 16 + Express
- PostgreSQL 14 (stores card data unencrypted)
- Redis 7 (no password)
- HashiCorp Vault (dev mode)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (weak TLS configuration)
- Self-signed SSL certificates

**Frontend (TODO):**
- React + TypeScript
- Material-UI
- Chart.js

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 4GB RAM
- Ports available: 80, 443, 3000, 5432, 6379, 8200

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd FINANCE-project

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Wait for services to start (~30 seconds)

# 4. Verify API is running
curl http://localhost:3000/health
```

**That's it!** The entire platform runs with one command.

---

## API Endpoints

### Authentication (No actual auth required! ❌)

```bash
# Register merchant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant1",
    "password": "1234",
    "email": "merchant@example.com"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Payments (CRITICAL VIOLATIONS)

```bash
# Process payment (stores CVV and PIN! ❌)
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

# List ALL payments (no access control! ❌)
curl http://localhost:3000/api/payments/list

# SQL Injection demo ❌
curl "http://localhost:3000/api/payments/merchant/1' OR '1'='1"
# Returns ALL payments from ALL merchants!
```

### Merchants

```bash
# List all merchants (no auth! ❌)
curl http://localhost:3000/api/merchants

# Get merchant transactions (SQL injection vulnerable)
curl http://localhost:3000/api/merchants/1/transactions
```

---

## PCI-DSS Violations

This application contains **36+ intentional violations**:

### 🔴 CRITICAL (8 violations)
1. **Storing CVV** (PCI 3.2.2) - STRICTLY FORBIDDEN! License revocation risk
2. **Storing PIN** (PCI 3.2.3) - STRICTLY FORBIDDEN! License revocation risk
3. **Unencrypted PAN** (PCI 3.2.1) - $250K+ fine per violation
4. **SQL Injection** (PCI 6.5.1) - Data breach risk
5. **Logging card data** (PCI 10.1) - Sensitive data exposure
6. **Default credentials** (PCI 2.1) - Instant account takeover
7. **CSRF disabled** (PCI 6.5.9) - Request forgery attacks
8. **Weak password hashing** (PCI 8.2.3) - Easy to crack

### 🟠 HIGH (16 violations)
9. Weak TLS (TLS 1.0/1.1)
10. Weak ciphers (DES, 3DES, RC4)
11. Self-signed certificate
12. No network segmentation
13. Database exposed to internet
14. No RBAC
15. No encryption at rest
16. ...and 9 more (see [VIOLATION-GUIDE.md](VIOLATION-GUIDE.md))

### 🟡 MEDIUM (12 violations)
25. No MFA
26. Weak password policy (4 chars)
27. No account lockout
28. Tamperable logs
29. ...and 8 more (see [VIOLATION-GUIDE.md](VIOLATION-GUIDE.md))

**Full details:** [VIOLATION-GUIDE.md](VIOLATION-GUIDE.md)

---

## Cost of Non-Compliance

### Fines
- **CVV violation:** $5K-$100K/month
- **Total potential:** $150K-$500K/month
- **Annual:** $1.8M-$6M+

### Additional Costs
- **Data breach:** $4.24M average
- **License revocation:** 100% business loss
- **Class-action lawsuits:** $10M+

**This is why GP-Copilot matters.**

---

## GP-Copilot Scanning

### Run Scan

```bash
# Using GP-Copilot PCI-DSS profile
jade scan --profile finance-pci-dss .

# Expected output:
# ❌ Found 36+ PCI-DSS violations
# CRITICAL: 8 | HIGH: 16 | MEDIUM: 12
# Estimated cost of non-compliance: $5M+
```

### What GP-Copilot Detects
- ✅ CVV/PIN storage (CRITICAL)
- ✅ SQL injection vulnerabilities
- ✅ Weak TLS configuration
- ✅ Missing encryption
- ✅ Default credentials
- ✅ All 36+ violations

### Report Output
- Executive summary (for CISO/CFO)
- Technical breakdown (for developers)
- Remediation roadmap
- ROI calculation
- Compliance gap analysis

---

## Demo Script (5 Minutes)

**Slide 1:** "This is SecureBank, a payment platform..." (30s)

**Slide 2:** Run GP-Copilot scan (1min)
```bash
jade scan --profile finance-pci-dss .
# Shows 36+ violations in 8 seconds
```

**Slide 3:** The critical finding (1min)
```
❌ CRITICAL: Storing CVV (PCI 3.2.2)
File: backend/models/Payment.js:46
Impact: License revocation, $100K/month fine
```

**Slide 4:** The report (1min)
- Show PDF compliance report
- Highlight cost analysis: $5M+ risk
- Remediation estimate: 40 hours ($6K)

**Slide 5:** The pitch (1.5min)
- Manual audit: $25K, 2 weeks
- GP-Copilot: $20K/year, 8 seconds
- ROI: One CVV violation caught = $100K saved
- **Your competitor just got breached. You won't.**

---

## Development

### Project Structure

```
FINANCE-project/
├── backend/
│   ├── controllers/      # Payment, Merchant, Auth
│   ├── models/          # Payment, Merchant (with violations)
│   ├── routes/          # API routes
│   ├── config/          # Database config
│   └── server.js        # Express app
├── infrastructure/
│   ├── nginx/           # Nginx config (weak TLS)
│   ├── postgres/        # Database init (stores CVV/PIN)
│   └── redis/           # (future)
├── docker-compose.yml   # Orchestration (no segmentation)
├── setup.sh             # One-command setup
├── VIOLATION-GUIDE.md   # Complete violation list
└── README-SECUREBANK.md # This file
```

### Adding More Violations

1. **Frontend violations** (TODO):
   - Display full card numbers in UI
   - Store tokens in localStorage
   - No CSRF protection
   - XSS vulnerabilities

2. **CI/CD violations**:
   - No security scanning in pipeline
   - No secret scanning
   - Deploy on every commit

3. **Documentation violations**:
   - No security policy (PCI 12.1)
   - No incident response plan

---

## Troubleshooting

### Services won't start
```bash
# Check Docker
docker --version
docker-compose --version

# View logs
docker-compose logs -f

# Restart
docker-compose down
docker-compose up -d
```

### Database connection errors
```bash
# Verify database is running
docker-compose ps

# Check database logs
docker-compose logs db

# Reinitialize
docker-compose down -v
./setup.sh
```

### Port conflicts
```bash
# Check ports
lsof -i :3000
lsof -i :5432

# Change ports in docker-compose.yml
```

---

## Cleanup

```bash
# Stop services
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

---

## Files Created vs Original Codebase

### ✅ New Files (SecureBank)
- `backend/` - Complete Node.js payment API
- `infrastructure/` - Nginx, PostgreSQL configs
- `docker-compose.yml` - New orchestration
- `setup.sh` - One-command setup
- `VIOLATION-GUIDE.md` - Complete violation list
- `CODEBASE-AUDIT-REPORT.md` - Audit findings
- `README-SECUREBANK.md` - This file

### 📦 Archived (Original Twitter App)
- `src/main/java/` - Original Java/Spring Boot code
- `pom.xml` - Maven config
- `Jenkinsfile` - Original CI/CD

**Both codebases coexist.** Original preserved for reference.

---

## Next Steps

### Phase 1: Complete Backend ✅
- [x] Payment API with violations
- [x] Merchant management
- [x] Authentication (weak)
- [x] Database schema (CVV/PIN storage)
- [x] Docker Compose setup
- [x] Nginx with weak TLS

### Phase 2: Frontend (TODO)
- [ ] React + TypeScript dashboard
- [ ] Transaction list (displays full PANs)
- [ ] Analytics charts
- [ ] Login UI (no MFA)

### Phase 3: GP-Copilot Integration (TODO)
- [ ] PCI-DSS scanning profile
- [ ] Custom scanners (CVV, TLS, etc.)
- [ ] Report generator
- [ ] ROI calculator

### Phase 4: Demo Preparation (TODO)
- [ ] 5-minute demo video
- [ ] Sales collateral
- [ ] Practice presentation
- [ ] FIS outreach

---

## Contributing

**This is a demonstration project with intentional vulnerabilities.**

Do NOT:
- ❌ Fix the vulnerabilities (they're intentional!)
- ❌ Use with real card data
- ❌ Deploy to public internet

Do:
- ✅ Add more violations (if aligned with PRD)
- ✅ Improve documentation
- ✅ Enhance GP-Copilot detection

---

## License

**UNLICENSED** - For demonstration purposes only.

Contains intentional security vulnerabilities. NOT for production use.

---

## Contact

**Owner:** Jimmie (LinkOps Industries)
**Partner:** Constant (GuidePoint Security)
**Target Customer:** FIS (Jacksonville, FL)
**Purpose:** GP-Copilot PCI-DSS Compliance Demo

---

## Acknowledgments

Built to demonstrate the critical importance of automated security scanning for payment processing platforms.

**"GP-Copilot finds in 8 seconds what manual audits miss for weeks."**

---

**⚠️ REMEMBER: INTENTIONALLY INSECURE - FOR DEMONSTRATION ONLY ⚠️**