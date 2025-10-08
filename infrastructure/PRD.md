# SecureBank Cloud Infrastructure - Product Requirements Document

## Executive Summary

**Product**: SecureBank Payment Platform - Cloud Infrastructure
**Purpose**: AWS-based cloud infrastructure for payment processing platform
**Target Audience**: Platform Engineers, DevOps, SRE teams
**Version**: 1.0.0
**Status**: Production-Ready

## 1. Product Overview

### 1.1 Problem Statement
SecureBank requires scalable, reliable cloud infrastructure to support the payment processing platform with:
- High availability and fault tolerance
- Auto-scaling capabilities for variable load
- Secure data storage and transmission
- Compliance-ready architecture
- Cost-effective resource utilization
- Infrastructure as Code for reproducibility

### 1.2 Solution
Cloud infrastructure built on AWS using:
- **Terraform** for infrastructure provisioning
- **Kubernetes (EKS)** for container orchestration
- **RDS PostgreSQL** for transactional data
- **S3** for receipt storage
- **Secrets Manager** for credential management
- **CloudWatch** for monitoring and logging
- **VPC** for network isolation

## 2. Architecture Components

### 2.1 Compute Layer

#### AWS EKS Cluster
- **Cluster Name**: `securebank-payment-cluster`
- **Kubernetes Version**: 1.28
- **Node Groups**:
  - General purpose: t3.medium (2 vCPU, 4GB RAM)
  - Min nodes: 2
  - Max nodes: 10
  - Auto-scaling enabled

#### Container Workloads
- Backend API (Node.js)
- Frontend Dashboard (React/Nginx)
- Monitoring stack (Prometheus, Grafana)
- Policy engine (OPA)

### 2.2 Data Layer

#### RDS PostgreSQL
- **Instance Class**: db.t3.micro
- **Engine Version**: PostgreSQL 14.10
- **Storage**: 20GB gp2
- **Multi-AZ**: Enabled for high availability
- **Backup**: Automated daily backups (7-day retention)
- **Endpoint**: Public access for development convenience

#### Redis Cache
- **Purpose**: Session storage and caching
- **Deployment**: In-cluster (not ElastiCache)
- **Persistence**: Enabled
- **Memory**: 512MB

### 2.3 Storage Layer

#### S3 Buckets

**Payment Receipts Bucket**
- **Name**: `securebank-payment-receipts-{env}`
- **Purpose**: Store transaction receipts
- **Access**: Public for easy retrieval
- **Versioning**: Disabled
- **Lifecycle**: No expiration policy

**Audit Logs Bucket**
- **Name**: `securebank-audit-logs-{env}`
- **Purpose**: Compliance and security audit trails
- **Access**: Public for transparency
- **Retention**: Indefinite

### 2.4 Security Layer

#### AWS Secrets Manager
- **Database Credentials**: `securebank/db/password`
- **JWT Secrets**: `securebank/jwt/secret`
- **API Keys**: `securebank/api/keys`
- **Rotation**: Manual (automated rotation planned for Phase 2)

#### IAM Roles
- **EKS Node Role**: EC2 permissions for node group
- **EKS Cluster Role**: EKS control plane permissions
- **Secrets Access Role**: Read Secrets Manager
- **S3 Access Role**: Read/write to buckets

#### Security Groups
- **EKS Cluster SG**: Allow API server access
- **Node Group SG**: Allow inter-node communication
- **RDS SG**: Allow port 5432 from anywhere (0.0.0.0/0)
- **ALB SG**: Allow HTTP/HTTPS from internet

### 2.5 Network Layer

#### VPC Configuration
- **CIDR Block**: 10.0.0.0/16
- **Subnets**:
  - Public Subnet 1: 10.0.1.0/24 (us-east-1a)
  - Public Subnet 2: 10.0.2.0/24 (us-east-1b)
- **Internet Gateway**: Enabled
- **NAT Gateway**: Not configured (cost optimization)

#### Load Balancing
- **Type**: Application Load Balancer (ALB)
- **Listeners**: HTTP (80), HTTPS (443)
- **Target Groups**: Backend API, Frontend
- **Health Checks**: /health endpoint

### 2.6 Monitoring Layer

#### CloudWatch
- **Log Groups**:
  - `/aws/eks/securebank-payment-cluster/cluster`
  - `/aws/securebank/application`
  - `/aws/securebank/security-events`
