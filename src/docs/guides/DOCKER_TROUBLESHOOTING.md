# 🐛 Docker Troubleshooting Guide

## Common Issues and Solutions

---

## ❌ Issue: "Docker Desktop is not running"

### Error Message:
```
unable to get image 'postgres:15-alpine': error during connect: 
Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/images/postgres:15-alpine/json": 
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

### What It Means:
Docker Desktop application is not running on your computer.

### Solution:

#### Step 1: Start Docker Desktop

**Option A: From Start Menu**
1. Press `Windows Key`
2. Type "Docker Desktop"
3. Click on "Docker Desktop" to launch it
4. Wait for Docker Desktop to start (you'll see a whale icon in system tray)

**Option B: From Command Line**
```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Or if installed in different location:
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

#### Step 2: Wait for Docker to Start

Docker Desktop takes 30-60 seconds to start. You'll know it's ready when:
- ✅ Whale icon appears in system tray (bottom right)
- ✅ Icon is steady (not animating)
- ✅ `docker info` command works

#### Step 3: Verify Docker is Running

```powershell
# Check Docker version (should work)
docker --version

# Check if Docker daemon is running (should NOT show error)
docker info

# If this works, Docker is ready!
docker ps
```

#### Step 4: Retry Your Command

```powershell
docker compose -f docker-compose.dev.yml up -d
```

### Prevention:
- Set Docker Desktop to start automatically with Windows
- Go to Docker Desktop → Settings → General → "Start Docker Desktop when you log in"

---

## ❌ Issue: "Port already in use"

### Error Message:
```
Error response from daemon: driver failed programming external connectivity 
on endpoint: Bind for 0.0.0.0:5432 failed: port is already allocated
```

### What It Means:
Another program is using port 5432 (or 3000, 5173, etc.)

### Solution:

#### Step 1: Find What's Using the Port

**Windows:**
```powershell
# Find process using port 5432
netstat -ano | findstr :5432

# Find process using port 3000
netstat -ano | findstr :3000

# Find process using port 5173
netstat -ano | findstr :5173
```

**Linux/Mac:**
```bash
lsof -i :5432
lsof -i :3000
lsof -i :5173
```

#### Step 2: Stop the Conflicting Service

**Option A: Stop Local PostgreSQL (if running)**
```powershell
# Windows - Stop PostgreSQL service
Stop-Service postgresql-x64-15

# Or from Services app:
# Win+R → services.msc → Find PostgreSQL → Stop
```

**Option B: Change Port in docker-compose.yml**
```yaml
# In docker-compose.dev.yml, change:
postgres:
  ports:
    - "5433:5432"  # Changed from 5432 to 5433
```

#### Step 3: Retry

```powershell
docker compose -f docker-compose.dev.yml up -d
```

---

## ❌ Issue: "Container keeps restarting"

### Error Message:
```
Container buildflow-backend-dev  Restarting (1) 2 seconds ago
```

### What It Means:
Container starts but crashes immediately, Docker keeps trying to restart it.

### Solution:

#### Step 1: Check Logs

```powershell
# See why it's crashing
docker compose -f docker-compose.dev.yml logs backend

# Look for error messages at the end
```

#### Step 2: Common Causes

**Missing Environment Variables:**
```powershell
# Check if .env file exists
Test-Path .env

# Check environment variables in container
docker compose -f docker-compose.dev.yml exec backend printenv
```

**Database Not Ready:**
```powershell
# Wait for database to be ready
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres

# If not ready, check postgres logs
docker compose -f docker-compose.dev.yml logs postgres
```

**Code Errors:**
```powershell
# Check application logs
docker compose -f docker-compose.dev.yml logs backend --tail 50
```

#### Step 3: Fix the Issue

Based on the error in logs:
- **Missing env var:** Add to .env or docker-compose.yml
- **Database error:** Wait for database to start, then restart backend
- **Code error:** Fix the code issue

---

## ❌ Issue: "Out of disk space"

### Error Message:
```
no space left on device
```

### What It Means:
Docker has used up all available disk space.

### Solution:

#### Step 1: Check Disk Usage

```powershell
# Check Docker disk usage
docker system df
```

#### Step 2: Clean Up

```powershell
# Remove unused containers, networks, images
docker system prune

# Remove everything unused (including volumes - ⚠️ deletes data!)
docker system prune -a --volumes

# Remove only old/unused images
docker image prune -a
```

#### Step 3: Increase Docker Disk Space

1. Open Docker Desktop
2. Go to Settings → Resources → Advanced
3. Increase "Disk image size"
4. Click "Apply & Restart"

---

## ❌ Issue: "Permission denied" or "Access denied"

### Error Message:
```
permission denied while trying to connect to the Docker daemon socket
```

### What It Means:
Your user doesn't have permission to use Docker.

### Solution:

**Windows:**
- Usually not an issue if Docker Desktop is running
- Make sure you're running PowerShell as Administrator if needed

**Linux:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in
```

---

## ❌ Issue: "Network not found"

### Error Message:
```
network buildflow-network-dev not found
```

### What It Means:
Docker network was deleted but containers still reference it.

### Solution:

```powershell
# Remove all containers
docker compose -f docker-compose.dev.yml down

