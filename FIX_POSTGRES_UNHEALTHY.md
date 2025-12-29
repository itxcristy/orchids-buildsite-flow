# 🔧 Fix Postgres Unhealthy Container

## Problem
Postgres container is failing health check and won't start.

## Quick Fix Commands (Run on VPS)

### Step 1: Check Postgres Logs
```bash
cd /docker/buildsite-flow
docker logs postgres
```

### Step 2: Check Container Status
```bash
docker compose ps
docker ps -a | grep postgres
```

### Step 3: Try These Fixes

#### Option A: Remove and Recreate Volume (Fresh Start)
```bash
cd /docker/buildsite-flow
docker compose down
docker volume rm buildsite-flow_postgres_data
docker compose up -d postgres
# Wait 10 seconds
docker compose ps
```

#### Option B: Check Volume Permissions
```bash
docker compose down
docker volume inspect buildsite-flow_postgres_data
# If volume exists but has issues, remove it:
docker volume rm buildsite-flow_postgres_data
docker compose up -d
```

#### Option C: Increase Health Check Timeout
If postgres is slow to start, temporarily increase timeout:

Edit `docker-compose.yml` and change:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s  # Add this line
```

Then:
```bash
docker compose up -d postgres
```

#### Option D: Check Resource Limits
If server is low on resources:
```bash
# Check system resources
free -h
df -h

# Temporarily increase postgres memory in docker-compose.yml
# Change: memory: ${POSTGRES_MEMORY:-512M}
# To: memory: ${POSTGRES_MEMORY:-1G}
```

### Step 4: Manual Postgres Start (Debug)
```bash
# Start postgres without health check dependency
docker compose up -d postgres

# Wait 15 seconds, then check
docker logs postgres --tail 50

# If it's running, check health manually
docker exec postgres pg_isready -U postgres
```

### Step 5: If All Else Fails - Complete Reset
```bash
cd /docker/buildsite-flow
docker compose down -v  # Remove all volumes
docker compose up -d
```

## Common Issues

1. **Volume corruption**: Remove volume and recreate
2. **Slow startup**: Add `start_period: 30s` to healthcheck
3. **Resource constraints**: Increase memory limit
4. **Permissions**: Volume might have wrong permissions

## Verify Fix

After applying fix:
```bash
docker compose ps
# Should show postgres as "healthy"
```

Then start other services:
```bash
docker compose up -d
```

