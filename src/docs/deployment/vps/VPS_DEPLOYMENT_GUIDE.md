# 🚀 VPS Deployment Guide - Update Docker Containers

## Quick Start

### 1. Connect to Your VPS

```bash
ssh root@72.61.243.152
```

### 2. Navigate to Project Directory

```bash
cd /path/to/your/project  # Usually /root/buildsite-flow or similar
```

### 3. Update Project Files

**Option A: Using Git (Recommended)**
```bash
# Pull latest changes
git pull origin main

# Or if using a different branch
git pull origin master
```

**Option B: Using SCP (from your local machine)**
```bash
# From your local machine, copy files to VPS
scp -r . root@72.61.243.152:/root/buildsite-flow/
```

**Option C: Using rsync (from your local machine)**
```bash
# Sync files (excludes node_modules, .git, etc.)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@72.61.243.152:/root/buildsite-flow/
```

### 4. Update Docker Containers

```bash
# Stop existing containers
docker compose -f docker-compose.prod.yml down

# Pull latest images (if using remote registry)
# docker compose -f docker-compose.prod.yml pull

# Rebuild images with latest code
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker compose -f docker-compose.prod.yml up -d

# View logs to verify
docker compose -f docker-compose.prod.yml logs -f
```

## Complete Update Process

### Step-by-Step Deployment

```bash
# 1. SSH into VPS
ssh root@72.61.243.152

# 2. Navigate to project
cd /root/buildsite-flow  # Adjust path as needed

# 3. Backup current setup (optional but recommended)
docker compose -f docker-compose.prod.yml ps > backup-status.txt
docker compose -f docker-compose.prod.yml config > backup-config.txt

# 4. Pull latest code
git pull

# 5. Update .env file if needed
nano .env  # Or use your preferred editor

# 6. Stop containers
docker compose -f docker-compose.prod.yml down

# 7. Rebuild images
docker compose -f docker-compose.prod.yml build --no-cache

# 8. Start containers
docker compose -f docker-compose.prod.yml up -d

# 9. Check status
docker compose -f docker-compose.prod.yml ps

# 10. View logs
docker compose -f docker-compose.prod.yml logs --tail 50

# 11. Monitor for errors
docker compose -f docker-compose.prod.yml logs -f backend
```

## Monitoring Update Process

### View All Container Status

```bash
# List all containers
docker compose -f docker-compose.prod.yml ps

# Detailed status
docker ps -a

# Resource usage
docker stats
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100

# Since specific time
docker compose -f docker-compose.prod.yml logs --since 10m
```

### Check Health

```bash
# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost/health

# Database connection
docker exec drena-postgres psql -U postgres -d buildflow_db -c "SELECT version();"
```

## Quick Update Script

Create this script on your VPS for easy updates:

```bash
#!/bin/bash
# save as: /root/buildsite-flow/update.sh

set -e

echo "🚀 Starting Drena Update Process..."
echo ""

# Navigate to project directory
cd /root/buildsite-flow

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Stop containers
echo "🛑 Stopping containers..."
docker compose -f docker-compose.prod.yml down

# Rebuild
echo "🔨 Rebuilding images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Start
echo "🚀 Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

# Check health
echo ""
echo "🏥 Health Checks:"
curl -s http://localhost:3000/health | jq . || echo "Backend health check failed"
curl -s http://localhost/health || echo "Frontend health check failed"

echo ""
echo "✅ Update complete!"
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
```

Make it executable:
```bash
chmod +x /root/buildsite-flow/update.sh
```

Then run:
```bash
./update.sh
```

## Troubleshooting

### If Containers Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check Docker resources
docker system df

# Clean up unused resources
docker system prune -a
```

### If Database Issues

```bash
# Check database
docker exec drena-postgres psql -U postgres -d buildflow_db -c "\dt"

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Rollback to Previous Version

```bash
# Stop current
docker compose -f docker-compose.prod.yml down

# Use previous image tag or rebuild from previous commit
git checkout <previous-commit-hash>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

Make sure your `.env` file on VPS has all required variables:

```bash
# On VPS, edit .env
nano .env

# Required variables:
# POSTGRES_PASSWORD=your_password
# VITE_JWT_SECRET=your_secret
# VITE_API_URL=http://your-domain.com:3000/api
# FRONTEND_URL=http://your-domain.com
# CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

## Useful Commands Reference

```bash
# View all running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs
docker logs <container-name>

# Execute command in container
docker exec -it <container-name> /bin/sh

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# View resource usage
docker stats

# Clean up
docker system prune -a

# View network
docker network ls
docker network inspect drena-network
```

## Automated Deployment Script

For even easier updates, create this on your VPS:

```bash
#!/bin/bash
# /root/buildsite-flow/deploy.sh

set -e

PROJECT_DIR="/root/buildsite-flow"
cd $PROJECT_DIR

echo "=========================================="
echo "🚀 Drena Production Deployment"
echo "=========================================="
echo ""

# Check if git repo
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull
else
    echo "⚠️  Not a git repository, skipping pull"
fi

# Backup
echo "💾 Creating backup..."
docker compose -f docker-compose.prod.yml ps > backup-$(date +%Y%m%d-%H%M%S).txt

# Stop
echo "🛑 Stopping services..."
docker compose -f docker-compose.prod.yml down

# Build
echo "🔨 Building images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Start
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait
echo "⏳ Waiting for services..."
sleep 15

# Status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

# Health
echo ""
echo "🏥 Health Checks:"
echo -n "Backend: "
curl -s http://localhost:3000/health | grep -q "ok" && echo "✅ OK" || echo "❌ FAILED"

echo -n "Frontend: "
curl -s http://localhost/health | grep -q "healthy" && echo "✅ OK" || echo "❌ FAILED"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
```

## Next Steps

1. **Set up the script** on your VPS
2. **Test the update process** 
3. **Monitor logs** during first update
4. **Verify** all services are healthy

---

**Your VPS is ready for updates!** 🎉

