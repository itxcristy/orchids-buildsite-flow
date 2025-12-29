# 🚀 Docker Commands Cheat Sheet - BuildFlow ERP

**Quick reference for daily Docker operations**

---

## 📋 Most Used Commands (Copy & Paste Ready)

### Starting & Stopping

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# Stop development environment (keeps data)
docker compose -f docker-compose.dev.yml down

# Stop and delete all data (⚠️ WARNING: deletes database!)
docker compose -f docker-compose.dev.yml down -v

# Start production environment
docker compose -f docker-compose.prod.yml up -d

# Stop production environment
docker compose -f docker-compose.prod.yml down
```

---

### Viewing Logs

```bash
# All services (follow mode - updates automatically)
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f postgres

# Last 50 lines (no follow)
docker compose -f docker-compose.dev.yml logs --tail 50 backend

# Last 10 minutes
docker compose -f docker-compose.dev.yml logs --since 10m
```

---

### Checking Status

```bash
# Check if services are running
docker compose -f docker-compose.dev.yml ps

# Check resource usage (CPU, memory)
docker stats

# Check specific container
docker stats buildflow-backend-dev
```

---

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.dev.yml restart

# Restart specific service
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart frontend
docker compose -f docker-compose.dev.yml restart postgres
```

---

### Rebuilding After Changes

```bash
# Rebuild all services
docker compose -f docker-compose.dev.yml build

# Rebuild specific service
docker compose -f docker-compose.dev.yml build backend

# Rebuild without cache (clean build)
docker compose -f docker-compose.dev.yml build --no-cache

# Rebuild and restart
docker compose -f docker-compose.dev.yml up -d --build
```

---

### Database Commands

```bash
# Connect to main database
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db

# Connect to agency database
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d agency_company_12345678

# List all databases
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "\l"

# List all agencies
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT name, database_name FROM agencies;"

# Backup main database
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > backup_$(date +%Y%m%d).sql

# Restore main database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres buildflow_db < backup.sql

# Check if PostgreSQL is ready
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres
```

---

### Multi-Tenant Database Commands

```bash
# List all agency databases
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"

# Backup all agency databases (use script)
./scripts/backup-database.sh

# Check database size
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) as size FROM pg_database WHERE datname LIKE 'agency_%';"
```

---

### Troubleshooting

```bash
# Check what's using a port (Windows)
netstat -ano | findstr :5432
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Check what's using a port (Linux/Mac)
lsof -i :5432
lsof -i :3000
lsof -i :5173

# View all containers (including stopped)
docker compose -f docker-compose.dev.yml ps -a

# Execute command in container
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml exec postgres sh

# Inspect container details
docker inspect buildflow-backend-dev
```

---

### Cleanup Commands

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (⚠️ deletes data!)
docker volume prune

# Remove everything unused
docker system prune

# Nuclear option - remove everything (⚠️ very dangerous!)
docker system prune -a --volumes
```

---

### Production Deployment

```bash
# 1. Configure environment
cp .env.production.example .env.production
# Edit .env.production

# 2. Build production images
docker compose -f docker-compose.prod.yml build

# 3. Start production services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/health

# 5. Update production (after code changes)
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

### Quick Health Checks

```bash
# Check all services
docker compose -f docker-compose.dev.yml ps

# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost:5173

# Check database
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres

# Check Redis
docker compose -f docker-compose.dev.yml exec redis redis-cli ping
```

---

## 🎯 Common Scenarios

### Scenario: "I just cloned the project"

```bash
cd buildsite-flow
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
# Open http://localhost:5173
```

### Scenario: "My changes aren't showing"

```bash
# Frontend changes - usually auto-reloads, but if not:
docker compose -f docker-compose.dev.yml restart frontend

# Backend changes - usually auto-reloads, but if not:
docker compose -f docker-compose.dev.yml restart backend

# If still not working, rebuild:
docker compose -f docker-compose.dev.yml build frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

### Scenario: "Database connection error"

```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.dev.yml ps postgres

# Check PostgreSQL logs
docker compose -f docker-compose.dev.yml logs postgres

# Check if database is ready
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres

# Restart PostgreSQL
docker compose -f docker-compose.dev.yml restart postgres
```

### Scenario: "Port already in use"

```bash
# Find what's using the port
netstat -ano | findstr :5432  # Windows
lsof -i :5432                  # Linux/Mac

# Stop the conflicting service or change port in docker-compose.yml
```

### Scenario: "I need to start completely fresh"

```bash
# ⚠️ WARNING: This deletes all data!
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

---

## 📊 Service URLs

| Service | Development | Production |
|---------|------------|------------|
| Frontend | http://localhost:5173 | http://localhost:8080 |
| Backend API | http://localhost:3000/api | http://localhost:3000/api |
| Database | localhost:5432 | localhost:5432 |
| Redis | localhost:6379 | localhost:6379 |

---

## 🔑 Default Credentials

| Service | User | Password | Database |
|---------|------|----------|----------|
| PostgreSQL | postgres | admin | buildflow_db |
| Redis | - | (none) | - |

**⚠️ Change these in production!**

---

## 📚 Full Documentation

- **Complete Guide:** [docs/DOCKER_MASTER_GUIDE.md](docs/DOCKER_MASTER_GUIDE.md)
- **Quick Start:** [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)
- **Production:** [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)

---

**Print this page and keep it handy! 📄**
