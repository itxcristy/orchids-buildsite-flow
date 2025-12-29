# Quick Docker Build Fix

## 🚀 Quick Start (After Fixes)

```powershell
# Enable BuildKit for better performance
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# Build and start
docker compose -f docker-compose.dev.yml up --build
```

## 🔧 What Was Fixed

### 1. Network Timeout Issues
- ✅ Added automatic retry logic (5 attempts) for npm install
- ✅ Increased npm fetch timeouts (5 minutes)
- ✅ Added retry delays between attempts
- ✅ Better error messages

### 2. Build Performance
- ✅ Optimized layer caching (package.json copied first)
- ✅ Build cache mounts for npm
- ✅ Better .dockerignore files
- ✅ BuildKit enabled by default

### 3. Reliability
- ✅ Health checks for all services
- ✅ Proper dependency ordering
- ✅ Non-root user for security
- ✅ Better error handling

## 📋 If Build Still Fails

### Option 1: Use Helper Script
```powershell
.\scripts\docker-fix.ps1 -PullImages
```

### Option 2: Manual Steps
```powershell
# 1. Pull images first
docker pull node:20-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine

# 2. Build with BuildKit
$env:DOCKER_BUILDKIT=1
docker compose -f docker-compose.dev.yml build

# 3. Start services
docker compose -f docker-compose.dev.yml up
```

### Option 3: Check Network
```powershell
# Test Docker Hub connectivity
Test-NetConnection registry-1.docker.io -Port 443

# If fails, check:
# - Internet connection
# - Firewall settings
# - VPN/Proxy configuration
```

## 🎯 Expected Results

After successful build:
- ✅ All containers start without errors
- ✅ Backend available at http://localhost:3000
- ✅ Frontend available at http://localhost:5173
- ✅ Database available at localhost:5432
- ✅ Redis available at localhost:6379

## 📚 More Help

See `DOCKER_FIX_GUIDE.md` for detailed troubleshooting and configuration options.

