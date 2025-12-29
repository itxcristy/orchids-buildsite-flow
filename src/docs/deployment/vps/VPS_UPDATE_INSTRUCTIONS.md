# 📋 VPS Update Instructions - Step by Step

## Method 1: Using Git (Recommended - Easiest)

### On Your VPS:

```bash
# 1. SSH into VPS
ssh root@72.61.243.152

# 2. Navigate to project directory
cd /root/buildsite-flow  # or wherever your project is

# 3. Pull latest code
git pull origin main
# OR
git pull origin master

# 4. Run update script (if you uploaded it)
chmod +x scripts/vps-update.sh
./scripts/vps-update.sh

# OR manually update:
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 5. Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 50
```

## Method 2: Transfer Files from Local Machine

### From Your Local Machine (Windows):

**Using Git Bash or WSL:**

```bash
# 1. Navigate to project directory
cd /d/buildsite-flow  # or your project path

# 2. Transfer files using rsync (excludes node_modules, etc.)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  --exclude 'build' --exclude '*.log' \
  ./ root@72.61.243.152:/root/buildsite-flow/

# 3. SSH and update
ssh root@72.61.243.152
cd /root/buildsite-flow
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

**Using WinSCP (GUI - Easiest for Windows):**

1. Download WinSCP: https://winscp.net/
2. Connect to: `root@72.61.243.152`
3. Navigate to `/root/buildsite-flow` on server
4. Upload changed files (drag and drop)
5. SSH and run update commands

## Method 3: One-Line Update (After Initial Setup)

### Create update script on VPS:

```bash
# SSH to VPS
ssh root@72.61.243.152

# Create update script
cat > /root/buildsite-flow/update.sh << 'EOF'
#!/bin/bash
cd /root/buildsite-flow
git pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 20
EOF

# Make executable
chmod +x /root/buildsite-flow/update.sh
```

### Then update with one command:

```bash
ssh root@72.61.243.152 "/root/buildsite-flow/update.sh"
```

## Monitoring the Update

### View Update Progress:

```bash
# SSH to VPS
ssh root@72.61.243.152

# Watch logs in real-time
docker compose -f docker-compose.prod.yml logs -f

# Or watch specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Check Service Health:

```bash
# On VPS
curl http://localhost:3000/health
curl http://localhost/health

# Check database
docker exec drena-postgres psql -U postgres -d buildflow_db -c "SELECT COUNT(*) FROM public.agencies;"
```

## Complete Update Checklist

- [ ] SSH to VPS: `ssh root@72.61.243.152`
- [ ] Navigate to project: `cd /root/buildsite-flow`
- [ ] Pull/transfer latest code
- [ ] Verify `.env` file has correct values
- [ ] Stop containers: `docker compose -f docker-compose.prod.yml down`
- [ ] Rebuild: `docker compose -f docker-compose.prod.yml build --no-cache`
- [ ] Start: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Wait 15 seconds for services to start
- [ ] Check status: `docker compose -f docker-compose.prod.yml ps`
- [ ] Check logs: `docker compose -f docker-compose.prod.yml logs --tail 50`
- [ ] Test health: `curl http://localhost:3000/health`
- [ ] Test frontend: `curl http://localhost/health`

## Quick Reference Commands

```bash
# Connect to VPS
ssh root@72.61.243.152

# Update project
cd /root/buildsite-flow && git pull && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml build --no-cache && docker compose -f docker-compose.prod.yml up -d

# View status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart service
docker compose -f docker-compose.prod.yml restart backend

# Check disk space
df -h

# Clean Docker
docker system prune -a
```

## Troubleshooting

### If update fails:

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check Docker
docker ps -a
docker images

# Rollback
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

**You can now update your VPS easily!** 🚀

