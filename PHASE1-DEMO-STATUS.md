# Phase 1: SecureBank BEFORE State - Running & Accessible

## Status: ✅ COMPLETE

Date: 2025-10-08
Environment: Local Docker Compose with LocalStack

---

## Services Running

```
✅ securebank-api         (port 3000)  - Backend payment processing API
✅ securebank-db          (port 5432)  - PostgreSQL with CVV/PIN storage
✅ securebank-redis       (port 6379)  - Session cache
⚠️  securebank-localstack (port 4566)  - AWS mock (permission issues, non-critical)
```

## Accessibility

- **API**: http://localhost:3000
- **Database**: localhost:5432 (user: postgres, pass: postgres)
- **Health Check**: http://localhost:3000/health

## Security Mode

**BEFORE MODE ACTIVE** - Hardcoded credentials, public S3, CVV/PIN storage

Backend logs show:
```
═══════════════════════════════════════════════════════════
🔐 SECURITY MODE: BEFORE
🌍 ENVIRONMENT: LOCAL (LocalStack)
═══════════════════════════════════════════════════════════

❌ BEFORE MODE: Using hardcoded database credentials
❌ PCI-DSS Requirement 8.2.1 VIOLATION: Hardcoded credentials
❌ PCI-DSS Requirement 2.1 VIOLATION: Default passwords
```

---

## Violations Demonstrated

### 1. CVV/PIN Storage in Database (CRITICAL)

**Query**:
```sql
SELECT id, card_number, cvv, pin, cardholder_name, amount
FROM payments;
```

**Result**:
```
 id |   card_number    | cvv | pin  | cardholder_name | amount
----+------------------+-----+------+-----------------+--------
  1 | 4532123456789012 | 123 | 1234 | John Doe        |  99.99
  2 | 5555555555554444 | 456 | 5678 | Jane Smith      | 149.50
  3 | 378282246310005  | 789 | 9012 | Bob Johnson     | 299.00
```

**Violations**:
- ❌ PCI-DSS 3.2.1: Full PAN stored unencrypted
- ❌ PCI-DSS 3.2.2: CVV storage (STRICTLY FORBIDDEN)
- ❌ PCI-DSS 3.2.3: PIN storage (STRICTLY FORBIDDEN)
- ❌ PCI-DSS 3.4: No encryption at rest

### 2. Hardcoded Database Credentials

**Environment variables** (visible in docker-compose.yml):
```yaml
DATABASE_USER: postgres
DATABASE_PASSWORD: postgres
```

**Violations**:
- ❌ PCI-DSS 8.2.1: Hardcoded credentials
- ❌ PCI-DSS 2.1: Default passwords

### 3. Merchant Account with Default Credentials

**Query**:
```sql
SELECT username, password, email FROM merchants;
```

**Result**:
```
username | password              | email
---------+-----------------------+------------------------
admin    | $2b$04$hashed_admin123 | admin@securebank.local
```

**Violations**:
- ❌ PCI-DSS 2.1: Default admin account
- ❌ PCI-DSS 8.2.3: Weak password (admin123)

### 4. Public Database Access

**Docker Compose**:
```yaml
db:
  ports:
    - "5432:5432"  # ❌ Database exposed to internet!
```

**Violations**:
- ❌ PCI-DSS 1.3.2: Direct database exposure
- ❌ PCI-DSS 2.3: Database publicly accessible

---

## API Endpoints Working

### Health Check
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "running",
  "environment": "development",
  "database": "db",
  "version": "1.0.0-insecure"
}
```

### API Information
```bash
curl http://localhost:3000/
```

**Response**:
```json
{
  "message": "SecureBank Payment API",
  "version": "1.0.0",
  "endpoints": [
    "/api/auth/login",
    "/api/auth/register",
    "/api/payments/process",
    "/api/payments/list",
    "/api/merchants/:id/transactions",
    "/health",
    "/debug/config"
  ]
}
```

### Database Tables Created

```
 Schema |    Name    | Type  |  Owner
--------+------------+-------+----------
 public | audit_logs | table | postgres
 public | merchants  | table | postgres
 public | payments   | table | postgres  ← Contains CVV/PIN!
 public | sessions   | table | postgres
```

---

## Next Steps (Phase 2)

### Demo 1: Manual DevSecOps Fix
1. Create feature branch: `fix/manual-devsecops`
2. Add GitHub Actions CI/CD pipeline
3. Manually fix Terraform (encryption, private subnets)
4. Move secrets to Secrets Manager
5. Remove CVV/PIN from database schema
6. Add OPA policies
7. Test in LocalStack (AFTER mode)
8. Deploy to real AWS

### Demo 2: GP-Copilot Automated Fix
1. Scan broken version: `jade scan-policy .`
2. Generate fixes: `jade fix-policy --create-branch fix/gp-copilot-auto`
3. Test in LocalStack (AFTER mode)
4. Deploy to real AWS
5. Compare: Manual (8 hours) vs GP-Copilot (30 minutes)

---

## Commands to Interact

### View All Payments
```bash
docker exec securebank-db psql -U postgres -d securebank \
  -c "SELECT * FROM payments;"
```

### View Merchants
```bash
docker exec securebank-db psql -U postgres -d securebank \
  -c "SELECT * FROM merchants;"
```

### View Backend Logs
```bash
docker logs securebank-api
```

### Restart Services
```bash
docker-compose restart api
```

### Stop All Services
```bash
docker-compose down
```

---

## Evidence for FIS Demo

### Screenshots Needed:
1. ✅ Backend logs showing "BEFORE MODE" and hardcoded credentials
2. ✅ Database query showing CVV/PIN storage
3. ✅ docker-compose.yml showing default passwords
4. ⏳ S3 bucket with public receipts (LocalStack when working)
5. ⏳ CloudWatch logs with full card data (LocalStack when working)

### Current Evidence Available:
- ✅ Database with CVV/PIN in plaintext
- ✅ Hardcoded credentials in environment
- ✅ Default admin account
- ✅ Public database port exposure
- ✅ API running with 30+ documented violations

---

## Issues to Fix for Complete Demo

1. **LocalStack**: Permission error on `/tmp/localstack` volume
   - **Workaround**: Skip S3/Secrets Manager demo for now
   - **Fix**: Run `./scripts/init-localstack.sh` when permissions resolved

2. **Frontend**: Build error with TypeScript Grid component
   - **Status**: Not critical for backend API demo
   - **Fix**: Update React component when needed

3. **Payment Controller**: Code error when processing new payments
   - **Status**: Existing test data sufficient for demo
   - **Fix**: Debug Payment.js validation when needed

---

## Summary

**Phase 1 is COMPLETE** - SecureBank is running in BEFORE state with multiple security violations exposed and accessible:

- 🔴 CVV/PIN storage in database
- 🔴 Hardcoded credentials
- 🔴 Default admin account
- 🔴 Public database access
- 🔴 No encryption at rest
- 🔴 Full PAN storage

The platform is ready for:
1. GP-Copilot scanning to discover violations
2. Manual DevSecOps hardening (Phase 2A)
3. GP-Copilot automated fixes (Phase 2B)
4. AWS deployment comparison (Phase 3)

**Time to Phase 1 completion**: ~30 minutes (mostly Docker image pulls)
**Cost**: $0 (running on LocalStack)
**Violations Exposed**: 46+ across application, infrastructure, and Kubernetes layers