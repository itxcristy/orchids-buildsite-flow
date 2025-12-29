# 🔧 Fix Docker Build Issues on VPS

## Problem
Docker build is failing with:
```
"/package.json": not found
```

This happens because the build context doesn't have the required files.

## Solution

### Step 1: Check if files exist on VPS

SSH into your VPS and run:
```bash
cd /docker/buildsite-flow
ls -la
ls -la server/
ls -la server/package.json
```

### Step 2: If files are missing, pull from GitHub

```bash
cd /docker/buildsite-flow
git pull origin main
```

### Step 3: Verify build context

The docker-compose.yml expects:
- Backend: `./server/package.json` should exist
- Frontend: `./package.json` should exist (in root)

Check:
```bash
# Backend files
ls -la server/package.json
ls -la server/index.js

# Frontend files  
ls -la package.json
ls -la src/
ls -la vite.config.ts
```

### Step 4: Rebuild

```bash
cd /docker/buildsite-flow
docker compose build --no-cache
```

## Common Issues

### Issue 1: Files not pulled from Git
**Solution:** Run `git pull origin main` to get latest code

### Issue 2: Wrong directory
**Solution:** Make sure you're in `/docker/buildsite-flow` (or wherever your docker-compose.yml is)

### Issue 3: .dockerignore excluding files
**Solution:** Check if `.dockerignore` is excluding `package.json` (it shouldn't)

### Issue 4: Build context path wrong
**Solution:** Verify docker-compose.yml has:
```yaml
backend:
  build:
    context: ./server  # Should point to server directory
frontend:
  build:
    context: .  # Should point to root directory
```

## Quick Fix Commands

```bash
# 1. Go to project directory
cd /docker/buildsite-flow

# 2. Pull latest code
git pull origin main

# 3. Verify files exist
test -f server/package.json && echo "Backend package.json exists" || echo "MISSING!"
test -f package.json && echo "Frontend package.json exists" || echo "MISSING!"

# 4. Rebuild
docker compose build --no-cache

# 5. Start services
docker compose up -d
```

