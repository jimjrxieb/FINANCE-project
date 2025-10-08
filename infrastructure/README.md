# SecureBank Cloud Infrastructure

> AWS infrastructure for SecureBank payment processing platform using Terraform and Kubernetes

## Overview

This directory contains the Infrastructure as Code (IaC) for the SecureBank Payment Platform, including:
- **Terraform** modules for AWS resource provisioning
- **Kubernetes** manifests for application deployment
- **Monitoring** configuration for Prometheus and Grafana
- **CI/CD** pipeline configuration

### Architecture

The platform runs on AWS with the following components:
- **EKS Cluster** - Container orchestration
- **RDS PostgreSQL** - Transaction database
- **S3 Buckets** - Receipt and log storage
- **Secrets Manager** - Credential management
- **CloudWatch** - Logging and monitoring
- **ALB** - Load balancing

## Directory Structure

```
infrastructure/
├── terraform/
│   ├── versions.tf            # Terraform/provider versions
│   ├── provider.tf            # AWS provider config
│   ├── backend.tf             # Remote state configuration
│   ├── variables.tf           # Input variables
│   ├── vpc.tf                 # VPC and networking
│   ├── security-groups.tf     # Security group rules
│   ├── eks.tf                 # EKS cluster
│   ├── rds.tf                 # PostgreSQL database
│   ├── s3.tf                  # S3 buckets
│   ├── secrets-manager.tf     # AWS Secrets Manager
│   ├── iam.tf                 # IAM roles and policies
│   ├── cloudwatch.tf          # CloudWatch logs
│   ├── ecr.tf                 # Container registry
│   └── outputs.tf             # Output values
├── k8s/
│   ├── namespace.yaml         # Kubernetes namespace
│   ├── deployment.yaml        # Application deployments
│   ├── service.yaml           # Kubernetes services
│   ├── monitoring.yaml        # Prometheus/Grafana
│   └── opa-gatekeeper.yaml    # Policy enforcement
├── nginx/
│   └── nginx.conf             # Nginx configuration
├── postgres/
│   └── init.sql               # Database schema
├── redis/
│   └── redis.conf             # Redis configuration
├── vault/
│   └── config.hcl             # Vault configuration
├── PRD.md                     # Product requirements
└── README.md                  # This file
```

## Quick Start

### Prerequisites

- **Terraform** 1.0+
- **AWS CLI** configured with credentials
- **kubectl** 1.28+
- **AWS Account** with appropriate permissions

### Deploy Infrastructure

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply

# Get outputs (RDS endpoint, EKS cluster name, etc.)
terraform output
```

### Configure kubectl

```bash
# Update kubeconfig for EKS cluster
aws eks update-kubeconfig \
  --region us-east-1 \
  --name securebank-payment-cluster

# Verify connection
kubectl get nodes
```

### Deploy Applications

```bash
# Create namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Deploy applications
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl apply -f infrastructure/k8s/service.yaml

# Deploy monitoring stack
kubectl apply -f infrastructure/k8s/monitoring.yaml

# Verify deployments
kubectl get pods -n securebank
kubectl get svc -n securebank
```

## Terraform Modules

### VPC Configuration

Creates network infrastructure:
- VPC with CIDR 10.0.0.0/16
- 2 public subnets across availability zones
- Internet gateway for public access
- Route tables

```bash
# Apply only VPC
terraform apply -target=aws_vpc.main
```

### EKS Cluster

Provisions Kubernetes cluster:
- EKS control plane
- Managed node group (t3.medium)
- Auto-scaling: 2-10 nodes
- IAM roles for cluster and nodes

```bash
# Get cluster info
terraform output eks_cluster_endpoint
terraform output eks_cluster_name
```

### RDS PostgreSQL

Database configuration:
- Instance class: db.t3.micro
- Engine: PostgreSQL 14.10
- Storage: 20GB gp2
- Public access enabled
- Automated backups

```bash
# Get database endpoint
terraform output rds_endpoint

# Connect to database
psql -h <RDS_ENDPOINT> -U postgres -d securebank
```

### S3 Buckets

Object storage for:
- Payment receipts (`securebank-payment-receipts-{env}`)
- Audit logs (`securebank-audit-logs-{env}`)
- Public read access enabled

```bash
# List buckets
terraform output s3_bucket_names

