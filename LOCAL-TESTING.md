# SecureBank - Local Testing Guide

**Test everything locally tonight with LocalStack (Mock AWS) - Cost: $0**

---

## 🎯 Tonight's Goal

Test the SecureBank platform locally to verify:
- ✅ All services start correctly
- ✅ Backend connects to database
- ✅ LocalStack provides mock AWS services (S3, Secrets Manager)
- ✅ BEFORE mode works (hardcoded secrets, public S3)
- ✅ AFTER mode works (Secrets Manager, private S3)
- ✅ Frontend displays payment dashboard
- ✅ Monitoring stack (Prometheus + Grafana) works

**NO AWS charges. Debug everything tonight. Deploy confidently tomorrow.** 🚀

---

## 🚀 Quick Start (2 minutes)

```bash
cd /home/jimmie/linkops-industries/GP-copilot/GP-PROJECTS/FINANCE-project

# Start in BEFORE mode (insecure)
./scripts/start-local.sh BEFORE

# Wait ~15 seconds for services to start...

# Access points will be displayed ✅
```

**That's it!** All services running, LocalStack initialized, ready to test.

---

## 📍 Access Points

| Service | URL | Credentials | Purpose |
|---------|-----|-------------|---------|
| **Frontend** | http://localhost:3001 | - | Payment dashboard (React) |
| **Backend API** | http://localhost:3000 | - | Payment API |
| **Prometheus** | http://localhost:9090 | - | Metrics |
| **Grafana** | http://localhost:3002 | admin/admin | Dashboards |
| **LocalStack** | http://localhost:4566 | - | Mock AWS |
| **Vault** | http://localhost:8200 | Token: root | Secrets (dev mode) |
| **PostgreSQL** | localhost:5432 | postgres/postgres | Database |
| **Redis** | localhost:6379 | No password | Cache |

---

## 🧪 Test Plan (Tonight)

### **Test 1: Services Health Check** ⏱️ 2 min

```bash
# Health check backend
curl http://localhost:3000/health
# Should return: {"status":"healthy"}

# Check PostgreSQL
docker exec securebank-db psql -U postgres -d securebank -c "SELECT 1;"
# Should return: 1

# Check LocalStack
curl http://localhost:4566/_localstack/health
# Should show s3, secretsmanager, cloudwatch as "available"
```

**✅ Pass Criteria:** All services respond

---

### **Test 2: BEFORE Mode (Insecure)** ⏱️ 5 min

```bash
# Backend should use hardcoded credentials
docker logs securebank-backend 2>&1 | grep -i "BEFORE MODE"
# Should see: "BEFORE MODE: Using hardcoded database password"

# S3 bucket should be PUBLIC
curl http://localhost:4566/securebank-payment-receipts-local/receipts/test.json
# Should return: JSON with CVV/PIN ❌ (public access works)

# Grafana should have default password
curl -u admin:admin http://localhost:3002/api/health
# Should return: {"database":"ok"}
```

**✅ Pass Criteria:** All violations present (hardcoded secrets, public S3)

---

### **Test 3: AFTER Mode (Secure)** ⏱️ 5 min

```bash
# Stop and restart in AFTER mode
docker-compose down
./scripts/start-local.sh AFTER

# Backend should read from Secrets Manager
docker logs securebank-backend 2>&1 | grep -i "AFTER MODE"
# Should see: "AFTER MODE: Reading password from Secrets Manager"

# S3 bucket should be PRIVATE (if configured)
curl http://localhost:4566/securebank-payment-receipts-local/receipts/test.json
# Should return: Access Denied (or 403) ✅

# Verify secret retrieval works
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id securebank/db/password \
  | jq -r '.SecretString' | jq .
# Should return: JSON with password
```

**✅ Pass Criteria:** Reads from Secrets Manager, S3 is private

---

### **Test 4: Frontend Dashboard** ⏱️ 3 min

```bash
# Open frontend in browser
open http://localhost:3001

# Should see:
# - Login page
# - Dashboard with payment cards
# - (May not have data yet - that's OK)

# Check frontend can reach backend
curl http://localhost:3001
# Should return: HTML page

# Check API is accessible from frontend
curl http://localhost:3000/api/health
# Should return: {"status":"healthy"}
```

**✅ Pass Criteria:** Frontend loads, can communicate with backend

---

### **Test 5: Monitoring Stack** ⏱️ 5 min

**Prometheus:**
```bash
# Open Prometheus
open http://localhost:9090

# Go to: Status → Targets
# Should see: backend target (may be down if no metrics endpoint yet)

# Run query: up
# Should see: prometheus, backend status
```