# Remove networks manually (if needed)
docker network prune

# Start fresh
docker compose -f docker-compose.dev.yml up -d
```

---

## ❌ Issue: "Image pull failed"

### Error Message:
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": 
net/http: request canceled
```

### What It Means:
Can't download Docker images (network issue or Docker Hub down).

### Solution:

#### Step 1: Check Internet Connection

```powershell
# Test internet
ping google.com

# Test Docker Hub
ping registry-1.docker.io
```

#### Step 2: Retry with More Time

```powershell
# Pull images manually with more time
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull node:20-alpine
```

#### Step 3: Use Different Registry (if Docker Hub is down)

```yaml
# In docker-compose.yml, you can specify alternative registry
# But usually not needed
```

---

## ❌ Issue: "Changes not reflecting"

### Problem:
You edited code but changes don't show in browser.

### Solution:

#### Step 1: Check if Hot Reload is Working

**Frontend:**
- Changes in `src/` should auto-reload
- Check browser console for Vite HMR messages

**Backend:**
- Changes in `server/` should auto-restart
- Check logs: `docker compose logs backend`

#### Step 2: Manual Restart

```powershell
# Restart frontend
docker compose -f docker-compose.dev.yml restart frontend

# Restart backend
docker compose -f docker-compose.dev.yml restart backend
```

#### Step 3: Rebuild (if needed)

```powershell
# Rebuild and restart
docker compose -f docker-compose.dev.yml build frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

#### Step 4: Check Volumes

Make sure volumes are mounted correctly:
```powershell
docker compose -f docker-compose.dev.yml config
```

Look for volumes section - should show your source directories.

---

## ❌ Issue: "Database connection refused"

### Error Message:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### What It Means:
Backend can't connect to PostgreSQL.

### Solution:

#### Step 1: Check PostgreSQL is Running

```powershell
docker compose -f docker-compose.dev.yml ps postgres
```

Should show: `Up` and `healthy`

#### Step 2: Check Connection String

**From Backend Container:**
- Should use: `postgres:5432` (service name, not localhost)
- Check: `docker compose exec backend printenv | findstr DATABASE`

**From Host Machine:**
- Should use: `localhost:5432`

#### Step 3: Wait for Database to be Ready

```powershell
# Check if ready
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres

# If not ready, wait 30 seconds and check again
Start-Sleep -Seconds 30
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres
```

#### Step 4: Restart Backend

```powershell
docker compose -f docker-compose.dev.yml restart backend
```

---

## ❌ Issue: "Volume mount failed"

### Error Message:
```
Error response from daemon: invalid mount config
```

### What It Means:
Volume path doesn't exist or has wrong permissions.

### Solution:

#### Step 1: Check Paths Exist

```powershell
# Check if directories exist
Test-Path .\src
Test-Path .\server
Test-Path .\database\migrations
```

#### Step 2: Fix Permissions (Linux/Mac)

```bash
# Make sure Docker can read directories
sudo chown -R $USER:$USER .
chmod -R 755 .
```

#### Step 3: Use Absolute Paths (if relative paths fail)

```yaml
# In docker-compose.yml, change:
volumes:
  - ./src:/app/src

# To absolute path:
volumes:
  - /d/buildsite-flow/src:/app/src
```

---

## 🔍 Diagnostic Commands

### Check Everything is Working

```powershell
# 1. Check Docker is running
docker info

# 2. Check all containers
docker compose -f docker-compose.dev.yml ps

# 3. Check all logs
docker compose -f docker-compose.dev.yml logs --tail 20

# 4. Check resource usage
docker stats --no-stream

# 5. Check networks
docker network ls

# 6. Check volumes
docker volume ls
```

### Get Detailed Information

```powershell
# Container details
docker inspect buildflow-backend-dev

# Network details
docker network inspect buildsite-flow_buildflow-network-dev

# Volume details
docker volume inspect buildsite-flow_postgres_data_dev
```

---

## 🆘 Emergency: Everything is Broken

### Nuclear Reset (⚠️ Deletes Everything!)

```powershell
# 1. Stop everything
docker compose -f docker-compose.dev.yml down -v

# 2. Remove all Docker data
docker system prune -a --volumes

# 3. Restart Docker Desktop
# (Close and reopen Docker Desktop)

# 4. Start fresh
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

**⚠️ WARNING:** This deletes:
- All containers
- All images
- All volumes (database data!)
- All networks

Only use if nothing else works!

---

## 📞 Still Having Issues?

### Get Help:

1. **Check Logs First:**
   ```powershell
   docker compose -f docker-compose.dev.yml logs > docker-logs.txt
   ```

2. **Check Docker System Info:**
   ```powershell
   docker info > docker-info.txt
   docker version > docker-version.txt
   ```

3. **Common Solutions:**
   - Restart Docker Desktop
   - Restart your computer
   - Check Windows updates
   - Reinstall Docker Desktop (last resort)

---

**Remember:** Most issues are solved by:
1. ✅ Starting Docker Desktop
2. ✅ Restarting services
3. ✅ Checking logs
4. ✅ Rebuilding containers
