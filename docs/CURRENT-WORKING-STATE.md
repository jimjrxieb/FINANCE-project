# Current Working State - SecureBank Platform

**Last Updated:** October 8, 2025
**Status:** ✅ **FULLY FUNCTIONAL**
**Build:** `main.83ffa2f5.js`

---

## Quick Start

### Access Application
```
Frontend: http://localhost:3001
API:      http://localhost:3000
Database: localhost:5432
```

### Credentials
```
Username: admin
Password: admin123
```

### Start Services
```bash
cd /home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project
docker-compose up -d
```

### Verify Status
```bash
docker-compose ps
curl http://localhost:3000/health
curl http://localhost:3001
```

---

## Service Status

### Running Services
```
✅ securebank-api        - Backend API (Node.js)
✅ securebank-db         - PostgreSQL Database
✅ securebank-frontend   - React Dashboard
✅ securebank-nginx      - Reverse Proxy
✅ securebank-opa        - Policy Engine
✅ securebank-redis      - Cache
✅ securebank-vault      - Secrets Management
⚠️  securebank-localstack - AWS Emulator (Restarting - Expected)
```

### Port Mappings
```
3000  → Backend API
3001  → Frontend Dashboard
5432  → PostgreSQL
6379  → Redis
8181  → OPA
8200  → Vault
4566  → LocalStack (AWS Emulator)
```

---

## Database State

### Merchants Table
```sql
SELECT id, username, email FROM merchants;
```
| ID | Username | Email                     |
|----|----------|---------------------------|
| 1  | admin    | admin@securebank.local    |

**Password Hash:** `$2b$04$rJ4ApKGuOQzpzysbXawkk.R6QCaLOONAGUvwQU9Mq2M.WvUQv/r.e`
**Plaintext:** `admin123`
**Algorithm:** bcrypt with 4 rounds (intentionally weak)

### Payments Table (Test Data)
```sql
SELECT id, card_number, cvv, pin, amount, cardholder_name FROM payments;
```

| ID | Card Number      | CVV | PIN  | Amount | Cardholder  |
|----|------------------|-----|------|--------|-------------|
| 1  | 4532123456789012 | 123 | 1234 | 99.99  | John Doe    |
| 2  | 5555555555554444 | 456 | 5678 | 149.50 | Jane Smith  |
| 3  | 378282246310005  | 789 | 9012 | 299.00 | Bob Johnson |

**Total Revenue:** $548.49
**Average Transaction:** $182.83
**Largest Transaction:** $299.00

---

## Application Features Working

### ✅ Authentication
- [x] Login page renders
- [x] Login with admin/admin123 succeeds
- [x] JWT token generated and stored in localStorage
- [x] Protected routes redirect to login when unauthorized
- [x] Logout clears token and redirects to login

### ✅ Dashboard
- [x] Stats cards display (3 transactions, $548.49 revenue, etc.)
- [x] Recent transactions list (3 cards)
- [x] Full card numbers visible (PAN)
- [x] CVV codes visible (123, 456, 789)
- [x] PIN codes visible (1234, 5678, 9012)
- [x] Violation warnings displayed
- [x] No infinite loop (API called once per page load)
- [x] No console errors

### ✅ API Endpoints
```bash
# Health Check
GET /health
→ {"status":"ok"}

# Login
POST /api/auth/login
{"username":"admin","password":"admin123"}
→ {"success":true,"token":"...","merchant":{...}}

# List Payments
GET /api/payments/list
Authorization: Bearer <token>
→ {"count":3,"payments":[...]}

# Merchant Stats
GET /api/merchants/:id/stats
Authorization: Bearer <token>
→ {"merchantId":"1","stats":{...},"recentTransactions":[...]}
```

---

