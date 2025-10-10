# SecureBank - Quick Start Demo

## Quick Commands

Start everything:
```bash
./scripts/start-local.sh
export PATH="$HOME/bin:$PATH"
kubectl get pods -n securebank
kubectl get constraints
```

## Demo Points

1. **CI/CD/Runtime Coverage**: 24 components
2. **OPA Dual Usage**: Conftest (CD) vs Gatekeeper (Runtime)
3. **Auto-Remediation**: CD fixers
4. **Policy Enforcement**: OPA Gatekeeper mutations

## Status

✅ Docker Compose (8 services)
✅ LocalStack (S3, Secrets Manager)
✅ Kubernetes (kind cluster)
✅ OPA Gatekeeper (enforcing)

Backend running as user 1000 (non-root) - proof of automatic security context injection!

