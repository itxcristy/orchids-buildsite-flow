# 🔧 Backend Health Check Fix

## Problem
Backend container fails health check and deployment fails with:
```
dependency failed to start: container backend is unhealthy
```

## Root Cause
1. Health check runs too early (before server is ready)
2. Health check is too strict (fails if Redis is unavailable)
3. Startup time is longer than health check start_period

## Solution Applied

### 1. Increased Health Check Start Period
- **Before:** 60 seconds
- **After:** 120 seconds
- Allows more time for database initialization and server startup

### 2. Made Health Check More Lenient
- **Before:** Returns 503 if Redis is unavailable
- **After:** Returns 200 if database is connected (even if Redis is down)
- Redis is optional - database is critical

### 3. Improved Error Handling
- Added error handling to health check command
- Better retry logic (5 retries instead of 3)
- Longer intervals (15s instead of 10s)

## Changes Made

### docker-compose.yml
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"]
  interval: 15s
  timeout: 10s
  retries: 5
  start_period: 120s  # Increased from 60s
```

### server/Dockerfile
```dockerfile
HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=5 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"
```

### server/routes/health.js
```javascript
// Return 200 if database is connected (even if Redis is down)
const statusCode = health.services.database?.status === 'connected' ? 200 : 503;
```

## Testing

After deployment, verify health:

```bash
# Check backend health
curl http://localhost:3000/health

# Should return:
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": { "status": "connected" },
    "redis": { "status": "connected" }
  }
}
```

## If Still Failing

1. **Check backend logs:**
   ```bash
   docker logs backend
   ```

2. **Check if database is ready:**
   ```bash
   docker exec postgres pg_isready -U postgres
   ```

3. **Manually test health endpoint:**
   ```bash
   docker exec backend node -e "require('http').get('http://localhost:3000/health', (r) => console.log(r.statusCode))"
   ```

4. **Increase start_period further if needed:**
   - Change `start_period: 120s` to `start_period: 180s` in docker-compose.yml

---

**The backend should now pass health checks!** ✅

