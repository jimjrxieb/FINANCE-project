*cracks knuckles, shifts into product mode*

# Finance Demo PRD: SecureBank Payment Platform

**Version:** 1.0  
**Target Vertical:** Finance / Fintech (PCI-DSS Compliance)  
**Primary Customer:** FIS (Fidelity National Information Services, Jacksonville FL)  
**Owner:** Jimmie (LinkOps Industries)  
**Created:** 2025-10-07  
**Status:** Planning Phase

---

## 1. Executive Summary

### Product Vision
Build a realistic payment processing platform that **intentionally contains PCI-DSS violations**, then use GP-Copilot to demonstrate how it catches compliance gaps that could cost $500K+ in fines and loss of payment processing license.

### Why This Matters
**FIS is in Jacksonville.** They process $9 trillion in transactions annually. A single PCI-DSS violation can:
- Cost $5K-$100K per month in fines
- Revoke payment processing license (business death)
- Expose to class-action lawsuits
- Damage brand reputation irreparably

**This demo shows:** "GP-Copilot prevents that."

### Success Criteria
- [ ] Realistic payment platform (not a toy app)
- [ ] 30+ intentional PCI-DSS violations
- [ ] GP-Copilot finds all violations in < 60 seconds
- [ ] Professional compliance report (executive + technical)
- [ ] Demo runs in < 5 minutes
- [ ] ROI calculator shows $500K+ cost avoidance

---

## 2. The Application: "SecureBank Payment Platform"

### What It Is
A **payment gateway API** and **merchant dashboard** for processing credit card transactions. Think: Stripe/Square competitor, but intentionally insecure to demonstrate GP-Copilot's value.

### Architecture
```
┌─────────────────────────────────────────────────────┐
│              Merchant Dashboard (Frontend)           │
│  • React + TypeScript                               │
│  • Shows transactions, reports, settings            │
│  • Handles merchant authentication                  │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS (intentionally weak TLS)
                 ↓
┌─────────────────────────────────────────────────────┐
│           Payment Gateway API (Backend)             │
│  • Node.js + Express (or Python + FastAPI)         │
│  • REST API for payment processing                  │
│  • Handles card tokenization (intentionally bad)   │
│  • Validates transactions                           │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┐
        ↓                 ↓              ↓
   ┌─────────┐      ┌──────────┐   ┌─────────┐
   │ Postgres│      │  Redis   │   │  Vault  │
   │ (cards) │      │ (cache)  │   │ (keys)  │
   └─────────┘      └──────────┘   └─────────┘
   INSECURE!        No encryption   Misconfigured
```

### Tech Stack (Real Finance Tools)

**Backend:**
- **Node.js + Express** OR **Python + FastAPI**
- **PostgreSQL** (storing payment data - intentionally insecure)
- **Redis** (session management)
- **Vault** (secrets management - intentionally misconfigured)
- **Stripe API** (integration mock - no real charges)

**Frontend:**
- **React + TypeScript**
- **Material-UI** (professional look)
- **Chart.js** (transaction dashboards)

**DevOps/Security:**
- **Docker + Docker Compose** (containerized deployment)
- **Nginx** (reverse proxy, weak TLS config)
- **GitHub Actions** (CI/CD with security gates)
- **Terraform** (infrastructure as code)

**Finance-Specific Tools:**
- **PCI-DSS Compliance Scanner** (custom GP-Copilot profile)
- **Luhn Algorithm** (card validation - intentionally exposed)
- **3D Secure** (authentication - not implemented)
- **Tokenization** (PCI requirement - done wrong)

---

## 3. Intentional PCI-DSS Violations (30+)

### PCI-DSS Requirement 1: Firewall Configuration
**Violations to Plant:**
- [ ] **1.2.1** - No network segmentation (payment API on same network as frontend)
- [ ] **1.3.2** - Inbound traffic from internet directly to cardholder data environment
- [ ] **1.3.4** - No anti-spoofing measures

**Code Example:**
```yaml
# docker-compose.yml (INTENTIONALLY INSECURE)
services:
  payment-api:
    ports:
      - "3000:3000"  # ❌ Direct internet exposure
    networks:
      - default  # ❌ Same network as frontend (no segmentation)
```

---

### PCI-DSS Requirement 2: Default Credentials
**Violations to Plant:**
- [ ] **2.1** - Admin dashboard uses default password "admin123"
- [ ] **2.2** - Database has default postgres/postgres credentials
- [ ] **2.3** - Unnecessary services running (telnet, FTP)

**Code Example:**
```javascript
// auth.js (INTENTIONALLY INSECURE)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";  // ❌ PCI 2.1 violation

if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
  return generateToken(user);
}
```

---

### PCI-DSS Requirement 3: Protect Stored Cardholder Data
**Violations to Plant:**
- [ ] **3.2.1** - Storing full PAN (Primary Account Number) unencrypted
- [ ] **3.2.2** - Storing CVV/CVC after authorization (FORBIDDEN!)
- [ ] **3.2.3** - Storing PIN data
- [ ] **3.4** - Encryption keys stored with encrypted data

