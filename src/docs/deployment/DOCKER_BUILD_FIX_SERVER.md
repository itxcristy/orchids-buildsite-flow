# Docker Build Fix for Server

## Common Issues When Build Works Locally But Fails on Server

### Issue 1: BuildKit Not Enabled

**Problem:** The Dockerfiles use `--mount=type=cache` which requires BuildKit.

**Fix on Server:**
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Or add to ~/.bashrc for permanent
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
echo 'export COMPOSE_DOCKER_CLI_BUILD=1' >> ~/.bashrc
source ~/.bashrc
```

**Or build with:**
```bash
DOCKER_BUILDKIT=1 docker compose build
```

---

### Issue 2: Missing Files in Build Context

**Problem:** Files referenced in Dockerfile don't exist on server.

**Check on Server:**
```bash
# Check if all required files exist
cd /path/to/project

# Frontend files
ls -la package.json package-lock.json
ls -la vite.config.ts tailwind.config.ts postcss.config.js
ls -la tsconfig.json index.html
ls -la src/ public/
ls -la nginx.conf

# Backend files
cd server
ls -la package.json package-lock.json
ls -la index.js
ls -la routes/ services/ middleware/ config/ utils/ graphql/
```

**Fix:** Make sure all files are uploaded to server.

---

### Issue 3: Missing Build Arguments

**Problem:** Frontend build needs `VITE_API_URL` but it's not set.

**Fix:**
```bash
# Build with explicit args
docker compose build \
  --build-arg VITE_API_URL=http://72.61.243.152:3000/api \
  --build-arg VITE_APP_NAME="BuildFlow Agency Management" \
  frontend
```

**Or set in .env file on server:**
```bash
VITE_API_URL=http://72.61.243.152:3000/api
VITE_APP_NAME=BuildFlow Agency Management
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

---

### Issue 4: Network Issues During npm install

**Problem:** Server can't reach npm registry.

**Fix:**
```bash
# Test npm connectivity
npm config get registry

# Use different registry if needed
npm config set registry https://registry.npmjs.org/

# Or use proxy if behind firewall
npm config set proxy http://proxy:port
npm config set https-proxy http://proxy:port
```

---

### Issue 5: Architecture Mismatch

**Problem:** Server is different architecture (ARM vs x86).

**Fix:**
```bash
# Check server architecture
uname -m

# Build for specific platform
docker compose build --platform linux/amd64
```

---

### Issue 6: Insufficient Resources

**Problem:** Server doesn't have enough memory/disk.

**Check:**
```bash
# Check available memory
free -h

# Check disk space
df -h

# Check Docker resources
docker system df
```

**Fix:**
```bash
# Clean up Docker
docker system prune -a

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

### Issue 7: Missing .dockerignore

**Problem:** Large build context causes timeouts.

**Fix:** Ensure `.dockerignore` files exist and are properly configured.

---

## Quick Fix Script for Server

Run this on your server:

```bash
#!/bin/bash
# Docker Build Fix Script

set -e

echo "=========================================="
echo "Docker Build Fix Script"
echo "=========================================="

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Navigate to project
PROJECT_DIR="/docker/buildflow"  # Change this to your project path
cd "$PROJECT_DIR" || exit 1

# Check required files
echo "Checking required files..."
MISSING_FILES=0

# Frontend files
[ ! -f "package.json" ] && echo "❌ Missing: package.json" && MISSING_FILES=1
[ ! -f "vite.config.ts" ] && echo "❌ Missing: vite.config.ts" && MISSING_FILES=1
[ ! -f "nginx.conf" ] && echo "❌ Missing: nginx.conf" && MISSING_FILES=1
[ ! -d "src" ] && echo "❌ Missing: src/" && MISSING_FILES=1

# Backend files
[ ! -f "server/package.json" ] && echo "❌ Missing: server/package.json" && MISSING_FILES=1
[ ! -f "server/index.js" ] && echo "❌ Missing: server/index.js" && MISSING_FILES=1

if [ $MISSING_FILES -eq 1 ]; then
    echo "❌ Missing required files. Please upload them first."
    exit 1
fi

echo "✅ All required files present"

# Clean up
echo "Cleaning up Docker..."
docker system prune -f

# Set build args
export VITE_API_URL="${VITE_API_URL:-http://72.61.243.152:3000/api}"
export VITE_APP_NAME="${VITE_APP_NAME:-BuildFlow Agency Management}"

# Build with BuildKit
echo "Building with BuildKit enabled..."
DOCKER_BUILDKIT=1 docker compose build --no-cache

echo "✅ Build complete!"
```

---

## Step-by-Step Fix

### Step 1: Enable BuildKit
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Step 2: Verify Files
```bash
cd /docker/buildflow  # or your project path
ls -la package.json vite.config.ts nginx.conf
ls -la server/package.json server/index.js
```

### Step 3: Set Environment Variables
```bash
export VITE_API_URL=http://72.61.243.152:3000/api
export VITE_APP_NAME="BuildFlow Agency Management"
```

### Step 4: Clean and Rebuild
```bash
docker compose down
docker system prune -f
DOCKER_BUILDKIT=1 docker compose build --no-cache
```

### Step 5: Start Services
```bash
docker compose up -d
```

---

## Debugging Build Failures

### Get Detailed Error Messages
```bash
# Build with verbose output
DOCKER_BUILDKIT=1 docker compose build --progress=plain --no-cache 2>&1 | tee build.log

# Check build logs
cat build.log | grep -i error
```

### Check Specific Service
```bash
# Build only frontend
DOCKER_BUILDKIT=1 docker compose build --no-cache frontend

# Build only backend
DOCKER_BUILDKIT=1 docker compose build --no-cache backend
```

### Test Build Manually
```bash
# Frontend
cd /docker/buildflow
DOCKER_BUILDKIT=1 docker build \
  --build-arg VITE_API_URL=http://72.61.243.152:3000/api \
  -t dezign-frontend:latest \
  -f Dockerfile .

# Backend
cd /docker/buildflow/server
DOCKER_BUILDKIT=1 docker build \
  -t dezign-backend:latest \
  -f Dockerfile .
```

---

## Common Error Messages and Fixes

### Error: "failed to solve: process did not complete successfully"
**Fix:** Enable BuildKit or check if files exist

### Error: "COPY failed: file not found"
**Fix:** Check file paths in Dockerfile match actual files

### Error: "npm ERR! network"
**Fix:** Check network connectivity, use different npm registry

### Error: "no space left on device"
**Fix:** Clean up Docker: `docker system prune -a`

### Error: "executor failed running"
**Fix:** Check Dockerfile syntax, enable BuildKit

---

## Alternative: Simplified Dockerfiles (If BuildKit Fails)

If BuildKit continues to fail, I can create simplified Dockerfiles without cache mounts. Let me know!

---

## Next Steps

1. **SSH into server**
2. **Run the quick fix script above**
3. **Check build logs for specific errors**
4. **Share error messages if still failing**

