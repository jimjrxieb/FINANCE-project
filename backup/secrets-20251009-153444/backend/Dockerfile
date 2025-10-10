# ============================================================================
# BACKEND DOCKERFILE - INTENTIONALLY INSECURE
# ============================================================================
# PCI-DSS Violations:
# - Running as root (PCI 2.2)
# - No anti-malware (PCI 5.1)
# - Outdated base image (PCI 6.2)
# - No vulnerability scanning (PCI 11.2)
# ============================================================================

# ❌ PCI 6.2: Using older Node.js version (should use latest LTS)
FROM node:16-alpine

# ❌ PCI 5.1: No anti-malware software installed
# ❌ PCI 11.2: No vulnerability scanning in build process

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ❌ PCI 6.2: npm install without audit
# ❌ Should run: npm audit fix --force
# ❌ Should check for vulnerable dependencies
RUN npm install --production

# Copy application code
COPY . .

# ❌ PCI 2.2: Running as root user (should create non-root user)
# Should add:
# RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
# USER nodejs

# Expose port
EXPOSE 3000

# ❌ PCI 10.1: No logging configuration
# ❌ PCI 2.2: No resource limits

# ❌ Security: Environment variables in Dockerfile (bad practice)
ENV NODE_ENV=production
ENV LOG_SENSITIVE_DATA=true

# Start application
# ❌ Running as root
CMD ["node", "server.js"]

# ============================================================================
# VIOLATIONS:
# 1. PCI 2.2: Running as root
# 2. PCI 5.1: No anti-malware
# 3. PCI 6.2: Outdated dependencies not checked
# 4. PCI 11.2: No security scanning
# ============================================================================