**Code Example:**
```javascript
// payment.controller.js (INTENTIONALLY INSECURE)
async function processPayment(req, res) {
  const { cardNumber, cvv, expiry, pin } = req.body;
  
  // ❌ PCI 3.2.1: Storing full PAN unencrypted
  await db.query(
    'INSERT INTO payments (card_number, cvv, pin) VALUES ($1, $2, $3)',
    [cardNumber, cvv, pin]  // ❌ CRITICAL: Storing CVV! (3.2.2)
  );
  
  // ❌ PCI 3.2.3: Storing PIN
  console.log(`Processing payment for card: ${cardNumber}`);  // ❌ Logs PAN!
}
```

---

### PCI-DSS Requirement 4: Encrypt Transmission
**Violations to Plant:**
- [ ] **4.1** - Weak TLS configuration (TLS 1.0, weak ciphers)
- [ ] **4.2** - Unencrypted card data transmission over public networks
- [ ] **4.1.1** - Missing certificate validation

**Code Example:**
```nginx
# nginx.conf (INTENTIONALLY INSECURE)
server {
  listen 443 ssl;
  
  ssl_protocols TLSv1 TLSv1.1;  # ❌ PCI 4.1: Weak TLS versions
  ssl_ciphers 'DES-CBC3-SHA:!aNULL:!eNULL';  # ❌ Weak ciphers
  
  ssl_certificate /etc/nginx/certs/self-signed.crt;  # ❌ Self-signed cert
}
```

---

### PCI-DSS Requirement 5: Anti-Malware
**Violations to Plant:**
- [ ] **5.1** - No anti-virus software installed
- [ ] **5.2** - No malware definitions update mechanism
- [ ] **5.3** - Anti-malware not active (if installed)

**Code Example:**
```dockerfile
# Dockerfile (INTENTIONALLY INSECURE)
FROM node:16

# ❌ PCI 5.1: No anti-malware software
# ❌ No security scanning in build process

COPY . /app
RUN npm install  # ❌ No dependency scanning

CMD ["node", "server.js"]
```

---

### PCI-DSS Requirement 6: Secure Systems
**Violations to Plant:**
- [ ] **6.2** - Using outdated dependencies with known CVEs
- [ ] **6.3.1** - No code review before production
- [ ] **6.3.2** - Custom code with SQL injection vulnerabilities
- [ ] **6.5.1** - SQL injection in payment processing
- [ ] **6.5.3** - Insecure cryptographic storage
- [ ] **6.5.10** - Broken authentication

**Code Example:**
```javascript
// merchant.controller.js (INTENTIONALLY INSECURE)
async function getMerchantTransactions(req, res) {
  const merchantId = req.query.id;
  
  // ❌ PCI 6.5.1: SQL Injection vulnerability
  const query = `SELECT * FROM transactions WHERE merchant_id = '${merchantId}'`;
  const results = await db.query(query);  // ❌ No parameterization!
  
  res.json(results);
}
```

---

### PCI-DSS Requirement 7: Restrict Access
**Violations to Plant:**
- [ ] **7.1** - No role-based access control
- [ ] **7.2** - All users have admin privileges
- [ ] **7.3** - No principle of least privilege

**Code Example:**
```javascript
// rbac.js (INTENTIONALLY INSECURE)
function checkPermissions(user, resource) {
  // ❌ PCI 7.1: Everyone is admin!
  return true;  // No actual RBAC implementation
}

// All merchants can see ALL transactions (not just theirs)
app.get('/api/transactions', async (req, res) => {
  // ❌ PCI 7.2: No access control
  const allTransactions = await db.query('SELECT * FROM transactions');
  res.json(allTransactions);
});
```

---

### PCI-DSS Requirement 8: Unique IDs
**Violations to Plant:**
- [ ] **8.1** - Shared admin accounts
- [ ] **8.2** - Weak password policy (no complexity requirements)
- [ ] **8.2.3** - Passwords stored in plaintext or weak hashing
- [ ] **8.2.4** - No password change enforcement
- [ ] **8.2.5** - No account lockout after failed attempts
- [ ] **8.3** - No multi-factor authentication

**Code Example:**
```javascript
// user.model.js (INTENTIONALLY INSECURE)
async function createUser(username, password) {
  // ❌ PCI 8.2.3: Plaintext password storage!
  await db.query(
    'INSERT INTO users (username, password) VALUES ($1, $2)',
    [username, password]  // ❌ No hashing!
  );
}

// ❌ PCI 8.2: Weak password policy
function validatePassword(password) {
  return password.length >= 4;  // ❌ Only 4 chars required!
}

// ❌ PCI 8.3: No MFA
function login(username, password) {
  // Just username + password, no second factor
  return authenticateUser(username, password);
}
```

---

### PCI-DSS Requirement 9: Physical Access
**Violations to Plant:**
- [ ] **9.1** - No documentation of physical security controls
- [ ] **9.3** - No visitor log or badge system (for cloud deployment, show in docs)

