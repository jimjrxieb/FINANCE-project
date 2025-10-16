# Kubernetes Secrets Setup

## ⚠️ IMPORTANT: Secrets Were Removed

Hardcoded secrets have been removed from `deployment.yaml` and moved to `secrets.yaml`.

## Setup Instructions

### Option 1: Manual Secrets (Development)

```bash
# 1. Edit secrets.yaml and replace placeholder values
vi infrastructure/k8s/secrets.yaml

# 2. Apply the secret
kubectl apply -f infrastructure/k8s/secrets.yaml

# 3. Deploy the application
kubectl apply -f infrastructure/k8s/deployment.yaml
```

### Option 2: Base64 Encoded (Production)

```bash
# Create secret from literal values
kubectl create secret generic securebank-secrets \
  --from-literal=DB_PASSWORD='your-strong-password' \
  --from-literal=JWT_SECRET='your-32-char-secret' \
  --from-literal=AWS_ACCESS_KEY_ID='AKIAXXXXX' \
  --from-literal=AWS_SECRET_ACCESS_KEY='xxxxx' \
  --from-literal=REACT_APP_API_KEY='sk_live_xxxxx' \
  --from-literal=PAYMENT_API_KEY='xxxxx' \
  --dry-run=client -o yaml > infrastructure/k8s/secrets.yaml

# Apply
kubectl apply -f infrastructure/k8s/secrets.yaml
```

### Option 3: External Secrets Operator (RECOMMENDED)

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets

# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name securebank/production/credentials \
  --secret-string '{
    "DB_PASSWORD": "xxx",
    "JWT_SECRET": "xxx",
    "AWS_ACCESS_KEY_ID": "xxx",
    "AWS_SECRET_ACCESS_KEY": "xxx",
    "REACT_APP_API_KEY": "sk_live_xxx",
    "PAYMENT_API_KEY": "xxx"
  }'

# Create SecretStore
kubectl apply -f infrastructure/k8s/secret-store.yaml

# External Secrets Operator will sync automatically
```

## Best Practices

✅ **DO:**
- Use IAM roles for AWS (remove AWS_ACCESS_KEY_ID/SECRET)
- Rotate secrets regularly
- Use External Secrets Operator for production
- Enable encryption at rest for secrets
- Audit secret access

❌ **DON'T:**
- Commit `secrets.yaml` with real values to git
- Use weak passwords
- Share secrets in Slack/email
- Hardcode secrets in deployment YAML

## Security Checklist

- [ ] Secrets stored in Kubernetes Secrets (not in YAML)
- [ ] secrets.yaml added to .gitignore
- [ ] Using IAM roles instead of AWS keys (when possible)
- [ ] Secrets rotated within last 90 days
- [ ] Access to secrets restricted by RBAC
- [ ] Encryption at rest enabled
