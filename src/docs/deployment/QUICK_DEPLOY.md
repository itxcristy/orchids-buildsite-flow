# 🚀 Quick Deploy Guide - Drena Production

## Fixed Issues ✅

1. ✅ Removed obsolete `version` field from docker-compose.prod.yml
2. ✅ Fixed .env file - removed inline comments from port values
3. ✅ Validated Docker Compose configuration

## Deploy Now

### Step 1: Verify Environment

Make sure your `.env` file has these values (no inline comments):

```env
POSTGRES_PASSWORD=your_password
VITE_JWT_SECRET=your_secret
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com
CORS_ORIGINS=http://your-domain.com,https://your-domain.com

# Ports (comments on separate lines)
FRONTEND_PORT=80
PORT=3000
POSTGRES_PORT=5432
REDIS_PORT=6379
```

### Step 2: Build and Deploy

```powershell
# Build production images
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 3: Verify

- Frontend: http://localhost
- Backend: http://localhost:3000/api/health
- All services should show "healthy"

## Troubleshooting

If you see "invalid hostPort" errors:
1. Check `.env` file - ensure no inline comments after port values
2. Comments should be on separate lines
3. Run: `docker compose -f docker-compose.prod.yml config` to validate

## All Fixed! Ready to Deploy! 🎉

