# Production Deployment Guide

## 🚀 Multi-Tenant ERP System - Production Setup

This guide covers deploying the BuildFlow ERP system to production with complete multi-tenant database isolation.

## 📋 Prerequisites

1. **Docker & Docker Compose** (v2.0+)
2. **Domain name** with DNS configured
3. **SSL Certificate** (Let's Encrypt recommended)
4. **Production server** with minimum 4GB RAM, 2 CPU cores
5. **Backup storage** (local or cloud)

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups

## 📦 Step 1: Environment Configuration

### 1.1 Create Production Environment File

```bash
cp .env.production.example .env.production
```

### 1.2 Update Critical Values

Edit `.env.production` and update:

```env
# Database - CHANGE THESE!
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_USER=postgres

# Redis - CHANGE THIS!
REDIS_PASSWORD=your_redis_password_here

# JWT Secret - Generate with: openssl rand -base64 32
VITE_JWT_SECRET=your_generated_secret_here

# Your production domains
VITE_API_URL=https://api.yourdomain.com/api
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🗄️ Step 2: Multi-Tenant Database Setup

### 2.1 Database Architecture

The system uses **isolated databases per agency**:

- **Main Database** (`buildflow_db`): Stores agency metadata
- **Agency Databases** (`agency_*`): One isolated database per agency

### 2.2 How It Works

1. **Agency Creation**: When a new agency is created:
   - A new database is created (e.g., `agency_company_12345678`)
   - Complete schema is initialized via `createAgencySchema()`
   - Agency metadata is stored in main database

2. **Database Routing**: 
   - Backend uses `X-Agency-Database` header to route requests
   - Each agency has its own connection pool
   - Complete data isolation between agencies

3. **Connection Pooling**:
   - Main database: Shared pool
   - Agency databases: Per-agency cached pools
   - Automatic pool creation and caching

### 2.3 Verify Database Isolation

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d buildflow_db

# List all databases (main + agencies)
\l

# Verify agency databases are isolated
SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';
```

## 🚀 Step 3: Deploy to Production

### 3.1 Build Production Images

```bash
docker compose -f docker-compose.prod.yml build
```

### 3.2 Start Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### 3.3 Verify Health

```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend health
curl http://localhost:8080/health

# Database connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

## 🔄 Step 4: Database Migrations

### 4.1 Initial Setup

Migrations in `database/migrations/` run automatically on first startup.

### 4.2 Manual Migration

```bash
# Run migrations on main database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d buildflow_db -f /docker-entrypoint-initdb.d/01_core_schema.sql

# For agency databases, migrations run automatically when created
```

## 💾 Step 5: Backup Configuration

### 5.1 Enable Automated Backups

```bash
# Start backup service
docker compose -f docker-compose.prod.yml --profile backup up -d db-backup
```

### 5.2 Manual Backup

```bash
# Backup main database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres buildflow_db > backup_main_$(date +%Y%m%d).sql

# Backup all agency databases
./scripts/backup-database.sh
```

### 5.3 Restore Backup

```bash
# Restore main database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres buildflow_db < backup_main_20250101.sql

# Restore agency database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres agency_company_12345678 < backup_agency.sql
```

## 🔒 Step 6: Security Hardening

### 6.1 Change Default Passwords

```bash
# Update in .env.production
POSTGRES_PASSWORD=strong_password_here
REDIS_PASSWORD=strong_redis_password_here
```

### 6.2 Generate JWT Secret

```bash
openssl rand -base64 32
```

### 6.3 Configure Firewall

```bash
# Allow only necessary ports
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH
ufw enable
```

### 6.4 SSL/TLS Setup

Use a reverse proxy (nginx/traefik) with Let's Encrypt:

```nginx
# nginx.conf example
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Step 7: Monitoring

### 7.1 Health Checks

All services include health checks:

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# View health status
docker inspect buildflow-backend-prod | grep Health -A 10
```

### 7.2 Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 backend
```

### 7.3 Resource Usage

```bash
docker stats
```

## 🔧 Step 8: Multi-Tenant Operations

### 8.1 Create New Agency

Via API:

```bash
POST /api/agencies
{
  "agencyName": "New Company",
  "domain": "newcompany",
  "adminName": "Admin User",
  "adminEmail": "admin@newcompany.com",
  "adminPassword": "secure_password",
  "subscriptionPlan": "professional"
}
```

This will:
1. Create agency record in main database
2. Create isolated database (`agency_newcompany_12345678`)
3. Initialize complete schema
4. Create admin user

### 8.2 List All Agencies

```bash
# Via API
GET /api/agencies

# Direct database query
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT id, name, database_name FROM agencies;"
```

### 8.3 Verify Agency Database Isolation

```bash
# Connect to agency database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d agency_newcompany_12345678

# Verify tables exist
\dt

# Check data isolation (should only show this agency's data)
SELECT * FROM users;
```

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from backend
docker compose -f docker-compose.prod.yml exec backend node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e))"
```

### Agency Database Not Created

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend | grep -i agency

# Verify permissions
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"
```

### Performance Issues

```bash
# Check database connections
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend instances
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Database Scaling

For high-traffic scenarios, consider:
- Read replicas for agency databases
- Connection pooling (PgBouncer)
- Database sharding by region

## ✅ Production Checklist

- [ ] All passwords changed
- [ ] JWT secret generated
- [ ] SSL certificates configured
- [ ] CORS origins set correctly
- [ ] Backups configured and tested
- [ ] Monitoring set up
- [ ] Health checks passing
- [ ] Multi-tenant isolation verified
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Firewall rules set
- [ ] Domain DNS configured

## 📚 Additional Resources

- [Docker Production Best Practices](https://docs.docker.com/engine/security/production/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Multi-Tenant Architecture Patterns](https://docs.aws.amazon.com/saas-accelerator/latest/guide/multi-tenant.html)

---

**Your multi-tenant ERP system is now production-ready! 🎉**