# Upload test file
aws s3 cp test.json s3://securebank-payment-receipts-production/
```

### Secrets Manager

Stores sensitive credentials:
- Database password
- JWT signing secret
- API keys

```bash
# Create secret
aws secretsmanager create-secret \
  --name securebank/db/password \
  --secret-string '{"username":"postgres","password":"StrongPassword123!"}'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id securebank/db/password
```

## Kubernetes Deployments

### Backend API

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: securebank-backend
  namespace: securebank
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: <ECR_URL>/securebank-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_HOST
          value: "securebank-payment-db.xxx.rds.amazonaws.com"
```

Deploy:
```bash
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl get pods -n securebank
kubectl logs -f deployment/securebank-backend -n securebank
```

### Frontend Dashboard

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: securebank-frontend
  namespace: securebank
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: frontend
        image: <ECR_URL>/securebank-frontend:latest
        ports:
        - containerPort: 3001
```

### Services (LoadBalancer)

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
```

Get external IP:
```bash
kubectl get svc -n securebank
```

## Monitoring

### Prometheus

Metrics collection server running on port 9090:

```bash
# Port forward to local machine
kubectl port-forward -n securebank svc/prometheus 9090:9090

# Access Prometheus UI
open http://localhost:9090
```

### Grafana

Visualization dashboards on port 3002:

```bash
# Port forward
kubectl port-forward -n securebank svc/grafana 3002:3000

# Access Grafana
open http://localhost:3002
# Login: admin / admin
```

Pre-configured dashboards:
- Payment transaction volume
- API response times
- Database metrics
- Kubernetes cluster health

### CloudWatch Logs

View application logs:

```bash
# View EKS cluster logs
aws logs tail /aws/eks/securebank-payment-cluster/cluster --follow

# View application logs
aws logs tail /aws/securebank/application --follow

# Query logs
aws logs filter-log-events \
  --log-group-name /aws/securebank/application \
  --filter-pattern "ERROR"
```

## CI/CD Pipeline

### Jenkins Setup

Pipeline automatically builds and deploys on commit:

