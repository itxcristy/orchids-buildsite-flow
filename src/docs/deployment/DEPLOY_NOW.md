# 🚀 Deploy Drena to Production - Quick Start

## Step 1: Verify Environment Configuration

Make sure your `.env` file has these values set:

```env
# Database
POSTGRES_PASSWORD=your_strong_password_here

# JWT Secret
VITE_JWT_SECRET=your_jwt_secret_here

# API URL (update with your domain)
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com

# CORS Origins (update with your domain)
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

## Step 2: Deploy

### Option A: Using Deployment Script (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\production-deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/production-deploy.sh
./scripts/production-deploy.sh
```

### Option B: Manual Deployment

```bash
# 1. Build production images
docker compose -f docker-compose.prod.yml build

# 2. Start all services
docker compose -f docker-compose.prod.yml up -d

# 3. Check status
docker compose -f docker-compose.prod.yml ps

# 4. View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Step 3: Verify Deployment

1. **Check Services:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   All services should show "healthy" status.

2. **Test Frontend:**
   - Open: `http://localhost` or `http://your-domain.com`
   - Should see Drena landing page

3. **Test Backend:**
   - Open: `http://localhost:3000/api/health`
   - Should return: `{"status":"ok"}`

## Step 4: Access Your Application

- **Frontend**: http://localhost (or your domain)
- **Backend API**: http://localhost:3000/api (or your domain:3000/api)

## Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart services
docker compose -f docker-compose.prod.yml restart

# Update application
docker compose -f docker-compose.prod.yml up -d --build

# Check resource usage
docker stats
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check specific service
docker compose -f docker-compose.prod.yml logs backend
```

### Port already in use
```bash
# Check what's using the port
netstat -ano | findstr :80      # Windows
lsof -i :80                      # Linux/Mac

# Change port in .env file
FRONTEND_PORT=8080
```

### Database connection errors
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify database is running
docker exec drena-postgres pg_isready -U postgres
```

## Next Steps

1. ✅ Configure SSL/TLS certificates
2. ✅ Set up domain DNS
3. ✅ Configure production email (SMTP)
4. ✅ Set up automated backups
5. ✅ Configure monitoring
6. ✅ Review security settings

## Need Help?

- Check `PRODUCTION_DEPLOYMENT.md` for detailed guide
- View logs: `docker compose -f docker-compose.prod.yml logs`
- Check service health: `docker compose -f docker-compose.prod.yml ps`

---

**Your Drena application is now ready for production! 🎉**

