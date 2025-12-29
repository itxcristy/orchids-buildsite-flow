# 🔧 Fix for Hostinger/1 CPU Server Deployment

## Problem
- **Error:** `range of CPUs is from 0.01 to 1.00, as there are only 1 CPUs available`
- **Error:** `The "POSTGRES_PASSWORD" variable is not set`

## Solution

### Option 1: Use the Optimized File (Recommended)

The hosting platform is using `docker-compose.yml`. We've created an optimized version:

**Use `docker-compose.hostinger.yml` instead** - it's optimized for 1 CPU servers.

### Option 2: Set Environment Variables in Hosting Panel

In your Hostinger Docker Manager:

1. Go to **Environment Variables** section
2. Add these variables:

```
POSTGRES_PASSWORD=your_secure_password_here
VITE_JWT_SECRET=your_jwt_secret_here
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

### Option 3: Update docker-compose.yml in GitHub

The `docker-compose.yml` has been updated with:
- ✅ Reduced CPU limits (works on 1 CPU servers)
- ✅ Default values for POSTGRES_PASSWORD
- ✅ Default values for VITE_JWT_SECRET

**Pull the latest from GitHub:**
```bash
git pull origin main
```

## CPU Limits Fixed

| Service | Old Limit | New Limit | Total |
|---------|-----------|-----------|-------|
| postgres | 2.0 CPUs | 0.4 CPUs | ✅ |
| backend | 2.0 CPUs | 0.3 CPUs | ✅ |
| redis | 1.0 CPUs | 0.2 CPUs | ✅ |
| frontend | 1.0 CPUs | 0.1 CPUs | ✅ |
| **Total** | **6.0 CPUs** | **1.0 CPU** | ✅ |

## Memory Limits Fixed

| Service | Old Limit | New Limit |
|---------|-----------|-----------|
| postgres | 2GB | 512MB |
| backend | 2GB | 512MB |
| redis | 512MB | 256MB |
| frontend | 512MB | 256MB |

## Quick Fix Steps

1. **Update GitHub** (if not already):
   ```bash
   git add docker-compose.yml
   git commit -m "Fix CPU limits for 1 CPU servers"
   git push origin main
   ```

2. **In Hostinger Docker Manager:**
   - Go to your project
   - Click **Rebuild** or **Redeploy**
   - Make sure environment variables are set

3. **Or set environment variables:**
   - Add `POSTGRES_PASSWORD=admin` (or your password)
   - Add `VITE_JWT_SECRET=your-secret-key`

## Alternative: Use docker-compose.hostinger.yml

If the hosting platform allows you to specify a different compose file:

1. Rename `docker-compose.hostinger.yml` to `docker-compose.yml` in GitHub
2. Or configure the platform to use `docker-compose.hostinger.yml`

## Verify Deployment

After deployment, check:

```bash
# Check containers
docker ps

# Check logs
docker logs backend
docker logs postgres

# Test backend
curl http://localhost:3000/health
```

---

**The deployment should now work on 1 CPU servers!** ✅