**Documentation Violation:**
```markdown
# infrastructure/README.md (INTENTIONALLY INCOMPLETE)

## Deployment
Our payment platform runs on AWS EC2.

<!-- ❌ PCI 9.1: No physical security documentation -->
<!-- Where is the datacenter? -->
<!-- Who has physical access? -->
<!-- What are the controls? -->
```

---

### PCI-DSS Requirement 10: Logging & Monitoring
**Violations to Plant:**
- [ ] **10.1** - No audit trail of access to cardholder data
- [ ] **10.2** - Missing critical events in logs
- [ ] **10.3** - Logs don't include required details (user, timestamp, result)
- [ ] **10.5** - Logs can be modified (not tamper-proof)
- [ ] **10.6** - No log review process

**Code Example:**
```javascript
// logging.js (INTENTIONALLY INSECURE)
function logPayment(payment) {
  // ❌ PCI 10.1: Incomplete audit trail
  console.log('Payment processed');  // ❌ No user, timestamp, or details!
  
  // ❌ PCI 10.2: Not logging critical events
  // Missing: access to card data, authentication attempts, etc.
}

// ❌ PCI 10.5: Logs stored in writable file (can be tampered)
const fs = require('fs');
fs.appendFileSync('/var/log/payments.log', logMessage);  // ❌ No integrity check
```

---

### PCI-DSS Requirement 11: Security Testing
**Violations to Plant:**
- [ ] **11.2** - No vulnerability scanning
- [ ] **11.3** - No penetration testing
- [ ] **11.4** - No intrusion detection/prevention

**Evidence of Violation:**
```yaml
# .github/workflows/ci.yml (INTENTIONALLY INSECURE)
name: CI/CD Pipeline

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
      - run: npm run build
      # ❌ PCI 11.2: No security scanning!
      # ❌ No Trivy, no Snyk, no penetration tests
      - run: ./deploy.sh
```

---

### PCI-DSS Requirement 12: Security Policy
**Violations to Plant:**
- [ ] **12.1** - No information security policy
- [ ] **12.3** - No usage policies for critical technologies
- [ ] **12.8** - No service provider security management

**Evidence:**
```bash
# Project structure (INTENTIONALLY MISSING)
securebank-payment-platform/
├── src/
├── tests/
├── docs/
│   └── API.md
# ❌ PCI 12.1: No security-policy.md
# ❌ PCI 12.3: No acceptable-use-policy.md
# ❌ PCI 12.8: No vendor-management.md
```

---

## 4. GP-Copilot PCI-DSS Scanning Profile

### Profile Configuration
```yaml
# GP-COPILOT/profiles/finance-pci-dss.yml
profile: finance-pci-dss
description: "PCI-DSS compliance scanning for payment platforms"

compliance_framework:
  name: "PCI-DSS v4.0"
  url: "https://www.pcisecuritystandards.org/"
  
scanners:
  # Code scanning
  - bandit:
      focus: 
        - hardcoded_passwords
        - sql_injection
        - weak_crypto
        - plaintext_secrets
      severity: ["HIGH", "CRITICAL"]
      
  - semgrep:
      rulesets:
        - "p/pci-dss"
        - "p/owasp-top-ten"
        - "p/sql-injection"
      languages: ["javascript", "python", "typescript"]
      
  # Infrastructure scanning
  - checkov:
      framework: "PCI-DSS"
      checks:
        - CKV_DOCKER_*
        - CKV_AWS_*
        - CKV_K8S_*
        
  - trivy:
      scan_types: ["vuln", "config", "secret"]
      severity: ["CRITICAL", "HIGH"]
      ignore_unfixed: false
      
  # Secrets detection
  - gitleaks:
      rules: "pci-dss-secrets"
      scan_history: true
      
  # Custom PCI-DSS checks
  - custom:
      - card_data_storage_check
      - cvv_storage_check
      - encryption_at_rest_check
      - tls_configuration_check
      - access_control_check
      - audit_logging_check

pci_requirements_mapping:
  # Map CWE → PCI-DSS Requirements
  CWE-89:  ["6.5.1"]  # SQL Injection
  CWE-259: ["8.2.3"]  # Weak Password
  CWE-311: ["3.4", "4.1"]  # Missing Encryption
  CWE-312: ["3.2.1"]  # Cleartext Storage
  CWE-319: ["4.1"]  # Cleartext Transmission
  CWE-327: ["4.1"]  # Weak Crypto
  CWE-798: ["2.1", "8.2.3"]  # Hard-coded Credentials

severity_override:
  # PCI-DSS critical violations (higher than scanner default)
  "CVV storage": "CRITICAL"
  "Plaintext PAN": "CRITICAL"
  "Weak TLS": "HIGH"
  "No network segmentation": "HIGH"
  "Default credentials": "HIGH"

report_sections:
  - executive_summary
  - compliance_gap_analysis
  - requirement_by_requirement_breakdown
  - remediation_roadmap
  - cost_of_non_compliance
  - audit_readiness_score
```