## Configuration Files

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:insecure_password@db:5432/securebank
JWT_SECRET=insecure_jwt_secret_key_12345
REDIS_URL=redis://redis:6379
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=root-token-insecure
OPA_URL=http://opa:8181
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
REACT_APP_DEBUG=true
REACT_APP_VERSION=1.0.0-insecure
```

**Docker Compose (frontend service):**
```yaml
frontend:
  environment:
    REACT_APP_API_URL: http://localhost:3000  # ✅ Browser accessible
    REACT_APP_ENV: development
```

---

## Known Issues & Resolutions

### ❌ Issue: API Network Error (ERR_NAME_NOT_RESOLVED)
**Cause:** Frontend using `http://api:3000` (Docker hostname)
**Fix:** Changed to `http://localhost:3000` in docker-compose.yml
**Status:** ✅ FIXED

### ❌ Issue: Infinite API Loop
**Cause:** `useCallback([merchant])` recreating on every render
**Fix:** Changed to `useCallback([merchant?.id])`
**Status:** ✅ FIXED

### ❌ Issue: "toFixed is not a function"
**Cause:** API returns amounts as strings, not numbers
**Fix:** Wrapped with `Number(amount).toFixed(2)`
**Status:** ✅ FIXED

### ❌ Issue: Material-UI Grid Error
**Cause:** MUI v7 removed Grid `item` prop
**Fix:** Replaced Grid with Box + flexbox
**Status:** ✅ FIXED

### ❌ Issue: Database Pool Undefined
**Cause:** Importing `{ pool }` instead of `{ getPool }`
**Fix:** Changed all models to use `getPool().query()`
**Status:** ✅ FIXED

---

## File Structure

```
/home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project/
├── backend/
│   ├── models/
│   │   ├── Merchant.js          ✅ Uses getPool()
│   │   └── Payment.js           ✅ Uses getPool()
│   ├── config/
│   │   ├── database.js          ✅ Exports getPool()
│   │   └── secrets.js
│   ├── server.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx  ✅ Fixed infinite loop
│   │   │   └── LoginPage.tsx
│   │   ├── components/
│   │   │   └── TransactionCard.tsx ✅ Number() wrapper
│   │   └── services/
│   │       └── api.ts             ✅ localhost:3000
│   ├── build/static/js/
│   │   └── main.83ffa2f5.js      ✅ Current working build
│   └── .env
├── docker-compose.yml             ✅ Fixed API URL
├── infrastructure/
│   └── terraform/
│       ├── provider.tf            ✅ LocalStack/AWS switch
│       └── variables.tf
└── docs/
    ├── TROUBLESHOOTING-SESSION.md ✅ Complete fix history
    └── CURRENT-WORKING-STATE.md   ✅ This file
```

---

## Build Information

### Frontend Build
```
Build Hash:   main.83ffa2f5.js
Build Date:   October 8, 2025 17:51 UTC
Build Size:   163.21 kB (gzipped)
React Script: react-scripts build
Node Version: 16-alpine (in container)
```

### Backend Build
```
Image:        finance-project_api
Node Version: 16-alpine
Size:         415MB
Entrypoint:   node server.js
```

### Database
```
Image:        postgres:14-alpine
Database:     securebank
User:         postgres
Password:     insecure_password (intentional)
```

---

## Verification Tests

### Manual Browser Test
1. Open http://localhost:3001
2. Login with admin/admin123
3. Verify dashboard displays:
   - Stats: 3 transactions, $548.49 revenue
   - 3 transaction cards with CVV/PIN
   - No infinite loop (check DevTools Network tab)
   - No console errors

### API Test
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Test payments endpoint
curl http://localhost:3000/api/payments/list \
  -H "Authorization: Bearer $TOKEN" | jq
# Should return: {"count":3,"payments":[...]}
```

### Database Test
```bash
docker-compose exec -T db psql -U postgres -d securebank \
  -c "SELECT COUNT(*) FROM payments;"
# Should return: 3
```

---

## Maintenance Commands

### Update Admin Password
```bash
docker-compose exec -T db psql -U postgres -d securebank -c \
  "UPDATE merchants SET password = '\$2b\$04\$rJ4ApKGuOQzpzysbXawkk.R6QCaLOONAGUvwQU9Mq2M.WvUQv/r.e' WHERE username = 'admin';"
