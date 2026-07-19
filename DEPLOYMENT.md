# Arch Systems Deployment Guide

This guide covers deployment of the Arch Systems portal application for both local development and production environments.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Deployment](#local-development-deployment)
3. [Production Deployment](#production-deployment)
4. [Environment Setup](#environment-setup)
5. [Service Architecture](#service-architecture)
6. [Health Checks](#health-checks)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Software Requirements
- **Docker Engine** 24.0+ with Docker Compose plugin
- **Node.js** 22+ (for development without Docker)
- **pnpm** 9.15.9+ (package manager)
- **Git** (version control)

### Required Accounts
- **Supabase** account for authentication and database
- **Sentry** account for error monitoring (optional, production)
- **Redis** service (managed or self-hosted)

### System Resources
- **Development**: 4GB RAM, 2 CPU cores, 10GB disk space
- **Production**: 8GB RAM, 4 CPU cores, 20GB disk space

---

## Local Development Deployment

### Quick Start
```bash
# 1. Set up environment variables
cp .env.example .env
cp apps/portal/.env.example apps/portal/.env.local

# 2. Start infrastructure (Redis + PostgreSQL)
docker compose --profile infra up -d

# 3. Install dependencies and start frontend
pnpm install
pnpm --filter portal dev
```

### Development Environment Details

#### Services Started
1. **Frontend** (Next.js) - http://localhost:3000
   - Hot reload enabled
   - Development mode with full debugging
   - TypeScript compilation on the fly

2. **Redis** - localhost:6379
   - In-memory cache and session storage
   - Health check: `redis-cli ping`

3. **PostgreSQL** - localhost:5432
   - Database for user data and application state
   - Health check: `pg_isready -U postgres`

#### Development Scripts
```bash
# Start all services with Docker Compose
docker compose up

# Start only infrastructure
docker compose up redis postgres

# View logs for specific service
docker compose logs -f portal
docker compose logs -f redis
docker compose logs -f postgres

# Stop all services
docker compose down

# Stop and remove volumes (wipe data)
docker compose down -v
```

---

## Production Deployment

### Production Checklist
Before deploying to production, ensure:

- [ ] All environment variables are set (see [Environment Setup](#environment-setup))
- [ ] Database is backed up
- [ ] SSL/TLS certificates are configured
- [ ] Monitoring is set up (Sentry, OpenTelemetry)
- [ ] Backup strategy is in place
- [ ] Disaster recovery plan is documented

### Automated Production Deployment
```bash
# Run production deployment script
bash deploy-production.sh

# With options
bash deploy-production.sh --skip-validation  # Skip environment validation (not recommended)
bash deploy-production.sh --skip-build       # Skip Docker image rebuild
bash deploy-production.sh --force            # Skip confirmation prompts
```

### Manual Production Deployment
```bash
# 1. Validate environment
bash scripts/validate-env.sh --production

# 2. Build production Docker images
docker compose -f docker-compose.production.yml build

# 3. Start production services
docker compose -f docker-compose.production.yml up -d

# 4. Wait for health checks
sleep 60  # Wait for services to start
curl -f http://localhost:3000/api/health
```

### Production Configuration
The production configuration (`docker-compose.production.yml`) includes:

- **Resource limits**: CPU and memory constraints
- **Health checks**: Regular service health monitoring
- **Logging**: Structured JSON logs with rotation
- **Restart policy**: Automatic restart on failure
- **Network isolation**: Dedicated production network

### Scaling Considerations
```bash
# Scale frontend service (if using Docker Swarm)
docker service scale arch_portal=3

# Add resource constraints
services:
  portal:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
```

---

## Environment Setup

### Required Environment Variables

#### Development (.env.local)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Application Settings
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Local Infrastructure (defaults to Docker Compose)
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/arch_dev
```

#### Production (.env.production)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Production Infrastructure
REDIS_URL=redis://[redis-host]:6379?password=[password]
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]

# Application Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Monitoring (optional)
SENTRY_DSN=https://[key]@[project-id].ingest.sentry.io/[project-id]
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[project-id].ingest.sentry.io/[project-id]
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Environment Validation
```bash
# Validate development environment
bash scripts/validate-env.sh

# Validate production environment
bash scripts/validate-env.sh --production
```

### Secret Management
**Never commit secrets to version control!**
- Store secrets in environment variables
- Use `.env.local` for development (gitignored)
- Use Docker secrets or cloud provider secret management for production
- Rotate secrets regularly

---

## Service Architecture

### Docker Compose Services

#### Frontend (Next.js Portal)
- **Image**: Multi-stage Docker build from `apps/portal/Dockerfile`
- **Port**: 3000 (HTTP)
- **Health check**: `GET /api/health`
- **Dependencies**: Redis, PostgreSQL
- **Volumes** (development): Source code for hot reload

#### Redis
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Health check**: `redis-cli ping`
- **Data persistence**: Docker volume `redis_data`
- **Configuration**: In-memory cache with periodic saves

#### PostgreSQL
- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Health check**: `pg_isready -U postgres`
- **Data persistence**: Docker volume `postgres_data`
- **Database**: `arch_dev` (development)

### Networking
```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
├──────────────┬──────────────┬───────────────────────────┤
│  Frontend    │    Redis     │      PostgreSQL           │
│  (Next.js)   │  (caching)   │    (database)             │
│  10.0.0.2    │  10.0.0.3    │    10.0.0.4               │
└──────────────┴──────────────┴───────────────────────────┘
```

Services communicate via Docker's internal DNS:
- `portal` → `redis:6379`
- `portal` → `postgres:5432`

---

## Health Checks

### Service Health Endpoints
```bash
# Frontend health (checks Redis + PostgreSQL)
curl http://localhost:3000/api/health

# Redis health
docker compose exec redis redis-cli ping

# PostgreSQL health
docker compose exec postgres pg_isready -U postgres
```

### Health Check Response Format
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "latencyMs": 42,
  "checks": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy",
      "connected": true
    }
  }
}
```

### Status Codes
- **200**: Healthy (all checks pass)
- **503**: Unhealthy (one or more checks fail)
- **404**: Health endpoint not found (service not running)

### Monitoring Health Checks
```bash
# Continuous health monitoring
watch -n 30 'curl -s http://localhost:3000/api/health | jq .status'

# Health check with alerts
curl -f http://localhost:3000/api/health || echo "HEALTH CHECK FAILED" | mail -s "Service Alert" admin@example.com
```

---

## Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check Docker daemon
docker info

# Check Docker Compose syntax
docker compose config

# View detailed logs
docker compose logs --tail=50
```

#### 2. Database Connection Issues
```bash
# Test PostgreSQL connection
docker compose exec postgres psql -U postgres -d arch_dev -c "SELECT 1;"

# Check if database exists
docker compose exec postgres psql -U postgres -l

# Reset database (development only)
docker compose down -v
docker compose up -d
```

#### 3. Redis Connection Issues
```bash
# Test Redis connection
docker compose exec redis redis-cli ping

# Check Redis logs
docker compose logs redis --tail=20
```

#### 4. Frontend Won't Start
```bash
# Check build logs
docker compose logs portal --tail=50

# Rebuild frontend
docker compose build portal

# Check environment variables
docker compose exec portal printenv | grep SUPABASE
```

#### 5. Health Checks Failing
```bash
# Manual health check
curl -v http://localhost:3000/api/health

# Check individual components
curl http://localhost:3000/api/health/redis
curl http://localhost:3000/api/health/database
```

### Debug Commands
```bash
# List all containers
docker ps -a

# View container resource usage
docker stats

# Enter container shell
docker compose exec portal sh
docker compose exec postgres bash
docker compose exec redis redis-cli

# View container logs in real-time
docker compose logs -f --tail=20
```

---

## Monitoring & Maintenance

### Log Management
```bash
# View application logs
docker compose logs portal

# View structured logs (JSON format)
docker compose logs portal --tail=10 | jq .

# Log rotation (configured in production)
services:
  portal:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Backup Procedures

#### Database Backups
```bash
# Backup PostgreSQL database
docker compose exec postgres pg_dump -U postgres arch_dev > backup-$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec postgres pg_dump -U postgres arch_dev | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
```

#### Redis Backups
```bash
# Save Redis data
docker compose exec redis redis-cli SAVE

# Backup Redis RDB file
docker cp $(docker compose ps -q redis):/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Performance Monitoring
```bash
# Monitor container resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Monitor application metrics
curl http://localhost:3000/api/metrics

# Prometheus metrics (if configured)
curl http://localhost:3000/api/metrics/prometheus
```

### Update Procedures

#### Application Updates
```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild Docker images
docker compose -f docker-compose.production.yml build

# 3. Rolling restart
docker compose -f docker-compose.production.yml up -d --force-recreate
```

#### Infrastructure Updates
```bash
# Update Redis version
image: redis:8-alpine

# Update PostgreSQL version  
image: postgres:17-alpine

# Apply updates with zero downtime
docker compose -f docker-compose.production.yml up -d --force-recreate
```

### Security Considerations
1. **Regular updates**: Keep Docker images and dependencies updated
2. **Secret rotation**: Rotate Supabase keys and database passwords quarterly
3. **Access control**: Restrict Docker socket access
4. **Network security**: Use firewalls and VPNs for production access
5. **Audit logs**: Monitor Docker and application logs for suspicious activity

---

## Support & Resources

### Documentation
- [AGENTS.md](./AGENTS.md) - Agent development guidelines
- [.kiro/specs/frontend-deployment/](./.kiro/specs/frontend-deployment/) - Deployment specification
- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation
- [Docker Documentation](https://docs.docker.com/) - Container platform

### Monitoring Tools
- **Sentry**: Error monitoring and performance tracking
- **OpenTelemetry**: Distributed tracing and metrics
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboard visualization

### Emergency Contacts
- **Infrastructure Issues**: Docker logs, system monitoring
- **Database Issues**: PostgreSQL logs, connection pooling
- **Application Issues**: Sentry alerts, user reports
- **Security Issues**: Immediate container isolation, log analysis

---

## Quick Reference

### Common Commands
```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Rebuild and restart
docker compose up -d --build

# Check health
curl http://localhost:3000/api/health

# Validate environment
bash scripts/validate-env.sh
```

### Port Reference
- **3000**: Frontend application
- **5432**: PostgreSQL database
- **6379**: Redis cache
- **8080**: Monitoring dashboard (if configured)

### File Locations
- `docker-compose.yml` - Development configuration
- `docker-compose.production.yml` - Production configuration
- `scripts/dev.sh` - Development deployment script
- `deploy-production.sh` - Production deployment script
- `scripts/validate-env.sh` - Environment validation
- `apps/portal/Dockerfile` - Frontend Docker build
- `.env.example` - Example environment variables
- `.kiro/specs/frontend-deployment/` - Deployment specifications

---

*Last Updated: $(date)*
*Version: 1.0.0*