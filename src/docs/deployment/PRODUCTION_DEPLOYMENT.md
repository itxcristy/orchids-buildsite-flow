# 🚀 Drena Production Deployment Guide

Complete guide for deploying Drena to production using Docker.

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose 2.0+
- At least 4GB RAM available
- Domain name configured (optional but recommended)

## Quick Start

### 1. Configure Environment

Ensure your `.env` file has all production values:

```bash
# Required
POSTGRES_PASSWORD=your_strong_password
VITE_JWT_SECRET=your_jwt_secret
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com
CORS_ORIGINS=http://your-domain.com,https://your-domain.com

# Optional but recommended
REDIS_PASSWORD=your_redis_password
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
```

### 2. Deploy to Production

**Linux/Mac:**
```bash
chmod +x scripts/production-deploy.sh
./scripts/production-deploy.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\production-deploy.ps1
```

**Or manually:**
```bash
# Build and start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Production Features

✅ **Optimized Builds** - Multi-stage Docker builds for smaller images  
✅ **Health Checks** - Automatic health monitoring for all services  
✅ **Resource Limits** - CPU and memory limits configured  
✅ **Security Hardened** - Non-root containers, secure defaults  
✅ **Auto Restart** - Services automatically restart on failure  
✅ **Data Persistence** - All data stored in Docker volumes  
✅ **Network Isolation** - Services communicate via private network  

## Service Architecture

```
┌─────────────┐
│  Frontend   │ (Nginx + React) - Port 80
│  (Drena)    │
└──────┬──────┘
       │
       ├───► Backend API (Node.js) - Port 3000
       │
       ├───► PostgreSQL - Port 5432
       │
       └───► Redis - Port 6379
```

## Access URLs

- **Frontend**: `http://your-domain.com` or `http://localhost`
- **Backend API**: `http://your-domain.com:3000/api` or `http://localhost:3000/api`
- **Database**: `localhost:5432` (internal only)

## Management Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Stop Services
```bash
docker compose -f docker-compose.prod.yml down
```

### Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
# Backup will be saved to ./database/backups/
docker exec drena-postgres pg_dump -U postgres buildflow_db > database/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

## Health Checks

All services include health checks:

- **Frontend**: `http://localhost/health`
- **Backend**: `http://localhost:3000/api/health`
- **PostgreSQL**: Internal health check
- **Redis**: Internal health check

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret
- [ ] Configure production SMTP
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Review CORS origins
- [ ] Test all functionality

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### Database connection issues
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify database is running
docker exec drena-postgres pg_isready -U postgres
```

### Frontend not loading
```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend

# Verify nginx config
docker exec drena-frontend nginx -t
```

### Out of memory
```bash
# Check resource usage
docker stats

# Adjust limits in docker-compose.prod.yml
```

## Production Optimization

### Enable SSL/TLS

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update nginx configuration
3. Update `VITE_API_URL` to use `https://`
4. Update `FRONTEND_URL` to use `https://`
5. Update `CORS_ORIGINS` to include `https://` origins

### Performance Tuning

- Adjust resource limits in `docker-compose.prod.yml`
- Enable Redis caching
- Configure CDN for static assets
- Set up database connection pooling
- Enable gzip compression in nginx

## Support

For issues or questions:
- Check logs: `docker compose -f docker-compose.prod.yml logs`
- Review documentation in `/docs`
- Check service health: `docker compose -f docker-compose.prod.yml ps`

