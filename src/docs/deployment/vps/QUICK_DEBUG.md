# ⚡ Quick Debug Guide - Docker Failures on VPS

## 🚨 Container Failing? Follow These Steps:

### Step 1: Check What's Failing (30 seconds)

```bash
# SSH to VPS
ssh root@72.61.243.152

# Navigate to project
cd /root/buildsite-flow

# See container status
docker compose -f docker-compose.prod.yml ps
```

**Look for:**
- ❌ Status: "Exited" = Container stopped
- 🔄 Status: "Restarting" = Container keeps crashing
- ✅ Status: "Up" = Container is running

### Step 2: Read the Error Logs (1 minute)

```bash
# See logs for ALL services
docker compose -f docker-compose.prod.yml logs

# See logs for specific failing service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs postgres

# Follow logs in real-time (most useful!)
docker compose -f docker-compose.prod.yml logs -f
```

**What to look for:**
- 🔴 Red error messages
- "connection refused" = Can't connect to database
- "port already in use" = Port conflict
- "file not found" = Missing file
- "permission denied" = Permission issue

### Step 3: Check Exit Code

```bash
# If container is "Exited", check why
docker inspect <container-name> | grep ExitCode

# Exit code 0 = Success
# Exit code 1+ = Error (check logs!)
```

### Step 4: Common Issues & Quick Fixes

#### Issue: Database Connection Failed

**Error:** `connection refused` or `ECONNREFUSED`

**Fix:**
```bash
# Check if database is running
docker ps | grep postgres

# If not running, start it
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
sleep 5

# Check database logs
docker logs drena-postgres
```

#### Issue: Port Already in Use

**Error:** `port is already allocated`

**Fix:**
```bash
# Find what's using the port
netstat -tulpn | grep 3000

# Kill the process or change port in docker-compose.prod.yml
```

#### Issue: Missing Environment Variables

**Error:** `undefined` or `required variable not set`

**Fix:**
```bash
# Check .env file exists
ls -la .env

# Check environment in container
docker exec <container-name> env | grep -i api

# Verify .env has all required variables
cat .env
```

#### Issue: Out of Memory

**Error:** Container keeps restarting

**Fix:**
```bash
# Check memory usage
docker stats

# Check disk space
df -h

# Clean up Docker
docker system prune -f
```

## 🔧 Quick Fix Script

Run this to see everything at once:

```bash
# On VPS
cd /root/buildsite-flow
chmod +x scripts/debug-docker.sh
./scripts/debug-docker.sh
```

## 📋 What to Share When Asking for Help

1. **Container status:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. **Error logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

3. **Exit code (if container exited):**
   ```bash
   docker inspect <container-name> | grep ExitCode
   ```

## 🆘 Emergency Restart

If nothing works, try this:

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Clean up
docker system prune -f

# Rebuild
docker compose -f docker-compose.prod.yml build --no-cache

# Start
docker compose -f docker-compose.prod.yml up -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f
```

---

**Most issues are visible in the logs! Always check logs first.** 📝