```

### Rebuild Frontend (If Source Changes)
```bash
docker-compose exec -T frontend sh -c "REACT_APP_API_URL=http://localhost:3000 npm run build"
docker-compose restart frontend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f api
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart frontend
```

### Complete Reset
```bash
docker-compose down -v
docker-compose up -d
# Then update admin password (see above)
```

---

## PCI-DSS Violations (Intentional)

### Application Layer (46 violations)
- ✅ Storing CVV in database (PCI 3.2.2)
- ✅ Storing PIN in database (PCI 3.2.3)
- ✅ Displaying CVV on UI (PCI 3.2.2)
- ✅ Displaying PIN on UI (PCI 3.2.3)
- ✅ Full PAN displayed (PCI 3.3)
- ✅ Weak bcrypt rounds (4 instead of 10+)
- ✅ HTTP instead of HTTPS (PCI 4.1)
- ✅ No access control (PCI 7.1)
- ✅ JWT in localStorage (PCI 8.2.8)
- ✅ Logging sensitive data (PCI 10.1)

### Infrastructure Layer (20 violations)
- Public RDS database (PCI 1.3)
- Unencrypted RDS storage (PCI 3.4)
- Public S3 buckets (PCI 1.3)
- Unencrypted S3 storage (PCI 3.4)
- Security groups allow 0.0.0.0/0 (PCI 1.2)

### Kubernetes Layer (25 violations)
- Privileged containers (PCI 2.2.4)
- Running as root (PCI 2.2.4)
- No network policies (PCI 1.2)
- No resource limits (PCI 2.2.4)
- Hardcoded secrets (PCI 8.2.8)

### CI/CD Layer (15 violations)
- No SAST scanning (PCI 6.3.2)
- No container image scanning (PCI 6.3.2)
- No SBOM generation (PCI 6.3.2)
- Direct production deployment (PCI 6.4.6)

**Total:** 106+ PCI-DSS violations
**Cost Exposure:** $950,000/month in fines (intentional for demo)

---

## Demo Purpose

**Target Audience:** Fidelity National Information Services (FIS)
**Use Cases:**
- Cloud Security Engineer training
- DevSecOps education
- GP-Copilot demonstration
- Security scanning tool validation

**Demo Flow:**
1. Show working application with visible violations
2. Point security scanner at application
3. Scanner detects 106+ violations
4. Demonstrate remediation with GP-Copilot
5. Show cost savings ($950K/month avoided)

---

## Support Contacts

**Project:** GP-PROJECTS/FINANCE-project
**Location:** `/home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project`
**Documentation:** `/docs/`

**Key Documentation Files:**
- `TROUBLESHOOTING-SESSION.md` - Complete fix history
- `CURRENT-WORKING-STATE.md` - This file
- `COMPLETE-PLATFORM-GUIDE.md` - Full platform documentation
- `VIOLATION-GUIDE.md` - Detailed violation breakdown
- `AWS-DEPLOYMENT-GUIDE.md` - Cloud deployment instructions

---

## Last Session Summary

**Date:** October 8, 2025
**Duration:** ~2 hours
**Issues Fixed:** 6 critical bugs
**Files Modified:** 7 files
**Status Change:** ❌ Broken → ✅ Fully Functional

**Key Fixes:**
1. Material-UI Grid compatibility
2. Database pool imports
3. String-to-number type coercion
4. React infinite render loop
5. Docker hostname vs localhost
6. Build caching and environment variables

**Final Build:** `main.83ffa2f5.js`
**Final Status:** ✅ READY FOR DEMO

---

## Next Steps

1. ✅ Application working - No immediate action needed
2. 📋 Optional: Add more test transaction data
3. 📋 Optional: Configure LocalStack for S3 testing
4. 📋 Optional: Test Terraform deployment to LocalStack
5. 📋 Optional: Prepare FIS demo presentation

**Current State:** Production-ready for demo purposes
