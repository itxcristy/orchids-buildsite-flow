# 🏭 Production Deployment - Quick Reference

## Multi-Tenant Database Isolation

Your ERP system uses **complete database isolation** for each agency:

```
Main Database (buildflow_db)
├── agencies table (metadata)
├── users table (global users)
└── subscription_plans (shared)

Agency Database 1 (agency_company1_12345678)
├── Complete schema (53+ tables)
├── Isolated data
└── No cross-agency access

Agency Database 2 (agency_company2_87654321)
├── Complete schema (53+ tables)
├── Isolated data
└── No cross-agency access
```

## 🚀 Quick Start

### 1. Configure Environment

```bash
cp .env.production.example .env.production
# Edit .env.production - CHANGE ALL PASSWORDS!
```

### 2. Deploy

```bash
./scripts/production-deploy.sh
```

### 3. Verify

```bash
# Check services
docker compose -f docker-compose.prod.yml ps

# Verify multi-tenant isolation
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT name, database_name FROM agencies;"
```

## 📋 Production Checklist

- [ ] Changed `POSTGRES_PASSWORD` in `.env.production`
- [ ] Changed `REDIS_PASSWORD` in `.env.production`
- [ ] Generated strong `VITE_JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Updated `VITE_API_URL` with your domain
- [ ] Updated `CORS_ORIGINS` with your domains
- [ ] Configured email settings (SMTP)
- [ ] Set up SSL/TLS certificates
- [ ] Configured firewall rules
- [ ] Tested backups

## 🔐 Security

### Generate Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24

# Redis Password
openssl rand -base64 24
```

## 💾 Backups

### Automated Backups

```bash
# Enable backup service
docker compose -f docker-compose.prod.yml --profile backup up -d db-backup
```

### Manual Backup

```bash
# All databases (main + agencies)
./scripts/backup-database.sh

# Single database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres buildflow_db > backup.sql
```

## 🔍 Monitoring

### Health Checks

```bash
# All services
docker compose -f docker-compose.prod.yml ps

# Backend
curl http://localhost:3000/api/health

# Database
docker compose -f docker-compose.prod.yml exec postgres pg_isready
```

### Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

## 🗄️ Multi-Tenant Operations

### Create New Agency

Via API:
```bash
POST /api/agencies
{
  "agencyName": "New Company",
  "domain": "newcompany",
  "adminEmail": "admin@newcompany.com",
  "adminPassword": "secure_password",
  "subscriptionPlan": "professional"
}
```

This automatically:
1. Creates agency record in main DB
2. Creates isolated database (`agency_newcompany_12345678`)
3. Initializes complete schema (53+ tables)
4. Creates admin user

### Verify Isolation

```bash
# List all agency databases
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"

# Connect to agency database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d agency_newcompany_12345678

# Verify tables
\dt
```

## 📊 Scaling

### Scale Backend

```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Database Connections

Each agency database has its own connection pool (configurable via `AGENCY_DB_POOL_SIZE`).

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connections
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Agency Database Not Created

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend | grep -i agency

# Verify permissions
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database;"
```

## 📚 Documentation

- **Full Production Guide**: [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)
- **Docker Setup**: [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **Database Schema**: [docs/database.md](docs/database.md)

---

**Your multi-tenant ERP system is production-ready! 🎉**
