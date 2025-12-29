# System Dashboard & System Health Page Fix - Production Deployment Issue

## Problem Summary

The System Dashboard and System Health pages work in local Docker but fail in production with:
- CORS errors
- "Failed to fetch" errors
- Network errors

## Root Causes Identified

1. **Missing CORS Mode**: Fetch requests didn't explicitly enable CORS mode
2. **Missing CORS Headers**: Backend routes didn't set explicit CORS headers
3. **Poor Error Handling**: CORS and network errors weren't properly detected and logged
4. **No OPTIONS Handlers**: Missing preflight request handlers for CORS

## Fixes Applied

### 1. Frontend: SystemHealth.tsx

**Changes:**
- Added explicit `mode: 'cors'` to fetch request
- Added `credentials: 'omit'` and `cache: 'no-cache'`
- Improved CORS error detection
- Better error logging with API URL and current page context
- More specific error messages for different failure scenarios

**Key Improvements:**
```typescript
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Agency-Database': localStorage.getItem('agency_database') || '',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  mode: 'cors', // Explicitly enable CORS
  credentials: 'omit',
  cache: 'no-cache',
});
```

### 2. Frontend: system-dashboard.ts

**Changes:**
- Added explicit `mode: 'cors'` to fetch request
- Added `credentials: 'omit'` and `cache: 'no-cache'`
- Improved error handling with better error message extraction
- Added development logging for API URLs

**Key Improvements:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    ...getAuthHeaders(),
    'Accept': 'application/json',
  },
  mode: 'cors', // Explicitly enable CORS
  credentials: 'omit',
  cache: 'no-cache',
});
```

### 3. Frontend: RealTimeUsageWidget.tsx

**Changes:**
- Added explicit `mode: 'cors'` to fetch request
- Added `credentials: 'omit'` and `cache: 'no-cache'`
- Improved CORS error detection
- Better error logging
- More specific error messages

**Key Improvements:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    ...authHeaders(),
    'Accept': 'application/json',
  },
  mode: 'cors', // Explicitly enable CORS
  credentials: 'omit',
  cache: 'no-cache',
});
```

### 4. Backend: system-health Route

**Changes:**
- Added OPTIONS handler for preflight requests
- Added explicit CORS headers to GET handler
- CORS headers set even on error responses

**Key Improvements:**
```javascript
// OPTIONS handler for preflight
router.options('/', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

// GET handler with CORS headers
router.get('/', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    // ... other CORS headers
  }
  // ... rest of handler
}));
```

### 5. Backend: system/metrics Route

**Changes:**
- Added OPTIONS handler for preflight requests
- Added explicit CORS headers to GET handler
- CORS headers set even on error responses (connection errors and general errors)

**Key Improvements:**
```javascript
// OPTIONS handler
router.options('/metrics', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

// GET handler with CORS headers in all code paths
```

### 6. Backend: system/usage/realtime Route

**Changes:**
- Added OPTIONS handler for preflight requests
- Added explicit CORS headers to GET handler
- CORS headers set even on error responses

**Key Improvements:**
```javascript
// OPTIONS handler
router.options('/usage/realtime', (req, res) => {
  // ... CORS headers
});

// GET handler with CORS headers
router.get('/usage/realtime', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    // ... other CORS headers
  }
  // ... rest of handler
}));
```

## Files Modified

### Frontend:
1. `src/pages/SystemHealth.tsx` - Enhanced error handling and CORS support
2. `src/services/system-dashboard.ts` - Added CORS mode and improved error handling
3. `src/components/system/RealTimeUsageWidget.tsx` - Added CORS mode and improved error handling

### Backend:
1. `server/routes/systemHealth.js` - Added OPTIONS handler and explicit CORS headers
2. `server/routes/system.js` - Added OPTIONS handlers and explicit CORS headers for:
   - `/metrics` endpoint
   - `/usage/realtime` endpoint

## Deployment Checklist

### 1. Rebuild Frontend Container

**Important:** Frontend changes require rebuilding the container:

```bash
# Stop containers
docker compose down

# Rebuild frontend with updated code
docker compose build --no-cache frontend

# Start all containers
docker compose up -d
```

### 2. Restart Backend Container

Backend changes require restarting the backend container:

```bash
# Restart backend to apply route changes
docker compose restart backend

# Or rebuild if needed
docker compose build backend
docker compose up -d backend
```

### 3. Verify Environment Variables

Ensure your production `.env` file has:

```bash
# API URL - Must include /api suffix
VITE_API_URL=http://dezignbuild.site:3000/api

# CORS Origins - Must include your domain
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

### 4. Test the Endpoints

```bash
# Test System Health endpoint
curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -X OPTIONS \
     http://localhost:3000/api/system-health

curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/system-health

# Test System Metrics endpoint
curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -X OPTIONS \
     http://localhost:3000/api/system/metrics

curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/system/metrics

# Test Usage Realtime endpoint
curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -X OPTIONS \
     http://localhost:3000/api/system/usage/realtime

curl -H "Origin: http://dezignbuild.site" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/system/usage/realtime
```

### 5. Check Browser Console

After deployment, check the browser console for:
- API URLs being used (should show in dev mode logs)
- CORS errors (should be resolved now)
- Network errors (check if API is reachable)

## Debugging Steps

### If Still Failing:

1. **Check API URLs in Browser:**
   - Open browser console
   - Look for `[System Health] Fetching from URL:` or similar logs
   - Verify the URL is correct

2. **Check CORS Headers:**
   - Open browser DevTools → Network tab
   - Find the failing request
   - Check Response Headers for `Access-Control-Allow-Origin`
   - Should match your frontend origin

3. **Check Backend Logs:**
   ```bash
   docker compose logs backend | grep -i "system\|cors"
   ```

4. **Verify Environment Variables:**
   ```bash
   # Frontend build args
   docker compose config | grep -A 5 "frontend:" | grep "VITE_API_URL"
   
   # Backend environment
   docker compose exec backend env | grep -E "VITE_API_URL|CORS_ORIGINS"
   ```

## Common Issues

### Issue: "Failed to fetch" Error

**Possible Causes:**
- API URL is incorrect
- Backend server is not running
- Network/firewall blocking the request

**Solution:**
- Verify `VITE_API_URL` in frontend build
- Check backend is running: `docker compose ps`
- Test API directly: `curl http://dezignbuild.site:3000/api/system-health`

### Issue: CORS Error Still Appearing

**Possible Causes:**
- Frontend domain not in `CORS_ORIGINS`
- Backend CORS middleware not applied
- Browser caching old CORS response

**Solution:**
- Add frontend domain to `CORS_ORIGINS` in `.env`
- Restart backend: `docker compose restart backend`
- Clear browser cache or use incognito mode

### Issue: 401 Unauthorized

**Possible Causes:**
- Missing or invalid authentication token
- Token expired

**Solution:**
- Check if user is logged in
- Verify token in localStorage: `localStorage.getItem('auth_token')`
- Try logging out and back in

## Testing

After deployment, test both pages:
1. Navigate to System Dashboard
2. Verify metrics load without errors
3. Navigate to System Health page
4. Verify health data loads without errors
5. Check browser console for any warnings

## Summary

All affected endpoints now have:
- ✅ Explicit CORS mode in fetch requests
- ✅ OPTIONS handlers for preflight requests
- ✅ Explicit CORS headers in all response paths (success and error)
- ✅ Improved error handling and logging
- ✅ Better error messages for debugging

These fixes ensure that the System Dashboard and System Health pages work correctly in production environments.

