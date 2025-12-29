# Fix Container Conflict and CORS Issues

## Problem
Old containers are still running, preventing new containers from starting. The backend container might not be running, which is why CORS isn't working.

## Solution: Clean Restart

Run these commands on your Hostinger server:

```bash
# 1. Stop and remove ALL existing containers
docker compose down

# 2. Remove any orphaned containers manually (if needed)
docker ps -a | grep buildflow
docker rm -f buildflow-redis postgres backend frontend 2>/dev/null || true

# 3. Check what containers are still running
docker ps -a

# 4. Start everything fresh
docker compose up -d

# 5. Check if backend is running
docker compose ps

# 6. Check backend logs for CORS messages
docker compose logs backend | grep -i cors

# 7. Check if backend is actually running and responding
curl http://localhost:3000/api/health
```

## If Backend Still Not Running

```bash
# Check backend logs for errors
docker compose logs backend

# Try starting backend manually
docker compose up -d backend

# Check backend container status
docker compose ps backend
```

## Verify CORS Configuration

```bash
# Check if CORS_ORIGINS environment variable is set
docker compose exec backend printenv CORS_ORIGINS

# Check backend logs on startup (should show CORS config)
docker compose logs backend | head -50

# You should see:
# [CORS] Raw CORS_ORIGINS from env: ...
# [CORS] Parsed allowed origins: ...
```

## Test CORS from Browser

After fixing, test by opening browser console on http://www.dezignbuild.site and check:
- No CORS errors in console
- Network requests should have Access-Control-Allow-Origin header