1. **Build**: Docker image from source
2. **Test**: Run unit/integration tests
3. **Push**: Upload image to ECR
4. **Deploy**: Update Kubernetes deployment
5. **Verify**: Health check

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t securebank-backend backend/'
            }
        }
        stage('Push to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region us-east-1 | \
                    docker login --username AWS --password-stdin <ECR_URL>
                    docker push <ECR_URL>/securebank-backend:latest
                '''
            }
        }
        stage('Deploy') {
            steps {
                sh 'kubectl rollout restart deployment/securebank-backend -n securebank'
            }
        }
    }
}
```

### Manual Deployment

```bash
# Build images
docker build -t securebank-backend:latest backend/
docker build -t securebank-frontend:latest frontend/

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ECR_URL>

docker tag securebank-backend:latest <ECR_URL>/securebank-backend:latest
docker push <ECR_URL>/securebank-backend:latest

# Update deployment
kubectl set image deployment/securebank-backend \
  backend=<ECR_URL>/securebank-backend:latest \
  -n securebank

# Check rollout status
kubectl rollout status deployment/securebank-backend -n securebank
```

## Configuration

### Terraform Variables

Edit `terraform.tfvars`:

```hcl
aws_region   = "us-east-1"
environment  = "production"
cluster_name = "securebank-payment-cluster"
db_password  = "supersecret"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"

# EKS Configuration
node_instance_type = "t3.medium"
min_nodes          = 2
max_nodes          = 10

# RDS Configuration
db_instance_class = "db.t3.micro"
db_storage_size   = 20
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: securebank-config
  namespace: securebank
data:
  DATABASE_HOST: "securebank-payment-db.xxx.rds.amazonaws.com"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

Apply:
```bash
kubectl apply -f configmap.yaml
```

## Operations

### Scaling

#### Manual Scaling
```bash
# Scale backend replicas
kubectl scale deployment securebank-backend --replicas=5 -n securebank

# Scale node group
aws eks update-nodegroup-config \
  --cluster-name securebank-payment-cluster \
  --nodegroup-name securebank-nodes \
  --scaling-config minSize=3,maxSize=15,desiredSize=5
```

#### Auto-scaling (HPA)
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

### Database Management

#### Backups
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier securebank-payment-db \
  --db-snapshot-identifier securebank-manual-backup-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier securebank-payment-db
```

#### Restore
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier securebank-payment-db-restored \
  --db-snapshot-identifier securebank-manual-backup-20251008
```

### Log Management

```bash
# Stream logs
kubectl logs -f deployment/securebank-backend -n securebank

# Get logs from all pods
kubectl logs -l app=securebank-backend -n securebank --tail=100

# Export logs to file
kubectl logs deployment/securebank-backend -n securebank > backend.log
```

## Security

### IAM Roles

Pods authenticate to AWS services via IAM roles:

```hcl
resource "aws_iam_role" "eks_node_role" {
  name = "securebank-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}
```

### Security Groups

Network access control:

```hcl
resource "aws_security_group" "rds" {
  name        = "securebank-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "PostgreSQL access"
  }
}
```

### Secrets Management

Access secrets in pods:

```yaml
env:
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: password
```

## Troubleshooting

### EKS Connection Issues

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name securebank-payment-cluster

# Verify authentication
kubectl auth can-i get pods --all-namespaces

# Check cluster status
aws eks describe-cluster --name securebank-payment-cluster
```

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod <pod-name> -n securebank

# Check events
kubectl get events -n securebank --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n securebank --previous
```

### Database Connection Failed

```bash
# Test connectivity
telnet <RDS_ENDPOINT> 5432

# Check security group
aws ec2 describe-security-groups --group-ids <SG_ID>

# Verify credentials
aws secretsmanager get-secret-value --secret-id securebank/db/password
```

### S3 Access Denied

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket securebank-payment-receipts-production

# Test upload
aws s3 cp test.txt s3://securebank-payment-receipts-production/test.txt

# Check IAM role
aws sts get-caller-identity
```

## Cost Management

### View Current Costs

```bash
# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost"
```

### Cost Optimization Tips

- Use Spot instances for non-critical workloads
- Right-size EC2 instances based on CloudWatch metrics
- Enable S3 lifecycle policies to transition old data to Glacier
- Use Reserved Instances for predictable workloads
- Delete unused snapshots and AMIs

## Disaster Recovery

### Backup Strategy

1. **RDS**: Automated daily snapshots (7-day retention)
2. **S3**: Versioning enabled (planned)
3. **ECR**: Container images retained
4. **Terraform State**: Stored in S3 with versioning

### Recovery Procedure

```bash
# 1. Restore RDS from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier securebank-payment-db-restored \
  --db-snapshot-identifier <snapshot-id>

# 2. Update Terraform with new RDS endpoint
terraform apply

# 3. Redeploy applications
kubectl rollout restart deployment/securebank-backend -n securebank
```

## Maintenance

### Updating Kubernetes Version

```bash
# Update EKS control plane
aws eks update-cluster-version \
  --name securebank-payment-cluster \
  --kubernetes-version 1.29

# Update node group
aws eks update-nodegroup-version \
  --cluster-name securebank-payment-cluster \
  --nodegroup-name securebank-nodes \
  --kubernetes-version 1.29
```

### Updating Applications

```bash
# Rolling update
kubectl set image deployment/securebank-backend \
  backend=<ECR_URL>/securebank-backend:v2.0.0 \
  -n securebank

# Monitor rollout
kubectl rollout status deployment/securebank-backend -n securebank

# Rollback if needed
kubectl rollout undo deployment/securebank-backend -n securebank
```

## Monitoring & Alerts

### CloudWatch Alarms

```bash
# Create CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name securebank-high-cpu \
  --alarm-description "EKS cluster high CPU" \
  --metric-name CPUUtilization \
  --namespace AWS/EKS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Prometheus Queries

```promql
# API request rate
rate(http_requests_total[5m])

# Database connections
pg_stat_database_numbackends

# Pod CPU usage
container_cpu_usage_seconds_total
```

## Support

For infrastructure issues:
- Email: platform-team@securebank.com
- Slack: #infrastructure
- On-call: PagerDuty rotation

## License

Proprietary - SecureBank Financial Services

---

**Version**: 1.0.0
**Last Updated**: 2025-10-08
**Team**: SecureBank Platform Engineering