# 🔧 Fix CORS and Database Issues on VPS

## Issues Found

1. **CORS blocking IP address**: `http://72.61.243.152` is being blocked
2. **Database password mismatch**: Postgres volume has old password

## Fix 1: CORS (Already Fixed in Code)

The code has been updated to automatically allow IP addresses. You need to:

1. **Pull latest code on VPS:**
```bash
cd /docker/buildsite-flow
git pull origin main
```

2. **Rebuild backend:**
```bash
docker compose build backend
docker compose up -d backend
```

## Fix 2: Database Password Mismatch

The postgres volume was created with the old password. You have two options:

### Option A: Reset Postgres Volume (Loses Data)

```bash
cd /docker/buildsite-flow
docker compose down -v  # Remove volumes
docker compose up -d
```

### Option B: Update Postgres Password (Keeps Data)

```bash
cd /docker/buildsite-flow

# Connect to postgres container
docker exec -it postgres psql -U postgres

# In psql, change password:
ALTER USER postgres WITH PASSWORD 'T0qSw1+UzLhLohHQi9WNE4T0W3t02YndRx3w5KtQPIE=';

# Exit psql
\q
```

## Quick Fix (All-in-One)

```bash
cd /docker/buildsite-flow

# 1. Pull latest code
git pull origin main

# 2. Stop containers
docker compose down

# 3. Reset postgres volume (if you don't need the data)
docker volume rm buildsite-flow_postgres_data

# 4. Rebuild and start
docker compose build backend
docker compose up -d

# 5. Wait for services to be healthy
docker compose ps
```

## Verify Fix

After applying fixes, check logs:
```bash
docker compose logs backend | grep CORS
```

You should see:
- ✅ `Allowed origin` instead of `❌ Blocked origin`
- ✅ No more CORS errors in browser console
- ✅ API requests working

## Environment Variable Check

Make sure in Hostinger Environment Variables you have:
```
CORS_ORIGINS=http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site,http://localhost:5173,http://localhost:3000,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000
POSTGRES_PASSWORD=T0qSw1+UzLhLohHQi9WNE4T0W3t02YndRx3w5KtQPIE=
```

