# 🚀 Deploy CORS Fix to Hostinger Server

## Quick Deployment Steps

### 1. Commit Changes to Git

```bash
# Check what files were changed
git status

# Add the changed files
git add server/config/middleware.js
git add docker-compose.yml
git add .env

# Commit with a descriptive message
git commit -m "Fix CORS configuration for www.dezignbuild.site domain

- Enhanced CORS matching to handle www/non-www variants
- Added flexible hostname matching
- Updated docker-compose.yml to use .env CORS_ORIGINS variable
- Added debug logging for CORS troubleshooting"

# Push to your repository
git push origin main
# or
git push origin master
```

### 2. Update Hostinger Server

**Option A: SSH into Server and Pull Updates**

```bash
# SSH into your Hostinger server
ssh root@72.61.243.152
# or
ssh your-user@72.61.243.152

# Navigate to your project directory
cd /opt/buildflow
# or wherever you cloned the repository

# Pull latest changes
git pull origin main
# or
git pull origin master

# Verify the changes are there
git log --oneline -5
```

**Option B: If you have a deployment script**

```bash
# On the server, run your deployment script
cd /opt/buildflow
./scripts/deploy-hostinger.sh
```

### 3. Rebuild and Restart Containers

```bash
# On the Hostinger server

# Navigate to project directory
cd /opt/buildflow

# Stop existing containers
docker compose down
# or if using hostinger compose file:
docker compose -f docker-compose.hostinger.yml down

# Rebuild backend container (to pick up new CORS code)
docker compose build --no-cache backend
# or:
docker compose -f docker-compose.hostinger.yml build --no-cache backend

# Start containers
docker compose up -d
# or:
docker compose -f docker-compose.hostinger.yml up -d

# Check logs to verify CORS is working
docker compose logs -f backend | grep CORS
```

### 4. Verify CORS is Working

```bash
# Check backend logs for CORS debug messages
docker compose logs backend | grep -i cors

# You should see:
# [CORS] Raw CORS_ORIGINS from env: ...
# [CORS] Parsed allowed origins: ...
# [CORS] ✅ Allowed origin (hostname match): http://www.dezignbuild.site

# Test the API endpoint
curl -H "Origin: http://www.dezignbuild.site" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/api/health -v
```

### 5. Update .env File on Server (if needed)

Make sure your `.env` or `.env.hostinger` file on the server has the correct CORS_ORIGINS:

```bash
# On the server
nano .env.hostinger
# or
nano .env

# Verify CORS_ORIGINS includes:
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

After updating `.env`, restart the backend:

```bash
docker compose restart backend
```

## Quick One-Liner Deployment

If you want to do it all at once on the server:

```bash
cd /opt/buildflow && \
git pull && \
docker compose down && \
docker compose build --no-cache backend && \
docker compose up -d && \
docker compose logs -f backend | grep -i cors
```

## Troubleshooting

### If CORS still doesn't work:

1. **Check environment variable is loaded:**
   ```bash
   docker compose exec backend printenv CORS_ORIGINS
   ```

2. **Check backend logs:**
   ```bash
   docker compose logs backend | tail -50
   ```

3. **Verify the code was updated:**
   ```bash
   docker compose exec backend cat /app/config/middleware.js | grep -A 5 "buildCorsOptions"
   ```

4. **Force rebuild everything:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

## Files Changed

The following files were modified and need to be committed:

- ✅ `server/config/middleware.js` - Enhanced CORS matching
- ✅ `docker-compose.yml` - Use .env variable for CORS_ORIGINS
- ✅ `.env` - Updated CORS_ORIGINS (optional, may be server-specific)

## Important Notes

1. **Environment Variables**: The `.env` file on the server may be different from your local `.env`. Make sure to update it on the server.

2. **No Downtime Option**: If you want zero downtime, you can:
   - Build new image first: `docker compose build backend`
   - Then restart: `docker compose up -d --no-deps backend`

3. **Git Repository**: Make sure you're pushing to the correct branch that the server is pulling from.