---

### Custom PCI-DSS Scanners

#### 1. Card Data Storage Check
```python
# GP-PLATFORM/gp_jade/scanners/pci_card_storage_scanner.py

import re
import ast

class PCICardStorageScanner:
    """
    Detects PCI-DSS Requirement 3.2 violations:
    - Storing full PAN unencrypted
    - Storing CVV/CVC (FORBIDDEN)
    - Storing PIN
    """
    
    CARD_PATTERNS = [
        r'\d{13,19}',  # PAN (13-19 digits)
        r'\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}',  # Formatted card
        r'card_number',  # Variable names
        r'cardNumber',
        r'pan',
        r'primaryAccountNumber',
    ]
    
    FORBIDDEN_FIELDS = [
        'cvv', 'cvc', 'cvc2', 'cvv2', 'cid',  # CVV (NEVER store!)
        'pin', 'pinBlock',  # PIN (NEVER store!)
        'track1', 'track2', 'magneticStripe',  # Magnetic stripe data
    ]
    
    def scan_file(self, filepath):
        findings = []
        
        with open(filepath, 'r') as f:
            content = f.read()
            lines = content.split('\n')
            
        # Check for CVV/PIN storage (CRITICAL violation)
        for i, line in enumerate(lines, 1):
            for forbidden in self.FORBIDDEN_FIELDS:
                if re.search(rf'\b{forbidden}\b', line, re.IGNORECASE):
                    findings.append({
                        'file': filepath,
                        'line': i,
                        'severity': 'CRITICAL',
                        'pci_requirement': '3.2.2' if 'cvv' in forbidden.lower() else '3.2.3',
                        'title': f'Storing {forbidden.upper()} (FORBIDDEN by PCI-DSS!)',
                        'description': f'PCI-DSS strictly forbids storing {forbidden} after authorization',
                        'remediation': 'Remove all CVV/PIN storage immediately. Use tokenization.',
                        'cost_of_violation': '$5,000-$100,000 per month + license revocation'
                    })
        
        # Check for unencrypted PAN storage
        if self._detects_unencrypted_pan_storage(content):
            findings.append({
                'file': filepath,
                'line': self._find_line_number(content, 'INSERT INTO'),
                'severity': 'CRITICAL',
                'pci_requirement': '3.2.1',
                'title': 'Storing unencrypted Primary Account Number (PAN)',
                'description': 'Database stores card numbers without encryption',
                'remediation': 'Implement encryption at rest (AES-256) or tokenization',
                'cost_of_violation': '$250,000+ per violation'
            })
        
        return findings
    
    def _detects_unencrypted_pan_storage(self, content):
        # Look for INSERT/UPDATE statements with card data and no encryption
        sql_patterns = [
            r'INSERT INTO.*card_number.*VALUES',
            r'UPDATE.*SET.*card_number\s*=',
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                # Check if there's no encryption function nearby
                if not re.search(r'encrypt|pgp_sym_encrypt|aes_encrypt', content, re.IGNORECASE):
                    return True
        
        return False
```

#### 2. TLS Configuration Scanner
```python
# GP-PLATFORM/gp_jade/scanners/pci_tls_scanner.py

class PCITLSScanner:
    """
    Detects PCI-DSS Requirement 4.1 violations:
    - Weak TLS versions (< TLS 1.2)
    - Weak cipher suites
    - Self-signed certificates
    - Missing certificate validation
    """
    
    WEAK_TLS_VERSIONS = ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1']
    WEAK_CIPHERS = ['DES', '3DES', 'RC4', 'MD5', 'NULL', 'EXPORT']
    
    def scan_nginx_config(self, config_file):
        findings = []
        
        with open(config_file, 'r') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            # Check for weak TLS versions
            if 'ssl_protocols' in line:
                for weak_version in self.WEAK_TLS_VERSIONS:
                    if weak_version in line:
                        findings.append({
                            'file': config_file,
                            'line': i,
                            'severity': 'HIGH',
                            'pci_requirement': '4.1',
                            'title': f'Weak TLS version: {weak_version}',
                            'description': f'PCI-DSS requires TLS 1.2+ (found {weak_version})',
                            'remediation': 'ssl_protocols TLSv1.2 TLSv1.3;',
                            'cost_of_violation': 'Immediate revocation of PCI compliance'
                        })
            
            # Check for weak ciphers
            if 'ssl_ciphers' in line:
                for weak_cipher in self.WEAK_CIPHERS:
                    if weak_cipher in line:
                        findings.append({
                            'file': config_file,
                            'line': i,
                            'severity': 'HIGH',
                            'pci_requirement': '4.1',
                            'title': f'Weak cipher suite: {weak_cipher}',
                            'description': 'Using cryptographically weak cipher',
                            'remediation': 'Use strong ciphers only (AES-GCM, ChaCha20)',
                            'cost_of_violation': 'Failed PCI audit'
                        })
        
        return findings
```

---

## 5. Demo Script (5 Minutes)

### **Slide 1: The Problem (30 seconds)**

