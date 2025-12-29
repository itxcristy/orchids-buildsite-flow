# 🔍 Docker Debugging Guide for VPS

When Docker containers fail on VPS but work in development, use this guide to diagnose the issue.

## Quick Debug Commands

### 1. Check Container Status

```bash
# See all containers and their status
docker compose -f docker-compose.prod.yml ps

# See all containers (including stopped)
docker ps -a

# Check which containers are running
docker ps
```

### 2. View Container Logs

```bash
# View logs for all services
docker compose -f docker-compose.prod.yml logs

# View logs for specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs redis

# Follow logs in real-time (most useful!)
docker compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100

# Logs since last 10 minutes
docker compose -f docker-compose.prod.yml logs --since 10m

# Logs with timestamps
docker compose -f docker-compose.prod.yml logs -t
```

### 3. Check Container Health

```bash
# Check if container is healthy
docker inspect <container-name> | grep -A 10 Health

# Check container exit code
docker inspect <container-name> | grep ExitCode

# See why container stopped
docker inspect <container-name> | grep -A 5 State
```

### 4. Inspect Container Details

```bash
# Full container details
docker inspect <container-name>

# Check environment variables
docker inspect <container-name> | grep -A 50 Env

# Check mounted volumes
docker inspect <container-name> | grep -A 20 Mounts

# Check network configuration
docker inspect <container-name> | grep -A 20 NetworkSettings
```

## Step-by-Step Debugging Process

### Step 1: Check What's Failing

```bash
# SSH to VPS
ssh root@72.61.243.152

# Navigate to project
cd /root/buildsite-flow

# Check container status
docker compose -f docker-compose.prod.yml ps
```

**Look for:**
- Containers with status "Exited" or "Restarting"
- Exit codes (0 = success, non-zero = failure)
- Health status

### Step 2: Read the Logs

```bash
# View logs for failed container
docker compose -f docker-compose.prod.yml logs <service-name>

# Example: If backend is failing
docker compose -f docker-compose.prod.yml logs backend
```

**Common issues to look for:**
- Database connection errors
- Port conflicts
- Missing environment variables
- Permission errors
- File not found errors

### Step 3: Check Environment Variables

```bash
# Check if .env file exists
ls -la .env

# Check environment variables in container
docker exec <container-name> env

# Compare with docker-compose.prod.yml
cat docker-compose.prod.yml | grep -A 5 environment
```

### Step 4: Check Resource Usage

```bash
# Check disk space
df -h

# Check Docker disk usage
docker system df

# Check container resource usage
docker stats --no-stream

# Check if containers are out of memory
docker stats
```

### Step 5: Test Individual Services

```bash
# Test database connection
docker exec drena-postgres psql -U postgres -d buildflow_db -c "SELECT version();"

# Test backend health
curl http://localhost:3000/health

# Test frontend
curl http://localhost/

# Check if ports are accessible
netstat -tulpn | grep -E '3000|5432|6379|80'
```

## Common Issues & Solutions

### Issue 1: Container Exits Immediately

**Symptoms:**
- Container shows "Exited" status
- Exit code is non-zero

**Debug:**
```bash
# Check exit code
docker inspect <container-name> | grep ExitCode

# View last logs
docker logs <container-name>

# Try running container manually
docker run -it <image-name> /bin/sh
```

**Common causes:**
- Missing environment variables
- Database connection failed
- Port already in use
- Missing files/volumes

### Issue 2: Container Keeps Restarting

**Symptoms:**
- Status shows "Restarting"
- Container restarts every few seconds

**Debug:**
```bash
# Check restart policy
docker inspect <container-name> | grep RestartPolicy

# View logs during restart
docker logs -f <container-name>

# Check resource limits
docker stats <container-name>
```

**Common causes:**
- Application crashes on startup
- Out of memory
- Health check failing
- Database not ready

### Issue 3: Database Connection Errors

**Symptoms:**
- Logs show "connection refused" or "ECONNREFUSED"
- "relation does not exist" errors

**Debug:**
```bash
# Check if database is running
docker ps | grep postgres

# Check database logs
docker logs drena-postgres

# Test connection
docker exec drena-postgres psql -U postgres -d buildflow_db -c "\dt"

# Check database is ready
docker exec drena-postgres pg_isready -U postgres
```

**Solutions:**
- Wait for database to be ready (add depends_on in docker-compose)
- Check POSTGRES_PASSWORD in .env
- Verify database name matches

### Issue 4: Port Conflicts

**Symptoms:**
- "port is already allocated" error
- Container can't bind to port

**Debug:**
```bash
# Check what's using the port
netstat -tulpn | grep 3000
lsof -i :3000

# Check Docker port mappings
docker ps | grep 3000
```

**Solutions:**
- Stop conflicting containers
- Change port in docker-compose.prod.yml
- Kill process using the port

### Issue 5: Missing Files/Volumes

**Symptoms:**
- "file not found" errors
- "no such file or directory"

**Debug:**
```bash
# Check volume mounts
docker inspect <container-name> | grep -A 20 Mounts

# Check if files exist on host
ls -la /path/to/file

# Check volume permissions
ls -la /var/lib/docker/volumes/
```

**Solutions:**
- Verify volume paths in docker-compose.prod.yml
- Check file permissions
- Ensure files exist before mounting

## Complete Debug Script

Save this script to help debug:

```bash
#!/bin/bash
# save as: debug-docker.sh

echo "=========================================="
echo "🔍 Docker Debug Report"
echo "=========================================="
echo ""

echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "💾 Disk Space:"
df -h | grep -E 'Filesystem|/dev/'
echo ""

echo "🐳 Docker Disk Usage:"
docker system df
echo ""

echo "📝 Recent Logs (last 50 lines):"
docker compose -f docker-compose.prod.yml logs --tail 50
echo ""

echo "🏥 Health Checks:"
echo -n "Backend: "
curl -s http://localhost:3000/health || echo "FAILED"
echo -n "Frontend: "
curl -s http://localhost/health || echo "FAILED"
echo -n "Database: "
docker exec drena-postgres pg_isready -U postgres 2>/dev/null && echo "OK" || echo "FAILED"
echo ""

echo "🔌 Port Status:"
netstat -tulpn | grep -E '3000|5432|6379|80' || echo "No ports found"
echo ""

echo "📦 Container Resource Usage:"
docker stats --no-stream
```

## Comparison: Dev vs Prod

### Check Differences

```bash
# Compare docker-compose files
diff docker-compose.yml docker-compose.prod.yml

# Check environment variables
diff .env .env.production

# Compare running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Common Dev vs Prod Differences

1. **Environment Variables**
   - Dev: `VITE_API_URL=http://localhost:3000/api`
   - Prod: `VITE_API_URL=http://your-domain.com:3000/api`

2. **Port Mappings**
   - Dev: Exposed ports
   - Prod: May use reverse proxy

3. **Volumes**
   - Dev: Local development files
   - Prod: Production build files

4. **Resource Limits**
   - Dev: No limits
   - Prod: CPU/memory limits

## Quick Fixes

### Restart Everything

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

### Rebuild and Restart

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Clean and Restart

```bash
docker compose -f docker-compose.prod.yml down
docker system prune -f
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Getting Help

When asking for help, provide:

1. **Container status:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. **Error logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

3. **Environment:**
   ```bash
   docker --version
   docker compose version
   uname -a
   ```

4. **What works in dev:**
   - Which docker-compose file
   - Environment variables used
   - Any custom configurations

---

**Use these commands to find out exactly what's failing!** 🔍

