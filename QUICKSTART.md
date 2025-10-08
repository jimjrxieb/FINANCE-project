# SecureBank Payment Platform - Quick Start

**⚠️ 2-Minute Setup Guide ⚠️**

---

## Prerequisites

- Docker & Docker Compose installed
- Ports available: 80, 443, 3000, 5432, 6379, 8200

---

## Start Platform (2 Commands)

```bash
# 1. Run setup
chmod +x setup.sh && ./setup.sh

# 2. Wait 30 seconds, then test
curl http://localhost:3000/health
```

**Done!** Platform is running.

---

## Test Critical Violation

```bash
# Store CVV/PIN in database (FORBIDDEN! ❌)
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
```

**Result:** CVV and PIN stored in database (PCI-DSS violation!)

---

## Verify Violation

```bash
# Check database - see CVV/PIN in plaintext!
docker-compose exec db psql -U postgres -d securebank \
  -c "SELECT card_number, cvv, pin FROM payments;"
```

**Output:**
```
  card_number    | cvv | pin
-----------------+-----+------
 4532123456789012| 123 | 1234
```

**This is a CRITICAL PCI-DSS violation!** ❌

---

## Test SQL Injection

```bash
# Bypass merchant ID filter
curl "http://localhost:3000/api/payments/merchant/1' OR '1'='1"
```

**Result:** Returns ALL payments from ALL merchants (no access control!)

---

## All API Endpoints

### Authentication (no auth required! ❌)
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Payments
```bash
# List all payments (no access control)
curl http://localhost:3000/api/payments/list

# Get payment by ID (anyone can view)
curl http://localhost:3000/api/payments/1

# Search (SQL injection vulnerable)
curl "http://localhost:3000/api/payments/search/query?query=John"

# Export to CSV (includes CVV/PIN!)
curl http://localhost:3000/api/payments/export/csv > payments.csv
```

### Merchants
```bash
# List all merchants (returns password hashes!)
curl http://localhost:3000/api/merchants

# Get merchant transactions (SQL injection)
curl http://localhost:3000/api/merchants/1/transactions
```

---

## Services Running

| Service | Port | Credentials | Violation |
|---------|------|-------------|-----------|
| **API** | 3000 | None | ❌ No auth |
| **HTTPS** | 443 | Self-signed cert | ❌ PCI 4.1.1 |
| **PostgreSQL** | 5432 | postgres/postgres | ❌ PCI 2.1 |
| **Redis** | 6379 | No password | ❌ PCI 2.1 |
| **Vault** | 8200 | root token | ❌ Dev mode |

---

## Stop Platform

```bash
docker-compose down

# Remove all data
docker-compose down -v
```

---

## Troubleshooting

### "Port already in use"
```bash
lsof -i :3000
kill -9 <PID>
```

### "Database not ready"
```bash
docker-compose logs db
docker-compose restart db
```

### "Services won't start"
```bash
docker-compose down -v
./setup.sh
```

---

## Next Steps

1. **Read violations:** [VIOLATION-GUIDE.md](VIOLATION-GUIDE.md)
2. **Full docs:** [README-SECUREBANK.md](README-SECUREBANK.md)
3. **Audit report:** [CODEBASE-AUDIT-REPORT.md](CODEBASE-AUDIT-REPORT.md)
4. **Run GP-Copilot:** `jade scan --profile finance-pci-dss .`

---

## Demo One-Liner

```bash
# Complete demo in one command
./setup.sh && sleep 30 && \
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{"merchantId":1,"cardNumber":"4532123456789012","cvv":"123","pin":"1234","expiryDate":"12/25","cardholderName":"John Doe","amount":99.99}' && \
docker-compose exec -T db psql -U postgres -d securebank -c "SELECT card_number, cvv, pin FROM payments;"
```

**Shows:** CVV/PIN stored in database (CRITICAL violation!)

---

**That's it! Platform running in 2 minutes.** ✅

**⚠️ Remember:** INTENTIONALLY INSECURE - Demo only!