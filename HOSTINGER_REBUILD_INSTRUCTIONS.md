# 🔧 Fix "your-domain.com" Issue - Rebuild Frontend

## Problem
The frontend was built with `VITE_API_URL=http://your-domain.com:3000/api` which is hardcoded into the JavaScript bundle. Vite embeds environment variables at **build time**, not runtime.

## Solution: Rebuild Frontend Container

### Step 1: Verify Environment Variable in Hostinger

Make sure `VITE_API_URL` is set correctly in Hostinger's Environment Variables:
```
VITE_API_URL=http://dezignbuild.site:3000/api
```

### Step 2: Rebuild Frontend Container

In Hostinger Docker Manager, you need to rebuild the frontend container. Here are the options:

#### Option A: Force Rebuild via Docker Compose (Recommended)

Add this to your YAML file temporarily, or run this command if you have SSH access:

```yaml
# In docker-compose.yml, add to frontend service:
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${VITE_API_URL:-http://dezignbuild.site:3000/api}
      # ... other args
    # Add this to force rebuild:
    no_cache: true
```

Or if you have SSH access:
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

#### Option B: Delete and Recreate Container

In Hostinger Docker Manager:
1. Stop the frontend container
2. Delete the frontend container
3. Delete the frontend image (dezign-frontend:latest)
4. Redeploy - it will rebuild with the correct VITE_API_URL

#### Option C: Update YAML and Redeploy

1. Make sure your YAML has the correct build args:
```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${VITE_API_URL:-http://dezignbuild.site:3000/api}
```

2. Make sure `VITE_API_URL=http://dezignbuild.site:3000/api` is in Environment Variables

3. In Hostinger, trigger a rebuild/redeploy

## Quick Fix: Update Environment Variable

**IMPORTANT:** Make sure this is set in Hostinger Environment Variables:
```
VITE_API_URL=http://dezignbuild.site:3000/api
```

Then rebuild the frontend container.

## Verification

After rebuilding, check the browser console - you should see:
- ✅ `http://dezignbuild.site:3000/api` (not `your-domain.com`)
- ✅ No CORS errors
- ✅ API calls working

## Why This Happens

Vite (the build tool) embeds `VITE_*` environment variables directly into the JavaScript code during the build process. Changing environment variables after the build won't affect the already-built code - you must rebuild.

