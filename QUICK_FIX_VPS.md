# 🚨 Quick Fix: Docker Build Issues on VPS

## Problem
```
"/package.json": not found
```

## Root Cause
The files might not be in the right place, or `.dockerignore` is excluding them.

## Quick Fix (Run on VPS)

### Option 1: Pull Latest Code
```bash
cd /docker/buildsite-flow
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### Option 2: Check Files Exist
```bash
cd /docker/buildsite-flow

# Check backend files
ls -la server/package.json
ls -la server/index.js

# Check frontend files
ls -la package.json
ls -la vite.config.ts
ls -la src/

# If files are missing, pull from git
git pull origin main
```

### Option 3: Check .dockerignore
```bash
cd /docker/buildsite-flow

# Check if package.json is excluded
grep package.json .dockerignore
grep package.json server/.dockerignore

# If found, remove it (package.json should NOT be in .dockerignore)
```

### Option 4: Manual Fix
```bash
cd /docker/buildsite-flow

# 1. Stop containers
docker compose down

# 2. Pull latest code
git pull origin main

# 3. Verify files
test -f server/package.json || echo "ERROR: server/package.json missing!"
test -f package.json || echo "ERROR: package.json missing!"

# 4. Rebuild
docker compose build --no-cache

# 5. Start
docker compose up -d
```

## Most Likely Solution

The files probably aren't on the VPS. Run:
```bash
cd /docker/buildsite-flow
git pull origin main
docker compose build --no-cache
docker compose up -d
```