**Grafana:**
```bash
# Open Grafana
open http://localhost:3002

# Login: admin / admin
# Go to: Dashboards
# (No dashboards yet - that's OK for tonight)

# Go to: Configuration → Data Sources
# Should see: Prometheus configured
```

**✅ Pass Criteria:** Prometheus + Grafana accessible, can view metrics

---

### **Test 6: Database Schema** ⏱️ 3 min

```bash
# Check tables exist
docker exec securebank-db psql -U postgres -d securebank -c "\dt"

# Should see tables:
# - merchants
# - payments
# - users

# Check merchants table
docker exec securebank-db psql -U postgres -d securebank -c \
  "SELECT COUNT(*) FROM merchants;"

# If 0 rows, seed database:
docker exec securebank-backend npm run seed
```

**✅ Pass Criteria:** Tables exist, can query database

---

### **Test 7: LocalStack S3** ⏱️ 3 min

```bash
# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# Should see:
# - securebank-payment-receipts-local
# - securebank-audit-logs-local

# Upload test file
echo '{"test": "data"}' > /tmp/test.json
aws --endpoint-url=http://localhost:4566 s3 cp /tmp/test.json \
  s3://securebank-payment-receipts-local/test.json

# Download test file
aws --endpoint-url=http://localhost:4566 s3 cp \
  s3://securebank-payment-receipts-local/test.json /tmp/downloaded.json

cat /tmp/downloaded.json
# Should show: {"test": "data"}
```

**✅ Pass Criteria:** Can upload/download from S3

---

## 🐛 Common Issues & Fixes

### **Issue: LocalStack not starting**
```bash
# Check Docker is running
docker ps

# Check LocalStack logs
docker logs securebank-localstack

# Restart LocalStack
docker-compose restart localstack
sleep 5
./scripts/init-localstack.sh
```

### **Issue: Backend can't connect to database**
```bash
# Check database is running
docker logs securebank-db

# Check backend logs
docker logs securebank-backend

# Check connection
docker exec securebank-backend nc -zv db 5432
# Should return: Connection succeeded
```

### **Issue: Frontend can't reach backend**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check frontend environment
docker exec securebank-frontend env | grep API_URL
# Should show: REACT_APP_API_URL=http://api:3000

# Rebuild frontend if needed
docker-compose up -d --build frontend
```

### **Issue: "command not found: aws"**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

---

## 📊 Success Criteria Checklist

Before going to bed tonight, verify:

```
□ All services start (docker ps shows 8+ containers)
□ Backend health check returns 200
□ LocalStack health check shows services available
□ BEFORE mode: hardcoded secrets work
□ BEFORE mode: S3 is public (can curl receipts)
□ AFTER mode: reads from Secrets Manager
□ Frontend loads in browser
□ Prometheus accessible
□ Grafana accessible (admin/admin)
□ Database tables exist
□ Can upload/download from LocalStack S3
```

**If all ✅ → Ready for AWS deployment tomorrow**
**If any ❌ → Debug locally tonight (no AWS costs!)**

---

## 🚀 Tomorrow's Plan

**Once local tests pass:**

1. **Morning (30 min):**
   - Deploy Terraform to AWS
   - Deploy to EKS
   - Run verification scripts

2. **Afternoon (1 hour):**
   - Demo to Constant
   - Screenshots for FIS
   - Document findings

3. **Evening:**
   - Destroy AWS infrastructure
   - Total cost: ~$6 for the day

---

## 💡 Pro Tips

**View live logs:**
```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just LocalStack
docker-compose logs -f localstack
```

**Restart individual service:**
```bash
docker-compose restart backend
```

**Clean slate:**
```bash
docker-compose down -v  # Deletes volumes too
./scripts/start-local.sh BEFORE
```

**Check resource usage:**
```bash
docker stats
```

---

## 📝 Notes for Tomorrow

**Document tonight:**
- What worked ✅
- What didn't work ❌
- Bugs fixed 🐛
- AWS deployment will be different because:
  - Real RDS (not local Postgres)
  - Real S3 (not LocalStack)
  - Real EKS (not local Docker)
  - Real Secrets Manager

---

## 🎉 You're Ready!

**Tonight:**
- Test everything locally
- Fix all bugs
- Verify BEFORE/AFTER modes
- Sleep well knowing it works

**Tomorrow:**
- Deploy to AWS confidently
- Demo works first try
- Impress Constant
- Get that job! 🚀

---

**Questions? Issues? Debug locally - it's free!** 💰

Commands:
```bash
# Start: ./scripts/start-local.sh BEFORE
# Logs:  docker-compose logs -f backend
# Stop:  docker-compose down
```