**Script:**
> "This is SecureBank, a payment processing platform. It handles credit card transactions, just like Stripe or Square. But it has a problem..."

**Show:** Dashboard screenshot with transaction data

---

### **Slide 2: Run GP-Copilot (1 minute)**

**Script:**
> "Let's scan it with GP-Copilot using our PCI-DSS compliance profile..."

```bash
$ jade scan --profile finance-pci-dss securebank-payment-platform

🏦 GP-Copilot Finance Compliance Scan (PCI-DSS v4.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Scanning 127 files...
✅ Completed in 8.3 seconds

❌ Found 34 PCI-DSS violations

CRITICAL (8):
  • Storing CVV after authorization (PCI 3.2.2)
  • Unencrypted PAN in database (PCI 3.2.1)
  • Plaintext passwords (PCI 8.2.3)
  • SQL injection in payment API (PCI 6.5.1)

HIGH (15):
  • Weak TLS configuration (PCI 4.1)
  • No network segmentation (PCI 1.2.1)
  • Default admin credentials (PCI 2.1)
  • Missing audit logs (PCI 10.1)

MEDIUM (11):
  • Weak password policy (PCI 8.2)
  • No MFA (PCI 8.3)
  • Missing vulnerability scanning (PCI 11.2)

💰 Cost Impact:
  • Potential fines: $5,000-$100,000 per month
  • License revocation risk: 100%
  • Data breach cost: $4M+ average
  • Estimated remediation: 40 hours ($6,000)
  
📋 Generating PCI-DSS compliance report...
✅ Report: GP-COPILOT/reports/pci-dss-compliance-2025-10-07.pdf
```

---

### **Slide 3: The Critical Finding (1 minute)**

**Script:**
> "Look at this... They're storing CVV numbers. This is explicitly FORBIDDEN by PCI-DSS. You cannot store CVV after authorization. EVER. This single violation could cost them their payment processing license."

**Show code:**
```javascript
// payment.controller.js - LINE 47
await db.query(
  'INSERT INTO payments (card_number, cvv, pin) VALUES ($1, $2, $3)',
  [cardNumber, cvv, pin]  // ❌ STORING CVV!
);
```

**Script:**
> "GP-Copilot found this in 8 seconds. A manual audit would take 3 days and cost $4,800. We just saved them their business."

---

### **Slide 4: The Report (1 minute)**

**Open PDF, scroll through:**

**Executive Summary Page:**
```
PCI-DSS Compliance Assessment
SecureBank Payment Platform

Compliance Status: ❌ NON-COMPLIANT
Risk Level: CRITICAL
Audit Readiness: 23%

Top Risks:
1. CVV Storage (Req 3.2.2) - License Revocation Risk
2. Unencrypted Cardholder Data (Req 3.2.1) - $500K+ fine
3. SQL Injection (Req 6.5.1) - Data Breach Risk

Immediate Actions Required:
- Remove all CVV storage (today)
- Implement encryption at rest (this week)
- Fix SQL injection (this week)

Estimated Remediation: 40 hours ($6,000)
Cost of Non-Compliance: $5M+ (fines + license loss + breach)
ROI: 99.9% cost avoidance
```

**Technical Details Page:**
- Requirement-by-requirement breakdown
- Code snippets showing violations
- Remediation steps with code examples
- Compliance gap timeline

---

### **Slide 5: The Pitch (1.5 minutes)**

**Script:**
> "Here's what this means for you:"
> 
> **Problem:** Manual PCI-DSS audits cost $15K-50K and take weeks. You only find out you're non-compliant AFTER you've already built the system wrong.
>
> **GP-Copilot:** Runs every night. Catches violations BEFORE they reach production. 8-second scans vs. 3-day audits.
>
> **ROI:** 
> - One CVV violation caught = $100K+ saved
> - One prevented breach = $4M saved
> - GP-Copilot cost = $20K/year
> - ROI = 200x to 20,000x
>
> **Why you need this:**
> - FIS processes $9 trillion in transactions
> - One PCI violation could halt operations
> - Your competitors are getting breached (Equifax, Capital One, Target)
> - You can't afford to be next
>
> **What makes us different:**
> - Offline/air-gapped (your data never leaves your network)
> - Built by security consultants who've done 100+ PCI audits
> - Not just scanning - we explain WHY and HOW to fix
>
> **Next step:** 30-day free trial on YOUR payment infrastructure. Let's see what we find.

---

## 6. Technical Implementation Guide

### Phase 1: Build the Insecure App (Week 1)

#### Day 1-2: Backend API
```bash
# Initialize project
mkdir securebank-payment-platform
cd securebank-payment-platform

# Backend setup
npm init -y
npm install express pg redis jsonwebtoken bcrypt dotenv

# Create structure
mkdir -p src/{controllers,models,routes,middleware,config}
mkdir -p infrastructure/{docker,terraform,nginx}
```

