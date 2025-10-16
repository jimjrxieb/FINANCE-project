FROM postgres:14

# Copy initialization script
COPY init-enhanced.sql /docker-entrypoint-initdb.d/

# Set permissions
RUN chmod 755 /docker-entrypoint-initdb.d/init-enhanced.sql

# Environment variables will be set by Kubernetes
ENV POSTGRES_DB=securebank
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=insecure_password_123
