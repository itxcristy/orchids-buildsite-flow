# Production Deployment Fix Instructions

## Quick Fix for VPS Server (72.61.243.152)

### Option 1: Run the Fix Script (Recommended)

1. **Copy the fix script to your server:**
   ```bash
   # On your local machine, copy the script
   scp fix-production-deployment.sh root@72.61.243.152:/opt/buildflow/
   ```

2. **SSH into your server:**
   ```bash
   ssh root@72.61.243.152
   # Password: EasyioRoot@123
   ```

3. **Navigate to project directory:**
   ```bash
   cd /opt/buildflow
   # Or wherever your project is located
   ```

4. **Run the fix script:**
   ```bash
   chmod +x fix-production-deployment.sh
   ./fix-production-deployment.sh
   ```

### Option 2: Manual Fix Steps

If you prefer to fix manually:

1. **SSH into server:**
   ```bash
   ssh root@72.61.243.152
   # Password: EasyioRoot@123
   cd /opt/buildflow  # or your project directory
   ```

2. **Check current status:**
   ```bash
   docker compose ps
   docker compose logs frontend --tail 50
   ```

3. **Update environment variables:**
   ```bash
   # Edit .env file
   nano .env
   ```
   
   Set these values:
   ```env
   VITE_API_URL=http://72.61.243.152:3000/api
   VITE_DATABASE_URL=
   VITE_APP_ENVIRONMENT=production
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000
   ```

4. **Rebuild and restart:**
   ```bash
   docker compose down
   docker compose build --no-cache frontend
   docker compose up -d
   ```

5. **Wait for services to start:**
   ```bash
   sleep 30
   docker compose ps
   ```

6. **Test the deployment:**
   ```bash
   # Test frontend
   curl http://localhost/
   
   # Test backend
   curl http://localhost:3000/health
   
   # Test from outside (if firewall allows)
   curl http://72.61.243.152/
   ```

### Option 3: One-Line Fix (If script doesn't work)

```bash
cd /opt/buildflow && \
export VITE_API_URL=http://72.61.243.152:3000/api && \
export VITE_DATABASE_URL= && \
docker compose down && \
docker compose build --no-cache frontend && \
docker compose up -d && \
sleep 30 && \
docker compose ps
```

## Verify Fix

After running the fix, verify:

1. **Check containers are running:**
   ```bash
   docker compose ps
   ```
   All should show "Up" and "healthy"

2. **Check frontend logs:**
   ```bash
   docker compose logs frontend --tail 20
   ```
   Should NOT show "Missing required environment variables: VITE_DATABASE_URL"

3. **Test endpoints:**
   ```bash
   curl http://72.61.243.152/
   curl http://72.61.243.152:3000/health
   ```

4. **Check browser:**
   Open http://72.61.243.152/ in your browser
   - Should load without console errors
   - Should NOT show "Missing required environment variables"

## Common Issues

### Issue: "Missing required environment variables: VITE_DATABASE_URL"
**Solution:** The frontend was built without VITE_DATABASE_URL set. Rebuild with:
```bash
export VITE_DATABASE_URL=
docker compose build --no-cache frontend
docker compose up -d
```

### Issue: CORS errors in browser console
**Solution:** Backend CORS needs to allow your domain. Update CORS_ORIGINS in docker-compose.yml or .env and restart backend:
```bash
docker compose restart backend
```

### Issue: Frontend can't connect to backend
**Solution:** Check VITE_API_URL is correct:
```bash
# Should be: http://72.61.243.152:3000/api
grep VITE_API_URL .env
```

### Issue: Containers won't start
**Solution:** Check logs:
```bash
docker compose logs
docker compose ps -a  # Check stopped containers
```

## Architecture Reminder

```
Frontend (nginx:80) → Backend API (Express:3000) → PostgreSQL (5432)
```

- Frontend is a **static React app** served by nginx
- Frontend makes **HTTP requests** to backend API
- Frontend does **NOT** connect to database directly
- `VITE_DATABASE_URL` is **optional** and defaults to empty string