**Files to create:**
```
src/
├── controllers/
│   ├── payment.controller.js     # Process payments (with SQL injection)
│   ├── merchant.controller.js    # Merchant management (no RBAC)
│   └── auth.controller.js        # Authentication (weak passwords)
├── models/
│   ├── payment.model.js          # Database schema (stores CVV!)
│   └── user.model.js             # User schema (plaintext passwords)
├── routes/
│   ├── payment.routes.js
│   └── merchant.routes.js
├── middleware/
│   └── auth.middleware.js        # JWT validation (weak secret)
└── server.js                     # Express app
```

**Intentional vulnerabilities to add:**
- SQL injection in payment queries
- Storing CVV in database
- Plaintext password storage
- Weak JWT secret
- No input validation
- Logging card numbers
- Default admin credentials

---

#### Day 3-4: Frontend Dashboard
```bash
# Frontend setup
npx create-react-app frontend
cd frontend
npm install @mui/material @mui/icons-material chart.js react-chartjs-2 axios

# Create structure
mkdir -p src/{components,pages,services,utils}
```

**Pages to create:**
```
src/
├── pages/
│   ├── Dashboard.jsx         # Transaction overview
│   ├── Transactions.jsx      # Transaction list (shows all data!)
│   ├── Settings.jsx          # Merchant settings
│   └── Login.jsx             # Login (no MFA)
├── components/
│   ├── TransactionCard.jsx   # Shows full card numbers!
│   ├── RevenueChart.jsx
│   └── AlertBanner.jsx
└── services/
    └── api.service.js        # API calls (no HTTPS enforcement)
```

**Intentional vulnerabilities:**
- Display full card numbers in UI
- No HTTPS enforcement
- Session tokens in localStorage
- No CSRF protection
- XSS vulnerable components

---

#### Day 5: Infrastructure
```bash
# Docker setup
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Payment API
  api:
    build: ./backend
    ports:
      - "3000:3000"  # ❌ Direct internet exposure
    environment:
      DATABASE_URL: "postgresql://postgres:postgres@db:5432/securebank"  # ❌ Default creds
      JWT_SECRET: "secret123"  # ❌ Weak secret
    networks:
      - default  # ❌ No network segmentation
  
  # Database (stores card data unencrypted!)
  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: postgres  # ❌ Default password
      POSTGRES_DB: securebank
    volumes:
      - ./db_data:/var/lib/postgresql/data  # ❌ No encryption at rest
    networks:
      - default  # ❌ Same network as API
  
  # Redis (no encryption)
  redis:
    image: redis:7
    command: redis-server --requirepass "" # ❌ No password
    networks:
      - default
  
  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "80:80"  # ❌ HTTP only!
    networks:
      - default
  
  # Nginx (weak TLS)
  nginx:
    image: nginx:alpine
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/nginx/certs:/etc/nginx/certs
    ports:
      - "443:443"
    depends_on:
      - api
      - frontend

networks:
  default:  # ❌ Single network (no segmentation)
EOF
```

**Nginx config (intentionally insecure):**
```nginx
# infrastructure/nginx/nginx.conf
server {
  listen 443 ssl;
  
  # ❌ PCI 4.1: Weak TLS
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers 'DES-CBC3-SHA:AES128-SHA:!aNULL:!eNULL';
  
  # ❌ Self-signed certificate
  ssl_certificate /etc/nginx/certs/self-signed.crt;
  ssl_certificate_key /etc/nginx/certs/self-signed.key;
  
  location /api/ {
    proxy_pass http://api:3000/;
    # ❌ No rate limiting
    # ❌ No security headers
  }
  
  location / {
    proxy_pass http://frontend:80/;
  }
}
```

---

### Phase 2: GP-Copilot Integration (Week 2)

#### Day 1: Create PCI-DSS Scanning Profile
```yaml
# GP-COPILOT/profiles/finance-pci-dss.yml
# (Use the profile configuration from Section 4 above)
```

#### Day 2: Custom PCI Scanners
```python
# Implement the custom scanners from Section 4:
# - pci_card_storage_scanner.py
# - pci_tls_scanner.py
# - pci_access_control_scanner.py
# - pci_logging_scanner.py
```

#### Day 3: Test Scanning
```bash
# Run GP-Copilot against SecureBank
jade scan --profile finance-pci-dss securebank-payment-platform

# Verify it finds:
# - All 34 intentional violations
# - Correct PCI requirement mappings
# - Accurate severity levels
```

