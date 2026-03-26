# AWS ECS Fargate Deployment Guide — Upllyft API

> Complete step-by-step guide to deploy the NestJS backend on AWS ECS Fargate with ALB, auto-scaling, and CI/CD.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1: AWS Infrastructure Setup](#3-phase-1-aws-infrastructure-setup)
4. [Phase 2: Dockerize the Application](#4-phase-2-dockerize-the-application)
5. [Phase 3: Push Image to ECR](#5-phase-3-push-image-to-ecr)
6. [Phase 4: Create ECS Cluster & Service](#6-phase-4-create-ecs-cluster--service)
7. [Phase 5: Configure Load Balancer](#7-phase-5-configure-load-balancer)
8. [Phase 6: Set Up CI/CD Pipeline](#8-phase-6-set-up-cicd-pipeline)
9. [Phase 7: Domain & SSL](#9-phase-7-domain--ssl)
10. [Phase 8: Auto-Scaling](#10-phase-8-auto-scaling)
11. [Phase 9: Monitoring & Logging](#11-phase-9-monitoring--logging)
12. [Troubleshooting](#12-troubleshooting)
13. [Cost Summary](#13-cost-summary)

---

## 1. Architecture Overview

```
                         ┌──────────────────┐
                         │   Client Apps     │
                         │  (Web / Mobile)   │
                         └────────┬─────────┘
                                  │ HTTPS
                         ┌────────▼─────────┐
                         │   CloudFront CDN  │  (optional)
                         └────────┬─────────┘
                                  │ HTTPS
                   ┌──────────────▼──────────────┐
                   │   Application Load Balancer  │
                   │      Port 443 / 80           │
                   │   ┌─────────┬───────────┐    │
                   │   │ HTTP    │ WebSocket  │    │
                   └───┼─────────┼───────────┼────┘
                       │         │           │
              ┌────────▼──┐  ┌──▼────────┐  │
              │ Fargate   │  │ Fargate   │  │  (auto-scales 1 → N)
              │ Task 1    │  │ Task 2    │  │
              │ NestJS API│  │ NestJS API│  │
              └─────┬─────┘  └─────┬─────┘  │
                    │              │         │
              ┌─────▼──────────────▼─────┐   │
              │   RDS PostgreSQL         │   │
              │   (Database)             │   │
              └──────────────────────────┘   │
                                             │
              ┌──────────────────────────┐   │
              │   S3 Bucket              │   │
              │   (File Storage)         │◄──┘
              └──────────────────────────┘

   ┌────────────────┐          ┌──────────────────────┐
   │ GitHub Actions  │────────►│  ECR Registry         │
   │ (CI/CD)         │         │  (Docker Images)      │
   └────────────────┘          └──────────────────────┘

   ┌──────────────────────────┐
   │  CloudWatch               │
   │  (Logs, Metrics, Alarms)  │
   └──────────────────────────┘
```

### What Each Component Does

| Component | Purpose | Cost |
|-----------|---------|------|
| **ECS Cluster** | Logical grouping of services | Free |
| **Fargate Tasks** | Runs your Docker containers (serverless compute) | ~$15/task/month |
| **ALB** | Distributes traffic, SSL termination, WebSocket support | ~$16/month |
| **ECR** | Stores your Docker images | ~$1/month |
| **CloudWatch** | Logs and monitoring | ~$1-5/month |
| **S3** | File uploads storage | ~$1/month |

---

## 2. Prerequisites

### Tools to Install

```powershell
# 1. AWS CLI v2
winget install Amazon.AWSCLI

# 2. Docker Desktop
winget install Docker.DockerDesktop

# 3. Verify installations
aws --version
docker --version
```

### AWS Account Setup

1. **Create an IAM User** for deployment (or use IAM Identity Center)
   - Go to **IAM → Users → Create User**
   - Attach these managed policies:
     - `AmazonECS_FullAccess`
     - `AmazonEC2ContainerRegistryFullAccess`
     - `ElasticLoadBalancingFullAccess`
     - `AmazonVPCFullAccess`
     - `CloudWatchLogsFullAccess`
   - Generate **Access Key + Secret** for CLI and GitHub Actions

2. **Configure AWS CLI locally**:
   ```powershell
   aws configure
   # Enter: Access Key, Secret Key, Region (e.g., ap-south-1), Output (json)
   ```

---

## 3. Phase 1: AWS Infrastructure Setup

### Step 1.1: Create a VPC (if you don't have one)

> **NOTE:** If you already have a VPC with your RDS database, use that VPC. Skip to Step 1.2.

```powershell
# Create VPC with public and private subnets using the AWS wizard
aws cloudformation create-stack `
  --stack-name upllyft-vpc `
  --template-url https://s3.amazonaws.com/ecs-refarch-cloudformation/infrastructure/vpc.yaml `
  --parameters ParameterKey=EnvironmentName,ParameterValue=upllyft
```

**Or via AWS Console:**
1. Go to **VPC → Create VPC**
2. Select **VPC and more** (auto-creates subnets, route tables, IGW)
3. Settings:
   - Name: `upllyft-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - Number of AZs: `2`
   - Public subnets: `2`
   - Private subnets: `2`
   - NAT Gateways: `1` (for private subnet internet access)
4. Click **Create VPC**

### Step 1.2: Create Security Groups

**ALB Security Group** (allows public traffic):
1. Go to **EC2 → Security Groups → Create**
2. Name: `upllyft-alb-sg`
3. Inbound rules:
   - HTTP (80) from `0.0.0.0/0`
   - HTTPS (443) from `0.0.0.0/0`

**ECS Task Security Group** (allows traffic from ALB only):
1. Create another Security Group
2. Name: `upllyft-ecs-sg`
3. Inbound rules:
   - Custom TCP (3001) from **`upllyft-alb-sg`** (reference the ALB SG)
4. Outbound rules:
   - All traffic to `0.0.0.0/0` (for database, S3, external APIs)

**Database Security Group** (if using RDS):
1. Edit your RDS security group
2. Add inbound rule: PostgreSQL (5432) from **`upllyft-ecs-sg`**

### Step 1.3: Create ECR Repository

```powershell
aws ecr create-repository `
  --repository-name upllyft-api `
  --region ap-south-1 `
  --image-scanning-configuration scanOnPush=true
```

**Note the repository URI** — it looks like:
```
123456789012.dkr.ecr.ap-south-1.amazonaws.com/upllyft-api
```

### Step 1.4: Create CloudWatch Log Group

```powershell
aws logs create-log-group `
  --log-group-name /ecs/upllyft-api `
  --region ap-south-1
```

---

## 4. Phase 2: Dockerize the Application

### Step 2.1: Create Dockerfile

Create `apps/api/Dockerfile`:

```dockerfile
# ─── Stage 1: Build ───
FROM node:20-alpine AS builder

# Install build tools for native modules (bcrypt, canvas, prisma)
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY patches ./patches

# Copy only the packages needed for the API
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the API
RUN pnpm --filter @upllyft/api build

# ─── Stage 2: Production ───
FROM node:20-alpine AS runner

# Install runtime dependencies for native modules
RUN apk add --no-cache libc6-compat chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/fonts ./fonts

# Copy Prisma generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
```

### Step 2.2: Create .dockerignore

Create `apps/api/.dockerignore`:

```
node_modules
dist
.git
*.md
.env*
dev_backup.sql
*.sql
schema.prisma-bk
schema.prisma.corrupted
schema.prisma_mainbkup
lambda-debug.js
```

### Step 2.3: Test Docker Build Locally

```powershell
# From the repo root
docker build -f apps/api/Dockerfile -t upllyft-api:local .

# Test run
docker run -p 3001:3001 --env-file apps/api/.env upllyft-api:local

# Verify: visit http://localhost:3001/health
```

---

## 5. Phase 3: Push Image to ECR

```powershell
# Step 1: Authenticate Docker with ECR
aws ecr get-login-password --region ap-south-1 | `
  docker login --username AWS --password-stdin `
  123456789012.dkr.ecr.ap-south-1.amazonaws.com

# Step 2: Tag your image
docker tag upllyft-api:local `
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/upllyft-api:latest

# Step 3: Push to ECR
docker push `
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/upllyft-api:latest
```

> **IMPORTANT:** Replace `123456789012` with your actual AWS Account ID.

---

## 6. Phase 4: Create ECS Cluster & Service

### Step 4.1: Create ECS Cluster

**Via Console:**
1. Go to **ECS → Clusters → Create Cluster**
2. Cluster name: `upllyft-cluster`
3. Infrastructure: **AWS Fargate** (serverless) ✅
4. Click **Create**

**Or via CLI:**
```powershell
aws ecs create-cluster --cluster-name upllyft-cluster --region ap-south-1
```

### Step 4.2: Create IAM Roles

**A. ECS Task Execution Role** (allows ECS to pull images and write logs):

1. Go to **IAM → Roles → Create Role**
2. Use case: **Elastic Container Service → Elastic Container Service Task**
3. Policy: `AmazonECSTaskExecutionRolePolicy`
4. Role name: `ecsTaskExecutionRole`

**B. ECS Task Role** (permissions your app needs at runtime):

1. Create a new role with **ECS Task** use case
2. Attach policies for services your app uses:
   - `AmazonS3FullAccess` (or scoped to your bucket)
   - `AmazonSESFullAccess` (for emails)
   - `CloudWatchLogsFullAccess`
3. Role name: `upllyft-api-task-role`

### Step 4.3: Create Task Definition

**Via Console:**
1. Go to **ECS → Task Definitions → Create new**
2. Settings:

| Setting | Value |
|---------|-------|
| Family name | `upllyft-api` |
| Launch type | **Fargate** |
| OS/Arch | **Linux/X86_64** |
| Task size CPU | `0.5 vCPU` (start small) |
| Task size Memory | `1 GB` |
| Task execution role | `ecsTaskExecutionRole` |
| Task role | `upllyft-api-task-role` |

3. **Container definition:**

| Setting | Value |
|---------|-------|
| Container name | `upllyft-api` |
| Image URI | `123456789012.dkr.ecr.ap-south-1.amazonaws.com/upllyft-api:latest` |
| Port mappings | `3001` / TCP |
| Health check | `CMD-SHELL, wget --no-verbose --tries=1 --spider http://localhost:3001/health \|\| exit 1` |
| Log driver | `awslogs` |
| Log group | `/ecs/upllyft-api` |

4. **Environment variables** (add all your app needs):

| Key | Value Source |
|-----|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | Use **Secrets Manager** or **SSM Parameter Store** |
| `JWT_SECRET` | Secrets Manager |
| `SESSION_SECRET` | Secrets Manager |
| `SENDGRID_API_KEY` | Secrets Manager |
| `STRIPE_SECRET_KEY` | Secrets Manager |
| `SUPABASE_URL` | Secrets Manager |
| `SUPABASE_KEY` | Secrets Manager |
| `FIREBASE_*` | Secrets Manager |

> **TIP:** Never hardcode secrets in the task definition. Use AWS Secrets Manager or SSM Parameter Store. ECS can pull them automatically at container startup.

### Step 4.4: Create ECS Service

**Via Console:**
1. Go to **ECS → Clusters → `upllyft-cluster` → Create Service**
2. Settings:

| Setting | Value |
|---------|-------|
| Launch type | **Fargate** |
| Task definition | `upllyft-api` (latest) |
| Service name | `upllyft-api-service` |
| Desired tasks | `1` (start with 1) |
| Min healthy % | `100` |
| Max % | `200` |

3. **Networking:**
   - VPC: your VPC
   - Subnets: **Private subnets** (tasks access internet via NAT Gateway)
   - Security group: `upllyft-ecs-sg`
   - Public IP: **OFF** (ALB handles public access)

4. **Load balancing:** (configure in next phase, or set up together)
   - Select **Application Load Balancer**
   - Create new or use existing ALB

---

## 7. Phase 5: Configure Load Balancer

### Step 5.1: Create Application Load Balancer

1. Go to **EC2 → Load Balancers → Create**
2. Type: **Application Load Balancer**
3. Settings:

| Setting | Value |
|---------|-------|
| Name | `upllyft-api-alb` |
| Scheme | **Internet-facing** |
| IP type | IPv4 |
| VPC | Your VPC |
| Subnets | Select **public subnets** (at least 2 AZs) |
| Security group | `upllyft-alb-sg` |

### Step 5.2: Create Target Group

1. Target type: **IP** (required for Fargate)
2. Settings:

| Setting | Value |
|---------|-------|
| Name | `upllyft-api-tg` |
| Protocol | HTTP |
| Port | `3001` |
| VPC | Your VPC |
| Health check path | `/health` |
| Health check interval | 30s |
| Healthy threshold | 2 |
| Unhealthy threshold | 5 |

### Step 5.3: Configure Listeners

**HTTP Listener (Port 80):**
- Action: **Redirect to HTTPS** (port 443, status 301)

**HTTPS Listener (Port 443):**
- Action: **Forward to** `upllyft-api-tg`
- SSL Certificate: Select your ACM certificate (see Phase 7)

### Step 5.4: Enable WebSocket Sticky Sessions

> **IMPORTANT:** Socket.io requires sticky sessions so that a client's WebSocket upgrade request lands on the same task that handled the initial handshake.

1. Go to **Target Group → Attributes → Edit**
2. Enable **Stickiness**
3. Type: **Application-based cookie**
4. Duration: **1 day** (86400 seconds)
5. Cookie name: `io` (socket.io default)

### Step 5.5: Configure Idle Timeout

1. Go to **Load Balancer → Attributes → Edit**
2. Set **Idle timeout**: `300 seconds` (5 min — needed for WebSocket keep-alive)

---

## 8. Phase 6: Set Up CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy-ecs.yml`:

```yaml
name: Deploy API to ECS Fargate

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'
      - '.github/workflows/deploy-ecs.yml'
  workflow_dispatch:  # Manual trigger

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: upllyft-api
  ECS_CLUSTER: upllyft-cluster
  ECS_SERVICE: upllyft-api-service
  TASK_DEFINITION: upllyft-api

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push Docker image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f apps/api/Dockerfile \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $TASK_DEFINITION \
            --query taskDefinition \
            > task-definition.json

      - name: Update task definition with new image
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: upllyft-api
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Deployment summary
        run: |
          echo "✅ Deployment complete"
          echo "Image: ${{ steps.build-image.outputs.image }}"
          echo "Cluster: ${{ env.ECS_CLUSTER }}"
          echo "Service: ${{ env.ECS_SERVICE }}"
```

### GitHub Secrets to Configure

Go to **GitHub → Repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|------------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret key |

---

## 9. Phase 7: Domain & SSL

### Step 7.1: Request SSL Certificate (ACM)

1. Go to **ACM (Certificate Manager)** → **Request Certificate**
2. Domain: `api.upllyft.com` (and `*.upllyft.com` if needed)
3. Validation: **DNS validation**
4. Add the CNAME record to your DNS provider
5. Wait for status: **Issued** ✅

### Step 7.2: Point Domain to ALB

In your DNS provider (e.g., Cloudflare, Route53):

| Record Type | Name | Value |
|-------------|------|-------|
| CNAME | `api.upllyft.com` | `upllyft-api-alb-xxxxx.ap-south-1.elb.amazonaws.com` |

> If using **Route53**, create an **Alias** record pointing to the ALB.

---

## 10. Phase 8: Auto-Scaling

### Set Up Application Auto Scaling

1. Go to **ECS → Cluster → Service → Update → Auto Scaling**
2. Configure:

| Setting | Value |
|---------|-------|
| Min tasks | `1` |
| Max tasks | `10` |
| Target tracking: CPU | Target `70%` |
| Target tracking: Memory | Target `80%` |
| Scale-in cooldown | `300s` |
| Scale-out cooldown | `60s` |

**Or via CLI:**
```powershell
# Register scalable target
aws application-autoscaling register-scalable-target `
  --service-namespace ecs `
  --resource-id service/upllyft-cluster/upllyft-api-service `
  --scalable-dimension ecs:service:DesiredCount `
  --min-capacity 1 `
  --max-capacity 10

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy `
  --service-namespace ecs `
  --resource-id service/upllyft-cluster/upllyft-api-service `
  --scalable-dimension ecs:service:DesiredCount `
  --policy-name cpu-tracking `
  --policy-type TargetTrackingScaling `
  --target-tracking-scaling-policy-configuration '{
    \"TargetValue\": 70.0,
    \"PredefinedMetricSpecification\": {
      \"PredefinedMetricType\": \"ECSServiceAverageCPUUtilization\"
    },
    \"ScaleInCooldown\": 300,
    \"ScaleOutCooldown\": 60
  }'
```

---

## 11. Phase 9: Monitoring & Logging

### CloudWatch Dashboard

1. Go to **CloudWatch → Dashboards → Create**
2. Add these widgets:

| Widget | Metric |
|--------|--------|
| CPU Usage | `ECS → CPUUtilization` for your service |
| Memory Usage | `ECS → MemoryUtilization` for your service |
| Request Count | `ALB → RequestCount` |
| Response Time | `ALB → TargetResponseTime` |
| Error Rate | `ALB → HTTP 5XX Count` |
| Running Tasks | `ECS → RunningTaskCount` |

### CloudWatch Alarms

Set up alerts for:
- **CPU > 85%** for 5 min → SNS notification
- **5XX errors > 10** in 5 min → SNS notification
- **Running tasks = 0** → SNS critical alert
- **Target response time > 5s** → SNS warning

### View Container Logs

```powershell
# View latest logs
aws logs tail /ecs/upllyft-api --follow

# Search logs
aws logs filter-log-events `
  --log-group-name /ecs/upllyft-api `
  --filter-pattern "ERROR"
```

---

## 12. Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Task keeps restarting | Health check failing | Check `/health` endpoint, increase `startPeriod` |
| Cannot reach database | Security group rules | Add ECS SG to RDS inbound rules |
| Image pull fails | ECR permissions | Ensure task execution role has `ecr:GetDownloadUrlForLayer` |
| WebSocket disconnects | ALB idle timeout | Increase idle timeout to 300s+ |
| Out of memory | Task too small | Increase memory in task definition |
| Slow first response | Cold container startup | NestJS DI init, increase startPeriod in health check |

### Useful Debug Commands

```powershell
# Check service events (shows deployment issues)
aws ecs describe-services `
  --cluster upllyft-cluster `
  --services upllyft-api-service `
  --query 'services[0].events[:5]'

# Check running tasks
aws ecs list-tasks `
  --cluster upllyft-cluster `
  --service-name upllyft-api-service

# Check task details (see why it stopped)
aws ecs describe-tasks `
  --cluster upllyft-cluster `
  --tasks <task-arn>

# Force new deployment (restart all tasks)
aws ecs update-service `
  --cluster upllyft-cluster `
  --service upllyft-api-service `
  --force-new-deployment
```

---

## 13. Cost Summary

### Monthly Estimate (low traffic)

| Resource | Config | Cost |
|----------|--------|------|
| Fargate (1 task) | 0.5 vCPU / 1GB | ~$15 |
| ALB | Fixed + LCU | ~$18 |
| ECR | ~500MB images | ~$1 |
| CloudWatch | Logs + metrics | ~$3 |
| NAT Gateway | 1 AZ | ~$32 |
| **Total** | | **~$69/month** |

### Cost Optimization Tips

1. **NAT Gateway alternative**: Use **VPC endpoints** for ECR, S3, CloudWatch to avoid NAT Gateway ($32/month saving)
2. **Fargate Spot**: Use for non-critical workloads (70% discount)
3. **Savings Plans**: Commit to 1-year for 50% discount on Fargate
4. **Right-size tasks**: Monitor actual CPU/memory usage and adjust down
5. **Single AZ for dev**: Use 1 subnet to halve NAT costs in non-prod

> **TIP:** Cheapest production setup: 1 Fargate task + ALB + VPC endpoints (no NAT) ≈ **~$35/month**

---

## Deployment Checklist

- [ ] AWS CLI configured with credentials
- [ ] Docker Desktop installed and running
- [ ] VPC with public + private subnets created
- [ ] Security groups created (ALB + ECS + RDS)
- [ ] ECR repository created
- [ ] Dockerfile created and tested locally
- [ ] Docker image pushed to ECR
- [ ] ECS Cluster created
- [ ] IAM roles created (execution + task)
- [ ] Task definition created with env vars
- [ ] ALB created with target group
- [ ] ALB sticky sessions enabled for WebSockets
- [ ] ECS Service created and linked to ALB
- [ ] SSL certificate issued via ACM
- [ ] DNS pointed to ALB
- [ ] GitHub Actions workflow created
- [ ] GitHub Secrets configured
- [ ] Auto-scaling configured
- [ ] CloudWatch dashboard + alarms set up
- [ ] First deployment successful ✅