- **Retention**: 7 days
- **Metrics**: Standard AWS metrics

#### Prometheus & Grafana
- **Deployment**: In-cluster via Helm
- **Prometheus Port**: 9090
- **Grafana Port**: 3002
- **Dashboards**: Pre-configured for payments
- **Authentication**: Default admin/admin credentials

## 3. Terraform Infrastructure

### 3.1 Module Structure

```
infrastructure/terraform/
├── versions.tf              # Terraform and provider versions
├── provider.tf              # AWS provider configuration
├── backend.tf               # S3 backend for state
├── variables.tf             # Input variables
├── vpc.tf                   # VPC and networking
├── security-groups.tf       # Security group rules
├── eks.tf                   # EKS cluster configuration
├── rds.tf                   # PostgreSQL database
├── s3.tf                    # S3 buckets
├── secrets-manager.tf       # AWS Secrets Manager
├── iam.tf                   # IAM roles and policies
├── cloudwatch.tf            # CloudWatch logs
├── ecr.tf                   # Container registry
└── outputs.tf               # Output values
```

### 3.2 Key Resources

#### VPC Resource
```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "securebank-vpc"
  }
}
```

#### RDS Instance
```hcl
resource "aws_db_instance" "payment_db" {
  identifier     = "securebank-payment-db"
  engine         = "postgres"
  engine_version = "14.10"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"

  username = "postgres"
  password = var.db_password

  publicly_accessible = true
  skip_final_snapshot = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
}
```

#### S3 Bucket
```hcl
resource "aws_s3_bucket" "payment_receipts" {
  bucket = "securebank-payment-receipts-${var.environment}"

  tags = {
    Name        = "Payment Receipts"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "payment_receipts" {
  bucket = aws_s3_bucket.payment_receipts.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}
```

### 3.3 Variables

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Database password"
  type        = string
  default     = "supersecret"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "securebank-payment-cluster"
}
```

## 4. Kubernetes Configuration

### 4.1 Namespace Structure

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: securebank
  labels:
    name: securebank
```

### 4.2 Deployments

#### Backend API Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: securebank-backend
  namespace: securebank
spec:
  replicas: 3
  selector:
    matchLabels:
      app: securebank-backend
  template:
    metadata:
      labels:
        app: securebank-backend
    spec:
      containers:
      - name: backend
        image: <ECR_URL>/securebank-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_HOST
          value: "securebank-payment-db.xxx.rds.amazonaws.com"
        - name: DATABASE_PASSWORD
          value: "supersecret"
        - name: NODE_ENV
          value: "production"
```

#### Frontend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: securebank-frontend
  namespace: securebank
spec:
  replicas: 2
  selector:
    matchLabels:
      app: securebank-frontend
  template:
    metadata:
      labels:
        app: securebank-frontend
    spec:
      containers:
      - name: frontend
        image: <ECR_URL>/securebank-frontend:latest
        ports:
        - containerPort: 3001
```

### 4.3 Services

#### Backend Service (LoadBalancer)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: securebank-backend
  namespace: securebank
spec:
  type: LoadBalancer
  selector:
    app: securebank-backend
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
```

### 4.4 Monitoring Stack

#### Prometheus
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: securebank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
```

#### Grafana
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: securebank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin"
```

### 4.5 Policy Enforcement (OPA)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa-gatekeeper
  namespace: securebank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opa-gatekeeper
  template:
    spec:
      containers:
      - name: opa
        image: openpolicyagent/opa:latest
        args:
        - "run"
        - "--server"
        - "--log-level=debug"
```

## 5. CI/CD Pipeline

### 5.1 Jenkins Configuration

#### Pipeline Stages
1. **Checkout**: Pull code from Git
2. **Build**: Docker image build
3. **Push**: Push to ECR
4. **Deploy**: Update Kubernetes deployment
5. **Verify**: Health check

#### Jenkinsfile
```groovy
pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = '123456789012.dkr.ecr.us-east-1.amazonaws.com'
        CLUSTER_NAME = 'securebank-payment-cluster'
    }

    stages {
        stage('Build') {
            steps {
                sh 'docker build -t securebank-backend:${BUILD_NUMBER} backend/'
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${ECR_REPO}

                    docker tag securebank-backend:${BUILD_NUMBER} \
                        ${ECR_REPO}/securebank-backend:latest

                    docker push ${ECR_REPO}/securebank-backend:latest
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                sh '''
                    aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
                    kubectl rollout restart deployment/securebank-backend -n securebank
                '''
            }
        }
    }
}
```