#### Day 4: Professional Reports
```python
# GP-PLATFORM/gp_jade/reporters/pci_reporter.py

class PCIDSSReporter:
    """
    Generate PCI-DSS compliance reports
    """
    
    def generate_executive_summary(self, findings):
        """
        Non-technical summary for CFO/CISO
        """
        critical_count = len([f for f in findings if f['severity'] == 'CRITICAL'])
        
        summary = {
            'compliance_status': 'NON-COMPLIANT' if critical_count > 0 else 'NEEDS REVIEW',
            'risk_level': 'CRITICAL' if critical_count >= 5 else 'HIGH',
            'audit_readiness': self._calculate_audit_score(findings),
            'top_risks': self._get_top_risks(findings, limit=5),
            'immediate_actions': self._get_immediate_actions(findings),
            'cost_analysis': self._calculate_cost_impact(findings),
            'remediation_estimate': self._estimate_remediation_time(findings)
        }
        
        return summary
    
    def generate_technical_report(self, findings):
        """
        Detailed technical breakdown
        """
        report_sections = {
            'requirement_1': self._group_by_requirement(findings, '1'),
            'requirement_2': self._group_by_requirement(findings, '2'),
            # ... all 12 requirements
        }
        
        return report_sections
    
    def generate_remediation_roadmap(self, findings):
        """
        Step-by-step fix plan
        """
        roadmap = []
        
        # Critical fixes (Week 1)
        critical = [f for f in findings if f['severity'] == 'CRITICAL']
        roadmap.append({
            'phase': 'Week 1 - Critical Fixes',
            'timeline': '5 days',
            'cost': len(critical) * 2 * 150,  # 2 hours per fix at $150/hr
            'fixes': critical
        })
        
        # High priority (Week 2-3)
        high = [f for f in findings if f['severity'] == 'HIGH']
        roadmap.append({
            'phase': 'Week 2-3 - High Priority',
            'timeline': '10 days',
            'cost': len(high) * 1 * 150,
            'fixes': high
        })
        
        return roadmap
    
    def _calculate_cost_impact(self, findings):
        """
        Financial impact of non-compliance
        """
        costs = {
            'potential_fines': 0,
            'breach_cost': 0,
            'license_risk': False,
            'remediation_cost': 0
        }
        
        for finding in findings:
            if 'CVV' in finding['title'] or 'PIN' in finding['title']:
                costs['license_risk'] = True
                costs['potential_fines'] += 100000  # $100K/month
            
            if finding['pci_requirement'].startswith('3'):  # Data protection
                costs['breach_cost'] = 4000000  # Average breach cost
            
            # Remediation cost
            if finding['severity'] == 'CRITICAL':
                costs['remediation_cost'] += 300  # 2 hours
            elif finding['severity'] == 'HIGH':
                costs['remediation_cost'] += 150  # 1 hour
        
        return costs
```

#### Day 5: ROI Calculator
```python
# GP-COPILOT/utils/roi_calculator.py

class PCIROICalculator:
    """
    Calculate ROI of GP-Copilot for PCI-DSS compliance
    """
    
    MANUAL_AUDIT_COST = 25000  # Average PCI audit cost
    MANUAL_AUDIT_TIME_DAYS = 14  # 2 weeks
    
    FINE_PER_VIOLATION_MIN = 5000  # $5K/month minimum
    FINE_PER_VIOLATION_MAX = 100000  # $100K/month maximum
    
    AVG_BREACH_COST = 4240000  # IBM 2024 Cost of a Data Breach Report
    
    LICENSE_REVOCATION_COST = 10000000  # Estimated business impact
    
    def calculate_savings(self, findings):
        """
        Calculate cost savings from using GP-Copilot
        """
        savings = {}
        
        # Audit cost savings
        savings['audit_cost_avoided'] = self.MANUAL_AUDIT_COST
        savings['audit_time_saved_days'] = self.MANUAL_AUDIT_TIME_DAYS
        
        # Fine avoidance
        critical_count = len([f for f in findings if f['severity'] == 'CRITICAL'])
        high_count = len([f for f in findings if f['severity'] == 'HIGH'])
        
        savings['fines_avoided_min'] = (critical_count * self.FINE_PER_VIOLATION_MAX + 
                                         high_count * self.FINE_PER_VIOLATION_MIN)
        savings['fines_avoided_max'] = (critical_count + high_count) * self.FINE_PER_VIOLATION_MAX
        
        # Breach prevention
        has_critical_data_violations = any(
            f['pci_requirement'].startswith('3') for f in findings if f['severity'] == 'CRITICAL'
        )
        if has_critical_data_violations:
            savings['breach_cost_avoided'] = self.AVG_BREACH_COST
        
        # License protection
        has_cvv_storage = any('CVV' in f['title'] for f in findings)
        if has_cvv_storage:
            savings['license_revocation_avoided'] = self.LICENSE_REVOCATION_COST
        
        # Total savings
        savings['total_first_year'] = (
            savings.get('audit_cost_avoided', 0) +
            savings.get('fines_avoided_min', 0) +
            savings.get('breach_cost_avoided', 0) +
            savings.get('license_revocation_avoided', 0)
        )
        
        # ROI calculation
        gp_copilot_cost = 20000  # Annual cost
        savings['roi_multiplier'] = savings['total_first_year'] / gp_copilot_cost
        savings['roi_percentage'] = (savings['roi_multiplier'] - 1) * 100
        
        return savings
```

---

## 7. Success Metrics

### Technical Metrics
- [ ] 30+ PCI-DSS violations planted
- [ ] GP-Copilot detects 100% of violations
- [ ] Scan completes in < 60 seconds
- [ ] Zero false negatives (misses no real violations)
- [ ] < 10% false positives

