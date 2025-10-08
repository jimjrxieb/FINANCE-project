#!/bin/bash
# ============================================================================
# GENERATE SELF-SIGNED SSL CERTIFICATES - INTENTIONALLY WEAK
# ============================================================================
# PCI-DSS Violation: PCI 4.1.1 - Self-signed certificates
# ============================================================================

echo "🔐 Generating self-signed SSL certificates..."
echo "⚠️  WARNING: Self-signed certificates are NOT PCI-DSS compliant!"
echo "⚠️  PCI 4.1.1 VIOLATION: Should use CA-signed certificates"
echo ""

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate private key and certificate
# ❌ Using weak 1024-bit key (should be 2048+ bit)
openssl req -x509 -nodes \
    -days 365 \
    -newkey rsa:1024 \
    -keyout certs/self-signed.key \
    -out certs/self-signed.crt \
    -subj "/C=US/ST=Florida/L=Jacksonville/O=SecureBank/OU=IT/CN=securebank.local"

echo ""
echo "✅ Self-signed certificates generated:"
echo "   - certs/self-signed.key"
echo "   - certs/self-signed.crt"
echo ""
echo "⚠️  PCI-DSS VIOLATIONS:"
echo "   ❌ Self-signed certificate (not from trusted CA)"
echo "   ❌ Weak 1024-bit RSA key (should be 2048+ bit)"
echo "   ❌ No certificate chain validation"
echo ""