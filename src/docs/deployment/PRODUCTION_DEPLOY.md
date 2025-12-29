# Production Deployment Guide

## Quick Fix for VITE_DATABASE_URL Error

The frontend doesn't actually need `VITE_DATABASE_URL` - it only needs `VITE_API_URL` to communicate with the backend API.

## Steps to Fix

### 1. Update Environment Variables

Before rebuilding, set these environment variables for production:

```bash
# For production server at 72.61.243.152
export VITE_API_URL=http://72.61.243.152:3000/api
export VITE_DATABASE_URL=  # Empty is fine - frontend doesn't use DB
export VITE_APP_ENVIRONMENT=production
```

Or update your `.env` file:
```env
VITE_API_URL=http://72.61.243.152:3000/api
VITE_DATABASE_URL=
VITE_APP_ENVIRONMENT=production
```

### 2. Rebuild Frontend Container

```bash
# Stop containers
docker compose down

# Rebuild only frontend with new env vars
docker compose build --no-cache frontend

# Start all containers
docker compose up -d
```

### 3. Verify

```bash
# Check containers are running
docker compose ps

# Check frontend logs
docker compose logs frontend

# Test frontend
curl http://72.61.243.152/

# Test backend API
curl http://72.61.243.152:3000/health
```

## Important Notes

1. **VITE_DATABASE_URL is NOT needed** - The frontend communicates with the backend via HTTP API, not direct database access
2. **CORS is configured** - The backend now allows requests from `http://72.61.243.152`
3. **Environment variables are baked into the build** - You must rebuild the frontend container when changing VITE_* variables

## Architecture

```
Frontend (nginx) → Backend API (Express) → PostgreSQL Database
     ↓                    ↓
  Port 80            Port 3000          Port 5432
```

The frontend (React/Vite) is a static site served by nginx. It makes HTTP requests to the backend API, which then queries the database.

