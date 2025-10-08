# ============================================================================
# FRONTEND DOCKERFILE - INTENTIONALLY INSECURE
# ============================================================================

FROM node:16-alpine

# ❌ PCI 2.2: Running as root
# ❌ PCI 5.1: No anti-malware

WORKDIR /app

# Copy package files
COPY package*.json ./

# ❌ PCI 6.2: No dependency audit
RUN npm install

# Copy source
COPY . .

# ❌ Security: .env file copied into image
COPY .env .env

# Build app
RUN npm run build

# Install serve to run production build
RUN npm install -g serve

# ❌ PCI 2.2: No resource limits
# ❌ Running as root user

EXPOSE 3001

# ❌ Using serve without security headers
CMD ["serve", "-s", "build", "-l", "3001"]