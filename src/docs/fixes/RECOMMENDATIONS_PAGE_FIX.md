# Page Recommendations Fix - Production Deployment Issue

## Problem Summary

The page recommendations feature works in local Docker but fails in production with:
- `TypeError: can't access property "newValue", r is undefined`
- `Error: Not allowed to define cross-origin object as property`
- `Error fetching recommendations: Error: Failed to fetch recommendations`

## Root Causes Identified

1. **CORS Configuration**: The recommendations endpoint needed explicit CORS headers for production
2. **API URL Construction**: Production API URL construction needed better handling
3. **Error Handling**: CORS and network errors weren't being properly detected and logged

## Fixes Applied

### 1. Frontend: Improved API URL Construction (`src/config/api.ts`)

**Changes:**
- Enhanced `getApiRoot()` to properly handle production URLs
- Ensures `/api` suffix is correctly added when `VITE_API_URL` is set
- Added production logging and warnings when `VITE_API_URL` is missing
- Better fallback handling for production environments

**Key Improvement:**
```typescript
// Now properly handles VITE_API_URL in production
if (envIsValid && envUrl) {
  let apiUrl = envUrl.toString().replace(/\/$/, '');
  if (!apiUrl.endsWith('/api')) {
    apiUrl = `${apiUrl}${apiUrl.endsWith('/') ? '' : '/'}api`;
  }
  return apiUrl;
}
```

### 2. Frontend: Enhanced Error Handling (`src/hooks/usePageRecommendations.ts`)

**Changes:**
- Added explicit CORS mode to fetch request
- Improved CORS error detection
- Better error logging with API URL and current page context
- More specific error messages for different failure scenarios

**Key Improvements:**
```typescript
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  mode: 'cors', // Explicitly enable CORS
  credentials: 'omit',
  cache: 'no-cache',
});
```

### 3. Backend: Explicit CORS Headers (`server/routes/pageCatalog.js`)

**Changes:**
- Added explicit CORS headers to the recommendations endpoint
- Added OPTIONS handler for preflight requests
- CORS headers set even on error responses

**Key Improvements:**
```javascript
// Set CORS headers explicitly for this public endpoint
const origin = req.headers.origin;
if (origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
}
```

## Deployment Checklist

### 1. Verify Environment Variables

Ensure your production `.env` file has:

```bash
# API URL - Must include /api suffix
VITE_API_URL=http://dezignbuild.site:3000/api
# Or if using HTTPS:
# VITE_API_URL=https://dezignbuild.site/api

# CORS Origins - Must include your domain
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site

# Frontend URL
FRONTEND_URL=http://dezignbuild.site
```

### 2. Rebuild Frontend Container

**Important:** Vite environment variables are baked into the build at build time. You must rebuild the frontend container after changing `VITE_*` variables.

```bash
# Stop containers
docker compose down

# Rebuild frontend with new environment variables
docker compose build --no-cache frontend

# Start all containers
docker compose up -d
```

### 3. Verify Backend CORS Configuration

Check that your backend container has the correct `CORS_ORIGINS` environment variable:

```bash
# Check backend environment
docker compose exec backend env | grep CORS_ORIGINS

# Check backend logs for CORS configuration
docker compose logs backend | grep CORS
```

### 4. Test the Endpoint

```bash
# Test from server
curl -H "Origin: http://dezignbuild.site" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/api/system/page-catalog/recommendations/preview?industry=construction&company_size=small&primary_focus=operations

# Test actual request
curl -H "Origin: http://dezignbuild.site" \
     "http://localhost:3000/api/system/page-catalog/recommendations/preview?industry=construction&company_size=small&primary_focus=operations"
```

### 5. Check Browser Console

After deployment, check the browser console for:
- API URL being used (should show in logs if in dev mode)
- CORS errors (should be resolved now)
- Network errors (check if API is reachable)

## Debugging Steps

### If Still Failing:

1. **Check API URL in Browser:**
   - Open browser console
   - Look for `[Page Recommendations] Fetching from URL:` log
   - Verify the URL is correct (should be `http://dezignbuild.site:3000/api/system/page-catalog/recommendations/preview?...`)

2. **Check CORS Headers:**
   - Open browser DevTools → Network tab
   - Find the recommendations request
   - Check Response Headers for `Access-Control-Allow-Origin`
   - Should match your frontend origin

3. **Check Backend Logs:**
   ```bash
   docker compose logs backend | grep -i "recommendations\|cors"
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
- Test API directly: `curl http://dezignbuild.site:3000/health`

### Issue: CORS Error Still Appearing

**Possible Causes:**
- Frontend domain not in `CORS_ORIGINS`
- Backend CORS middleware not applied
- Browser caching old CORS response

**Solution:**
- Add frontend domain to `CORS_ORIGINS` in `.env`
- Restart backend: `docker compose restart backend`
- Clear browser cache or use incognito mode

### Issue: "newValue" TypeError

**Possible Causes:**
- Browser extension interfering
- Client-side code accessing undefined object
- React state update issue

**Solution:**
- Test in incognito mode (disables extensions)
- Check browser console for full error stack
- Verify React component state handling

## Files Modified

1. `src/config/api.ts` - Improved API URL construction
2. `src/hooks/usePageRecommendations.ts` - Enhanced error handling and CORS support
3. `server/routes/pageCatalog.js` - Added explicit CORS headers and OPTIONS handler

## Testing

After deployment, test the recommendations page:
1. Navigate to onboarding flow
2. Fill in agency details
3. Reach the page selection step
4. Verify recommendations load without errors
5. Check browser console for any warnings

## Next Steps

1. Deploy the updated code
2. Rebuild frontend container with correct environment variables
3. Test the recommendations endpoint
4. Monitor logs for any CORS or API errors
5. Verify the feature works in production

