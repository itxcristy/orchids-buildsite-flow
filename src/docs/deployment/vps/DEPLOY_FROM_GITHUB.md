# 🚀 Deploy Drena ERP from GitHub to VPS

Complete guide to deploy the latest version from GitHub to your VPS.

## Quick Deploy (One Command)

```bash
# SSH to VPS
ssh root@72.61.243.152

# Run deployment script
cd /root
wget https://raw.githubusercontent.com/eddy7896/buildsite-flow/main/scripts/deploy-from-github.sh
chmod +x deploy-from-github.sh
./deploy-from-github.sh
```

## Manual Deploy (Step by Step)

### Step 1: SSH to VPS

```bash
ssh root@72.61.243.152
```

### Step 2: Clone or Update from GitHub

**If project doesn't exist:**
```bash
cd /root
git clone https://github.com/eddy7896/buildsite-flow.git buildsite-flow
cd buildsite-flow
```

**If project already exists:**
```bash
cd /root/buildsite-flow
git pull origin main
```

### Step 3: Set Up Environment

```bash
# Check if .env exists
ls -la .env

# If not, create from template
cp .env.production .env

# Edit .env with your values
nano .env
```

**Required environment variables:**
```env
POSTGRES_PASSWORD=your_secure_password
VITE_JWT_SECRET=your_jwt_secret
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

### Step 4: Deploy with Docker

```bash
# Stop existing containers
docker compose -f docker-compose.prod.yml down

# Build images
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 5: Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test backend
curl http://localhost:3000/health

# Test frontend
curl http://localhost/

# Check database
docker exec drena-postgres pg_isready -U postgres
```

## Automated Deployment Script

### Option 1: Download and Run

```bash
# On VPS
cd /root
wget https://raw.githubusercontent.com/eddy7896/buildsite-flow/main/scripts/deploy-from-github.sh
chmod +x deploy-from-github.sh
./deploy-from-github.sh
```

### Option 2: Copy Script to VPS

```bash
# From local machine, copy script to VPS
scp scripts/deploy-from-github.sh root@72.61.243.152:/root/

# SSH and run
ssh root@72.61.243.152
chmod +x /root/deploy-from-github.sh
/root/deploy-from-github.sh
```

### Option 3: Create Script on VPS

```bash
# SSH to VPS
ssh root@72.61.243.152

# Create script
cat > /root/deploy.sh << 'EOF'
#!/bin/bash
cd /root/buildsite-flow
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
EOF

chmod +x /root/deploy.sh
/root/deploy.sh
```

## Update Existing Deployment

If you already have the project deployed:

```bash
# SSH to VPS
ssh root@72.61.243.152

# Navigate to project
cd /root/buildsite-flow

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 50
```

## Troubleshooting

### Issue: Git Clone Fails

**Error:** `Permission denied (publickey)`

**Solution:** Use HTTPS instead of SSH:
```bash
git clone https://github.com/eddy7896/buildsite-flow.git
```

### Issue: .env File Missing

**Solution:**
```bash
# Create from template
cp .env.production .env

# Or create manually
nano .env
```

### Issue: Docker Build Fails

**Solution:**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Clean and rebuild
docker system prune -f
docker compose -f docker-compose.prod.yml build --no-cache
```

### Issue: Containers Won't Start

**Solution:**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check status
docker compose -f docker-compose.prod.yml ps

# See debug guide
./scripts/debug-docker.sh
```

## Post-Deployment Checklist

- [ ] Containers are running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Backend health check: `curl http://localhost:3000/health`
- [ ] Frontend accessible: `curl http://localhost/`
- [ ] Database connected: `docker exec drena-postgres pg_isready -U postgres`
- [ ] Can access from browser: `http://your-vps-ip`
- [ ] Logs show no errors: `docker compose -f docker-compose.prod.yml logs`

## Quick Reference

```bash
# Deploy from GitHub
cd /root/buildsite-flow
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

**Your ERP system will be deployed from GitHub!** 🚀

