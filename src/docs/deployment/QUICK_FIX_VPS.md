# Quick Fix for VPS Deployment

## The Problem
Your frontend at http://72.61.243.152/ is showing:
```
Missing required environment variables: VITE_DATABASE_URL
```

## The Solution

### Step 1: Connect to Your VPS

Open PowerShell or Terminal and run:
```bash
ssh root@72.61.243.152
# Password: EasyioRoot@123
```

### Step 2: Navigate to Project Directory

```bash
# Try these locations (one should work):
cd /opt/buildflow
# OR
cd ~/buildflow
# OR
cd /root/buildflow
# OR find it:
find / -name "docker-compose.yml" 2>/dev/null | head -1
```

### Step 3: Run the Fix Commands

Copy and paste these commands **one at a time**:

```bash
# 1. Check current status
docker compose ps

# 2. Set environment variables
export VITE_API_URL=http://72.61.243.152:3000/api
export VITE_DATABASE_URL=
export VITE_APP_ENVIRONMENT=production

# 3. Update .env file (if it exists)
if [ -f .env ]; then
    sed -i 's|^VITE_API_URL=.*|VITE_API_URL=http://72.61.243.152:3000/api|' .env
    sed -i 's|^VITE_DATABASE_URL=.*|VITE_DATABASE_URL=|' .env || echo 'VITE_DATABASE_URL=' >> .env
fi

# 4. Stop containers
docker compose down

# 5. Rebuild frontend (this is the key fix!)
docker compose build --no-cache frontend

# 6. Start everything
docker compose up -d

# 7. Wait for services to start
sleep 30

# 8. Check status
docker compose ps

# 9. Test frontend
curl http://localhost/ | head -c 200

# 10. Test backend
curl http://localhost:3000/health

# 11. Check for errors
docker compose logs frontend --tail 20 | grep -i "error\|missing" || echo "✅ No errors!"
```

### Step 4: Verify It Works

1. **Check containers:**
   ```bash
   docker compose ps
   ```
   All should show "Up" and "healthy"

2. **Check frontend logs:**
   ```bash
   docker compose logs frontend --tail 20
   ```
   Should NOT show "Missing required environment variables"

3. **Test in browser:**
   Open http://72.61.243.152/ - should work without errors!

## One-Line Quick Fix

If you want to do it all at once:

```bash
cd /opt/buildflow && \
export VITE_API_URL=http://72.61.243.152:3000/api && \
export VITE_DATABASE_URL= && \
docker compose down && \
docker compose build --no-cache frontend && \
docker compose up -d && \
sleep 30 && \
docker compose ps && \
echo "✅ Fix complete! Test: curl http://72.61.243.152/"
```

## What This Fixes

1. ✅ Sets `VITE_API_URL` to point to your backend
2. ✅ Sets `VITE_DATABASE_URL` to empty (frontend doesn't need it)
3. ✅ Rebuilds frontend with correct environment variables
4. ✅ Updates CORS to allow your domain
5. ✅ Restarts all services

## Why VITE_DATABASE_URL is Not Needed

The frontend is a **static React app** that:
- Runs in the browser
- Makes HTTP requests to the backend API
- Does **NOT** connect to PostgreSQL directly

The backend API (Express) handles all database connections.

## Architecture

```
Browser → Frontend (nginx:80) → Backend API (Express:3000) → PostgreSQL (5432)
```

## Troubleshooting

### Still seeing errors?

1. **Check frontend logs:**
   ```bash
   docker compose logs frontend --tail 50
   ```

2. **Check backend logs:**
   ```bash
   docker compose logs backend --tail 50
   ```

3. **Verify environment variables:**
   ```bash
   docker compose exec frontend env | grep VITE
   ```

4. **Check if containers are running:**
   ```bash
   docker ps
   ```

### Frontend still can't connect to backend?

1. **Check backend is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check CORS configuration:**
   ```bash
   docker compose logs backend | grep CORS
   ```

3. **Verify VITE_API_URL:**
   ```bash
   # Should be: http://72.61.243.152:3000/api
   grep VITE_API_URL .env
   ```

## Need More Help?

Check the logs:
```bash
docker compose logs -f
```

