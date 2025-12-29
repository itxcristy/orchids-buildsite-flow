# 🚀 VPS Update - Execute Now

## Current Situation
You're on the VPS and have merge conflicts. Here's how to fix and update:

## Step 1: Resolve Merge Conflicts

```bash
# On VPS (you're already there)
cd /root/buildsite-flow

# Stash local changes (saves your .env and docker-compose.yml)
git stash

# Pull latest code
git pull origin main

# Restore your local changes
git stash pop

# If conflicts occur, manually merge:
# - Keep your .env file (it has VPS-specific settings)
# - Use the new docker-compose.prod.yml from repo
```

## Step 2: Get docker-compose.prod.yml

```bash
# Check if file exists
ls -la docker-compose.prod.yml

# If it doesn't exist, it should be in the repo now
# If still missing, create it from the repo version
```

## Step 3: Update Docker Containers

```bash
# Stop current containers (using docker-compose.yml)
docker compose -f docker-compose.yml down

# Copy docker-compose.prod.yml if needed
# (It should be in the repo now after git pull)

# Update using production config
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs --tail 50
```

## Quick Fix Commands (Run on VPS)

```bash
# 1. Stash changes and pull
git stash
git pull origin main
git stash pop

# 2. Update containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/health
```

## If docker-compose.prod.yml Still Missing

The file should be in the repo. If it's not showing up:

```bash
# Check if it exists
ls -la docker-compose.prod.yml

# If missing, check git status
git status

# Force pull
git fetch origin
git reset --hard origin/main
# WARNING: This will overwrite local changes!
```

---

**Run these commands on your VPS now!**