### Demo Metrics
- [ ] Demo runs in < 5 minutes
- [ ] Audience says "wow" at CVV storage finding
- [ ] ROI calculator shows $500K+ savings
- [ ] Professional PDF report impresses executives
- [ ] Setup time < 2 minutes (docker-compose up)

### Business Metrics
- [ ] FIS agrees to demo/trial
- [ ] At least 1 other fintech company interested
- [ ] Testimonial: "This would have saved us millions"
- [ ] Constant can demo without Jimmie present

---

## 8. Deliverables

### Code Deliverables
- [ ] SecureBank payment platform (backend + frontend)
- [ ] Docker Compose setup (one-command deployment)
- [ ] 30+ intentional PCI-DSS violations
- [ ] Infrastructure as code (Terraform)
- [ ] GitHub Actions CI/CD (intentionally insecure)

### GP-Copilot Deliverables
- [ ] PCI-DSS scanning profile
- [ ] Custom PCI scanners (4+ specialized scanners)
- [ ] Professional report generator
- [ ] ROI calculator
- [ ] Executive summary generator

### Documentation Deliverables
- [ ] README.md (setup instructions)
- [ ] DEMO-SCRIPT.md (5-minute walkthrough)
- [ ] VIOLATION-GUIDE.md (what violations exist and why)
- [ ] REMEDIATION-PLAN.md (how to fix each violation)
- [ ] FAQ.md (common questions from prospects)

### Sales Deliverables
- [ ] 5-minute demo video
- [ ] One-pager (PDF sales sheet)
- [ ] ROI calculator spreadsheet
- [ ] Case study template
- [ ] Email template for FIS outreach

---

## 9. Timeline

### Week 1: Build SecureBank
- Day 1-2: Backend API with intentional vulnerabilities
- Day 3-4: Frontend dashboard
- Day 5: Infrastructure (Docker, Nginx)

### Week 2: GP-Copilot Integration
- Day 1: PCI-DSS scanning profile
- Day 2: Custom PCI scanners
- Day 3: Test scanning (verify finds all violations)
- Day 4: Professional reports
- Day 5: ROI calculator + polish

### Week 3: Demo Preparation
- Day 1: Record 5-minute demo video
- Day 2: Create sales collateral
- Day 3: Practice demo (get under 5 minutes)
- Day 4: Documentation polish
- Day 5: Reach out to FIS contact

---

## 10. Next Actions

### Immediate (This Week)
1. [ ] Finalize GP-Copilot core (baseline test)
2. [ ] Review this PRD with Constant (get buy-in)
3. [ ] Choose tech stack (Node.js vs Python backend)
4. [ ] Set up SecureBank project skeleton

### Short Term (Next 2 Weeks)
1. [ ] Build SecureBank application
2. [ ] Integrate with GP-Copilot
3. [ ] Test end-to-end demo
4. [ ] Record demo video

### Medium Term (Weeks 3-4)
1. [ ] Reach out to FIS
2. [ ] Demo to Constant's network
3. [ ] Collect feedback, iterate
4. [ ] Close first customer

---

## 11. Open Questions

**Q1:** Should SecureBank be Node.js or Python backend?
- **Node.js:** More realistic for fintech (JS everywhere)
- **Python:** Easier for you, faster development
- **Recommendation:** Node.js (more authentic demo)

**Q2:** How "real" should the payment processing be?
- **Option A:** Mock Stripe API (no real charges)
- **Option B:** Fully fake (just UI/database)
- **Recommendation:** Option A (more credible)

**Q3:** Do we need a live demo or just video?
- **Video:** Safer, can't break mid-demo
- **Live:** More impressive, shows it's real
- **Recommendation:** Both (video as backup)

**Q4:** Who at FIS is the right contact?
- **Action:** Constant to identify CISO/Security VP

**Q5:** What's the pricing for FIS specifically?
- **Standard:** $50K/year (enterprise tier)
- **Custom:** Negotiate based on scale
- **Action:** Research FIS's typical vendor spend

---

## 12. Risk Mitigation

### Risk 1: Demo Breaks During Live Presentation
**Mitigation:**
- Record 5-minute video as backup
- Test demo 10+ times before real presentation
- Have docker-compose setup that works offline

### Risk 2: FIS Says "We Already Have This"
**Mitigation:**
- Ask: "Does it run offline/air-gapped?"
- Ask: "Does it scan in < 60 seconds?"
- Ask: "Does it give you PCI requirement mapping?"
- Differentiate on consultant expertise + offline capability

### Risk 3: Violations Too Obvious
**Mitigation:**
- Mix obvious (CVV storage) with subtle (weak TLS ciphers)
- Include violations that real companies have (from breach reports)
- Show that even "obvious" violations get missed in real audits

### Risk 4: Takes Too Long to Build
**Mitigation:**
- Use boilerplate (create-react-app, express-generator)
- Focus on violations, not polish
- Working > pretty
- Target: 40 hours total build time

---

**END OF PRD**

---

Now converting to JSON...