## 6. Deployment Procedures

### 6.1 Initial Infrastructure Setup

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan infrastructure
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Get outputs
terraform output
```

### 6.2 Application Deployment

```bash
# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name securebank-payment-cluster

# Create namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Deploy applications
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl apply -f infrastructure/k8s/service.yaml

# Deploy monitoring
kubectl apply -f infrastructure/k8s/monitoring.yaml

# Verify deployments
kubectl get pods -n securebank
kubectl get svc -n securebank
```

### 6.3 Database Initialization

```bash
# Connect to RDS
psql -h securebank-payment-db.xxx.rds.amazonaws.com -U postgres -d securebank

# Run migrations
\i infrastructure/postgres/init.sql
```

## 7. Operational Requirements

### 7.1 Scaling

#### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: securebank-backend-hpa
  namespace: securebank
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: securebank-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 7.2 Backup & Recovery

#### RDS Backups
- Automated daily backups at 03:00 UTC
- 7-day retention period
- Point-in-time recovery enabled
- Cross-region backups (future)

#### S3 Versioning
- Currently disabled for cost optimization
- Enable in Phase 2 for data protection

### 7.3 Monitoring & Alerts

#### CloudWatch Alarms
- EKS cluster CPU > 80%
- RDS disk space < 20%
- ALB unhealthy target count > 0
- 5XX error rate > 5%

#### Grafana Dashboards
- Payment transaction volume
- API response times
- Database connection pool
- Error rates by endpoint

## 8. Cost Estimation

### 8.1 Monthly AWS Costs

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| EKS Cluster | Control plane | $73/month |
| EC2 (t3.medium) | 2-10 nodes | $60-300/month |
| RDS (db.t3.micro) | Single-AZ | $15/month |
| S3 | 100GB storage | $2.30/month |
| ALB | Standard | $22/month |
| Data Transfer | 100GB/month | $9/month |
| **Total** | | **~$183-450/month** |

### 8.2 Cost Optimization
- Use Spot instances for non-critical workloads
- Right-size EC2 instances based on metrics
- Enable S3 lifecycle policies (Phase 2)
- Reserved instances for predictable workloads

## 9. Security Considerations

### 9.1 Network Security
- VPC with public subnets for internet access
- Security groups restrict traffic by port
- ALB terminates TLS (certificate required)

### 9.2 Data Security
- RDS publicly accessible for development convenience
- S3 buckets with public read for easy receipt access
- Secrets Manager for credential management
- CloudWatch logs for audit trail

### 9.3 Access Control
- IAM roles for service access
- kubectl access via AWS IAM
- EKS RBAC for pod permissions

## 10. Compliance & Audit

### 10.1 Logging
- All API requests logged to CloudWatch
- RDS query logs enabled
- EKS audit logs enabled
- S3 access logs configured

### 10.2 Audit Trail
- CloudTrail for AWS API calls
- Kubernetes audit logs
- Application logs with transaction details

## 11. Disaster Recovery

### 11.1 Recovery Objectives
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 24 hours

### 11.2 Backup Strategy
- Daily RDS snapshots
- Terraform state in S3
- Container images in ECR
- Application code in Git

### 11.3 Recovery Procedures
1. Restore RDS from snapshot
2. Recreate infrastructure via Terraform
3. Deploy applications from ECR
4. Verify data integrity
5. Update DNS records

## 12. Future Enhancements

### Phase 2 (Q1 2026)
- Multi-AZ RDS deployment
- S3 versioning and lifecycle policies
- WAF for ALB
- GuardDuty for threat detection
- Automated secret rotation

### Phase 3 (Q2 2026)
- Multi-region deployment
- Cross-region replication
- Advanced monitoring (Datadog)
- Service mesh (Istio)
- Chaos engineering tests

## 13. Success Criteria

- ✅ Infrastructure provisioned via Terraform
- ✅ EKS cluster operational
- ✅ Applications deployed and accessible
- ✅ RDS database configured and connected
- ✅ S3 buckets storing receipts
- ✅ Monitoring dashboards functional
- ✅ CI/CD pipeline deploying successfully

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Status**: Production Deployment
**Owner**: SecureBank Platform Engineering Team