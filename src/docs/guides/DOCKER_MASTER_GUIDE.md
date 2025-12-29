# 🐳 Docker Master Guide for BuildFlow ERP System

## Complete Command Reference & Beginner's Guide

**Your one-stop guide to mastering Docker for your multi-tenant ERP system**

---

## 📚 Table of Contents

1. [Understanding Docker Basics](#understanding-docker-basics)
2. [Essential Commands for Your ERP](#essential-commands-for-your-erp)
3. [Development Workflow Commands](#development-workflow-commands)
4. [Production Deployment Commands](#production-deployment-commands)
5. [Database Management Commands](#database-management-commands)
6. [Troubleshooting Commands](#troubleshooting-commands)
7. [Multi-Tenant Database Commands](#multi-tenant-database-commands)
8. [Deployment on Different Platforms](#deployment-on-different-platforms)
9. [Daily Workflows](#daily-workflows)
10. [Advanced Commands](#advanced-commands)

---

## 🎓 Understanding Docker Basics

### What is Docker?

**Simple Explanation:**
Docker packages your application and all its dependencies (databases, libraries, configurations) into a "container" that runs the same way on any computer.

**Real-World Analogy:**
- **Without Docker:** Like moving to a new house - you have to set up electricity, water, internet, furniture from scratch
- **With Docker:** Like moving into a fully furnished apartment - everything is already set up and ready to use

### Key Terms You Need to Know

| Term | What It Means | Real Example |
|------|---------------|--------------|
| **Container** | A running instance of your application | Like a running program on your computer |
| **Image** | A template/blueprint for containers | Like a recipe or a class definition |
| **Dockerfile** | Instructions to build an image | Like a recipe card telling Docker how to cook |
| **Docker Compose** | Tool to manage multiple containers together | Like a conductor managing an orchestra |
| **Volume** | Persistent storage for containers | Like an external hard drive that survives restarts |

---

## 🚀 Essential Commands for Your ERP

### Starting Your ERP System

#### Command: `docker compose -f docker-compose.dev.yml up -d`

**What it does:** Starts all services (PostgreSQL, Redis, Backend, Frontend) in development mode

**When to use:**
- Starting your development environment
- After pulling new code
- After restarting your computer
- When you want to work on the ERP system

**How to use:**
```bash
# Navigate to your project folder
cd d:\buildsite-flow

# Start all services
docker compose -f docker-compose.dev.yml up -d
```

**What happens:**
1. Docker reads `docker-compose.dev.yml`
2. Starts PostgreSQL container (database)
3. Starts Redis container (cache)
4. Starts Backend container (API server)
5. Starts Frontend container (React app)
6. All services connect to each other automatically

**Expected output:**
```
[+] Running 4/4
 ✔ Container buildflow-postgres-dev    Started
 ✔ Container buildflow-redis-dev       Started
 ✔ Container buildflow-backend-dev     Started
 ✔ Container buildflow-frontend-dev    Started
```

**Time:** 30 seconds - 2 minutes

---

#### Command: `docker compose -f docker-compose.prod.yml up -d`

**What it does:** Starts all services in production mode (optimized, no hot reload)

**When to use:**
- Deploying to production server
- Testing production build locally
- When you want production-like environment

**How to use:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Difference from dev:**
- Dev: Hot reload enabled, larger images, more verbose logging
- Prod: Optimized builds, smaller images, production logging

---

### Stopping Your ERP System

#### Command: `docker compose -f docker-compose.dev.yml down`

**What it does:** Stops and removes all containers (but keeps data in volumes)

**When to use:**
- When you're done working for the day
- Before switching to production mode
- When you want to free up resources
- Before making major configuration changes

**How to use:**
```bash
docker compose -f docker-compose.dev.yml down
```

**What happens:**
- Stops all running containers
- Removes containers (but data is safe in volumes)
- Keeps Docker images (for faster startup next time)

**Expected output:**
```
[+] Running 4/4
 ✔ Container buildflow-frontend-dev    Removed
 ✔ Container buildflow-backend-dev     Removed
 ✔ Container buildflow-redis-dev       Removed
 ✔ Container buildflow-postgres-dev     Removed
```

**Time:** 5-10 seconds

---

#### Command: `docker compose -f docker-compose.dev.yml down -v`

**What it does:** Stops containers AND deletes all data volumes (⚠️ WARNING: Deletes database!)

**When to use:**
- Starting completely fresh (deleting all data)
- Testing from scratch
- When database is corrupted beyond repair
- Before important demos (clean slate)

**⚠️ WARNING:** This deletes ALL your database data! Use with caution.

**How to use:**
```bash
# Make sure you have backups first!
docker compose -f docker-compose.dev.yml down -v
```

**What gets deleted:**
- All PostgreSQL data (all agencies, all users, all data)
- All Redis cache data
- All uploaded files in storage

**What stays:**
- Your source code (safe)
- Docker images (safe)

---

### Viewing Logs

#### Command: `docker compose -f docker-compose.dev.yml logs -f`

**What it does:** Shows logs from all services in real-time (follows new logs)

**When to use:**
- Debugging issues
- Monitoring system activity
- Seeing what's happening in real-time
- Checking if services started correctly

**How to use:**
```bash
# View all logs (follow mode - updates automatically)
docker compose -f docker-compose.dev.yml logs -f

# Press Ctrl+C to stop following logs
```

**What you'll see:**
```
buildflow-backend-dev  | 🚀 Server running on port 3000
buildflow-backend-dev  | ✅ Connected to PostgreSQL database
buildflow-frontend-dev | VITE v7.3.0  ready in 555 ms
buildflow-postgres-dev | database system is ready to accept connections
```

**Time:** Runs continuously until you press Ctrl+C

---

#### Command: `docker compose -f docker-compose.dev.yml logs backend --tail 50`

**What it does:** Shows last 50 lines of backend logs (doesn't follow)

**When to use:**
- Quick check of what happened
- Looking at recent errors
- Not wanting to see all services

**How to use:**
```bash
# Last 50 lines of backend logs
docker compose -f docker-compose.dev.yml logs backend --tail 50

# Last 100 lines
docker compose -f docker-compose.dev.yml logs backend --tail 100

# All backend logs (no limit)
docker compose -f docker-compose.dev.yml logs backend
```

**Options:**
- `--tail N` - Show last N lines
- `-f` or `--follow` - Follow new logs (like `tail -f`)
- `--since 10m` - Show logs from last 10 minutes

---

### Checking Service Status

#### Command: `docker compose -f docker-compose.dev.yml ps`

**What it does:** Shows status of all containers (running, stopped, health)

**When to use:**
- Checking if everything is running
- Verifying services started correctly
- Before starting work
- Troubleshooting issues

**How to use:**
```bash
docker compose -f docker-compose.dev.yml ps
```

**Expected output:**
```
NAME                     STATUS                   PORTS
buildflow-backend-dev    Up 5 minutes (healthy)   0.0.0.0:3000->3000/tcp
buildflow-frontend-dev   Up 5 minutes            0.0.0.0:5173->5173/tcp
buildflow-postgres-dev   Up 5 minutes (healthy)   0.0.0.0:5432->5432/tcp
buildflow-redis-dev      Up 5 minutes (healthy)   0.0.0.0:6379->6379/tcp
```

**What to look for:**
- `Up` = Container is running ✅
- `healthy` = Health check passed ✅
- `unhealthy` = Something is wrong ❌
- `Exited` = Container stopped ❌

---

## 🔄 Development Workflow Commands

### Daily Development Workflow

#### Morning: Starting Your Day

```bash
# 1. Navigate to project
cd d:\buildsite-flow

# 2. Start all services
docker compose -f docker-compose.dev.yml up -d

# 3. Check everything is running
docker compose -f docker-compose.dev.yml ps

# 4. View logs to verify
docker compose -f docker-compose.dev.yml logs --tail 20

# 5. Open browser: http://localhost:5173
```

**Time:** 2-3 minutes

---

#### During Development: Making Changes

**Frontend Changes (React/TypeScript):**
- Edit files in `src/` folder
- Changes reflect automatically (hot reload)
- No Docker commands needed!

**Backend Changes (Node.js):**
- Edit files in `server/` folder
- Backend restarts automatically (nodemon)
- No Docker commands needed!

**If changes don't reflect:**
```bash
# Restart specific service
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart frontend
```

---

#### After Code Changes: Rebuilding

#### Command: `docker compose -f docker-compose.dev.yml build`

**What it does:** Rebuilds Docker images with your latest code changes

**When to use:**
- After changing Dockerfile
- After changing package.json (new dependencies)
- After changing docker-compose.yml
- When containers won't start (corrupted image)

**How to use:**
```bash
# Rebuild all services
docker compose -f docker-compose.dev.yml build

# Rebuild specific service (faster)
docker compose -f docker-compose.dev.yml build backend

# Rebuild without cache (clean build)
docker compose -f docker-compose.dev.yml build --no-cache
```

**What happens:**
1. Reads Dockerfile
2. Downloads base images if needed
3. Installs dependencies
4. Copies your code
5. Creates new image

**Time:** 2-10 minutes (depending on changes)

---

#### Command: `docker compose -f docker-compose.dev.yml up -d --build`

**What it does:** Rebuilds images AND starts containers in one command

**When to use:**
- After making changes that require rebuild
- Quick rebuild and restart
- After pulling new code with Dockerfile changes

**How to use:**
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

**Time:** 2-10 minutes

---

#### Evening: Ending Your Day

```bash
# 1. Stop all services (keeps data)
docker compose -f docker-compose.dev.yml down

# Or if you want to keep running in background:
# Just close terminal, containers keep running
```

---

## 🏭 Production Deployment Commands

### Initial Production Setup

#### Step 1: Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your values (use any text editor)
notepad .env.production  # Windows
nano .env.production     # Linux/Mac
```

**What to change:**
- `POSTGRES_PASSWORD` - Strong password
- `REDIS_PASSWORD` - Strong password
- `VITE_JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `VITE_API_URL` - Your production domain
- `CORS_ORIGINS` - Your production domains

---

#### Step 2: Build Production Images

#### Command: `docker compose -f docker-compose.prod.yml build`

**What it does:** Builds optimized production images

**When to use:**
- First time deploying
- After code changes
- After dependency updates
- Before deploying to production

**How to use:**
```bash
docker compose -f docker-compose.prod.yml build
```

**What happens:**
- Builds frontend (React → static files → Nginx)
- Builds backend (Node.js production build)
- Optimizes images (smaller, faster)
- No development tools included

**Time:** 5-15 minutes (first time), 2-5 minutes (subsequent)

---

#### Step 3: Start Production Services

#### Command: `docker compose -f docker-compose.prod.yml up -d`

**What it does:** Starts all production services

**When to use:**
- Deploying to production
- Testing production build locally

**How to use:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Expected output:**
```
[+] Running 4/4
 ✔ Container buildflow-postgres-prod    Started
 ✔ Container buildflow-redis-prod       Started
 ✔ Container buildflow-backend-prod     Started
 ✔ Container buildflow-frontend-prod    Started
```

---

### Production Updates

#### Updating Production (After Code Changes)

```bash
# 1. Pull latest code
git pull

# 2. Rebuild images
docker compose -f docker-compose.prod.yml build

# 3. Restart services (zero downtime with proper setup)
docker compose -f docker-compose.prod.yml up -d

# 4. Verify health
docker compose -f docker-compose.prod.yml ps
```

**Time:** 5-15 minutes

---

#### Rolling Back Production (If Something Breaks)

```bash
# 1. Switch to previous code version
git checkout previous-version-tag

# 2. Rebuild
docker compose -f docker-compose.prod.yml build

# 3. Restart
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.prod.yml ps
```

**Time:** 5-10 minutes

---

## 🗄️ Database Management Commands

### Connecting to Database

#### Command: `docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db`

**What it does:** Opens PostgreSQL command line inside the database container

**When to use:**
- Running SQL queries manually
- Checking database structure
- Debugging database issues
- Viewing data directly

**How to use:**
```bash
# Connect to main database
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db

# Once connected, you can run SQL:
# SELECT * FROM agencies;
# \dt (list tables)
# \q (quit)
```

**Example session:**
```sql
buildflow_db=# SELECT COUNT(*) FROM agencies;
 count 
-------
     2
(1 row)

buildflow_db=# \dt
                    List of relations
 Schema |         Name          | Type  |  Owner   
--------+-----------------------+-------+----------
 public | agencies              | table | postgres
 public | users                 | table | postgres
 ...

buildflow_db=# \q
```

---

### Database Backup Commands

#### Command: `docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > backup.sql`

**What it does:** Creates a backup of your main database

**When to use:**
- Before making major changes
- Regular backups (daily/weekly)
- Before upgrading
- Before deleting data

**How to use:**
```bash
# Backup main database
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > backup_$(date +%Y%m%d).sql

# Backup specific agency database
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres agency_company_12345678 > backup_agency.sql
```

**What you get:**
- SQL file with all data
- Can be restored on any PostgreSQL server
- Includes schema and data

**File location:** Current directory (where you ran the command)

**Time:** 30 seconds - 5 minutes (depending on database size)

---

#### Command: `docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres buildflow_db < backup.sql`

**What it does:** Restores database from backup file

**When to use:**
- After data loss
- Restoring to previous state
- Setting up on new server
- Testing with production data

**How to use:**
```bash
# Restore main database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres buildflow_db < backup_20250119.sql

# Restore agency database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres agency_company_12345678 < backup_agency.sql
```

**⚠️ WARNING:** This overwrites existing data! Make sure you have a backup first.

**Time:** 1-10 minutes (depending on backup size)

---

### Database Maintenance Commands

#### Command: `docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "\l"`

**What it does:** Lists all databases

**When to use:**
- Checking what databases exist
- Verifying agency databases were created
- Database inventory

**How to use:**
```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "\l"
```

**Expected output:**
```
                                  List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    |   Access privileges   
-----------+----------+----------+------------+------------+-----------------------
 buildflow_db | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
 agency_company1_12345678 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
 agency_company2_87654321 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
```

---

#### Command: `docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT name, database_name FROM agencies;"`

**What it does:** Lists all agencies and their database names

**When to use:**
- Checking which agencies exist
- Verifying database names
- Multi-tenant management

**How to use:**
```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db -c "SELECT id, name, database_name FROM agencies;"
```

---

## 🔧 Troubleshooting Commands

### When Services Won't Start

#### Command: `docker compose -f docker-compose.dev.yml logs`

**What it does:** Shows all logs (without following)

**When to use:**
- Services won't start
- Errors on startup
- Understanding what went wrong

**How to use:**
```bash
# All logs
docker compose -f docker-compose.dev.yml logs

# Specific service
docker compose -f docker-compose.dev.yml logs backend

# Last 100 lines
docker compose -f docker-compose.dev.yml logs --tail 100
```

---

#### Command: `docker compose -f docker-compose.dev.yml ps -a`

**What it does:** Shows all containers including stopped ones

**When to use:**
- Container exited unexpectedly
- Checking container status
- Finding stopped containers

**How to use:**
```bash
docker compose -f docker-compose.dev.yml ps -a
```

**Look for:**
- `Exited (1)` = Container crashed (check logs)
- `Restarting` = Container keeps crashing (infinite loop)
- `Up` = Container is running ✅

---

### When Ports Are Already in Use

#### Command: `netstat -ano | findstr :5432` (Windows)

**What it does:** Shows what's using port 5432

**When to use:**
- Error: "port is already allocated"
- Port conflict
- Finding conflicting services

**How to use:**
```bash
# Windows
netstat -ano | findstr :5432
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Linux/Mac
lsof -i :5432
lsof -i :3000
lsof -i :5173
```

**Solution:**
- Stop the conflicting service
- Or change port in docker-compose.yml

---

### When Database Connection Fails

#### Command: `docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres`

**What it does:** Checks if PostgreSQL is ready to accept connections

**When to use:**
- Backend can't connect to database
- Database connection errors
- Verifying database is running

**How to use:**
```bash
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres
```

**Expected output:**
```
/var/run/postgresql:5432 - accepting connections
```

**If it says "no response":**
- Database might be starting (wait 30 seconds)
- Database might be crashed (check logs)
- Check container status: `docker compose ps`

---

### When You Need to Start Fresh

#### Command: `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d`

**What it does:** Completely removes everything and starts fresh

**When to use:**
- Database is corrupted
- Everything is broken
- Starting completely fresh
- Testing from scratch

**⚠️ WARNING:** Deletes ALL data!

**How to use:**
```bash
# 1. Backup first (if you have data you want to keep)
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > backup_before_reset.sql

# 2. Remove everything
docker compose -f docker-compose.dev.yml down -v

# 3. Start fresh
docker compose -f docker-compose.dev.yml up -d
```

---

## 🏢 Multi-Tenant Database Commands

### Creating Agency Database

**Normally done via API, but you can also do it manually:**

#### Command: Create Agency Database Manually

```bash
# 1. Connect to PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres

# 2. Create database
CREATE DATABASE agency_newcompany_12345678;

# 3. Exit
\q

# 4. Connect to new database and create schema
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d agency_newcompany_12345678 -f /docker-entrypoint-initdb.d/01_core_schema.sql
```

**When to use:**
- API creation failed
- Manual testing
- Recovery scenarios

---

### Listing All Agency Databases

#### Command: `docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"`

**What it does:** Lists all agency databases

**When to use:**
- Checking how many agencies exist
- Database inventory
- Multi-tenant management

**How to use:**
```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"
```

---

### Backing Up All Agency Databases

#### Command: Automated Backup Script

```bash
# Use the provided script
./scripts/backup-database.sh

# Or manually for each database
for db in $(docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'agency_%';"); do
  docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres "$db" > "backup_${db}_$(date +%Y%m%d).sql"
done
```

**When to use:**
- Regular backups
- Before major changes
- Disaster recovery preparation

---

## 🌐 Deployment on Different Platforms

### Deployment on Local Server (Windows/Linux/Mac)

#### Prerequisites
```bash
# 1. Install Docker Desktop (Windows/Mac) or Docker Engine (Linux)
# Download from: https://www.docker.com/products/docker-desktop

# 2. Verify installation
docker --version
docker compose version

# 3. Clone your repository
git clone your-repo-url
cd buildsite-flow
```

#### Deployment Steps
```bash
# 1. Configure environment
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Build production images
docker compose -f docker-compose.prod.yml build

# 3. Start services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/health
```

---

### Deployment on Cloud Server (AWS, DigitalOcean, etc.)

#### Step 1: Connect to Server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker (if not installed)
# Ubuntu/Debian:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify
docker --version
```

#### Step 2: Clone Repository

```bash
# On server
git clone your-repo-url
cd buildsite-flow
```

#### Step 3: Configure Environment

```bash
# Create production environment file
nano .env.production

# Add your production values:
POSTGRES_PASSWORD=your_strong_password
VITE_JWT_SECRET=your_generated_secret
VITE_API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

#### Step 4: Deploy

```bash
# Build and start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

#### Step 5: Set Up Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/buildflow

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/buildflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Deployment on Docker Swarm (Multiple Servers)

#### Step 1: Initialize Swarm

```bash
# On manager node
docker swarm init

# Note the join token for worker nodes
```

#### Step 2: Deploy Stack

```bash
# Deploy your stack
docker stack deploy -c docker-compose.prod.yml buildflow

# Check status
docker stack services buildflow
```

**When to use:**
- Multiple servers
- High availability
- Load balancing across servers

---

### Deployment on Kubernetes (Advanced)

**Note:** Kubernetes deployment requires additional configuration files (not included in basic setup)

**When to use:**
- Very large scale
- Enterprise deployments
- Complex orchestration needs

---

## 📋 Daily Workflows

### Workflow 1: Starting Development Session

```bash
# Morning routine
cd d:\buildsite-flow
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
# Open http://localhost:5173
```

**Time:** 2 minutes

---

### Workflow 2: Making Code Changes

```bash
# 1. Edit code (no Docker commands needed - hot reload works)
# 2. If hot reload doesn't work:
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart frontend
```

**Time:** 10 seconds (if restart needed)

---

### Workflow 3: Adding New Dependencies

```bash
# 1. Add to package.json
# 2. Rebuild container
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
```

**Time:** 2-5 minutes

---

### Workflow 4: Database Changes

```bash
# 1. Create migration file in database/migrations/
# 2. Restart PostgreSQL (migrations run automatically)
docker compose -f docker-compose.dev.yml restart postgres

# Or run manually:
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d buildflow_db -f /path/to/migration.sql
```

---

### Workflow 5: Production Deployment

```bash
# 1. Pull latest code
git pull

# 2. Rebuild
docker compose -f docker-compose.prod.yml build

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/health
```

**Time:** 10-15 minutes

---

## 🎯 Advanced Commands

### Resource Monitoring

#### Command: `docker stats`

**What it does:** Shows real-time resource usage (CPU, memory) for all containers

**When to use:**
- Checking if system is overloaded
- Finding memory leaks
- Performance monitoring
- Capacity planning

**How to use:**
```bash
docker stats

# Or for specific containers
docker stats buildflow-backend-dev buildflow-postgres-dev
```

**Expected output:**
```
CONTAINER           CPU %     MEM USAGE / LIMIT     MEM %
buildflow-backend  2.5%      450MiB / 2GiB         22%
buildflow-postgres 1.2%      600MiB / 2GiB         30%
```

**Press Ctrl+C to exit**

---

### Executing Commands Inside Containers

#### Command: `docker compose -f docker-compose.dev.yml exec backend sh`

**What it does:** Opens a shell inside the backend container

**When to use:**
- Debugging inside container
- Running commands not available on host
- Checking file permissions
- Manual testing

**How to use:**
```bash
# Open shell in backend
docker compose -f docker-compose.dev.yml exec backend sh

# Now you're inside the container:
# ls -la
# cat package.json
# node --version
# exit (to leave)
```

---

### Copying Files to/from Containers

#### Command: `docker cp`

**What it does:** Copies files between host and container

**When to use:**
- Getting logs from container
- Copying configuration files
- Extracting data

**How to use:**
```bash
# Copy FROM container TO host
docker cp buildflow-backend-dev:/app/logs/error.log ./error.log

# Copy FROM host TO container
docker cp ./config.json buildflow-backend-dev:/app/config.json
```

---

### Inspecting Containers

#### Command: `docker inspect buildflow-backend-dev`

**What it does:** Shows detailed information about container (config, network, volumes)

**When to use:**
- Understanding container configuration
- Debugging network issues
- Checking volume mounts
- Finding environment variables

**How to use:**
```bash
# Full inspection (lots of output)
docker inspect buildflow-backend-dev

# Specific information
docker inspect buildflow-backend-dev | grep -A 10 "Env"
docker inspect buildflow-backend-dev | grep -A 5 "NetworkSettings"
```

---

## 🎓 Learning Path: From Beginner to Master

### Week 1: Basics

**Day 1-2: Understanding**
- Read this guide
- Understand what Docker is
- Learn basic concepts

**Day 3-4: Hands-On**
- Start/stop services
- View logs
- Check status

**Day 5-7: Practice**
- Make code changes
- Restart services
- Experiment with commands

---

### Week 2: Development

**Day 1-3: Daily Workflow**
- Master daily workflows
- Understand hot reload
- Learn to debug

**Day 4-5: Database**
- Connect to database
- Run queries
- Understand volumes

**Day 6-7: Troubleshooting**
- Fix common issues
- Understand error messages
- Learn to read logs

---

### Week 3: Production

**Day 1-3: Production Setup**
- Configure production
- Build production images
- Deploy locally

**Day 4-5: Deployment**
- Deploy to server
- Set up reverse proxy
- Configure SSL

**Day 6-7: Maintenance**
- Set up backups
- Monitor services
- Handle updates

---

### Week 4: Advanced

**Day 1-3: Multi-Tenant**
- Understand agency databases
- Manage multiple databases
- Backup/restore strategies

**Day 4-5: Optimization**
- Resource limits
- Performance tuning
- Scaling

**Day 6-7: Mastery**
- Custom Dockerfiles
- Advanced networking
- Production best practices

---

## 📝 Quick Reference Card

### Most Used Commands

```bash
# Start development
docker compose -f docker-compose.dev.yml up -d

# Stop development
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Check status
docker compose -f docker-compose.dev.yml ps

# Restart service
docker compose -f docker-compose.dev.yml restart backend

# Rebuild
docker compose -f docker-compose.dev.yml build

# Database backup
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > backup.sql

# Database restore
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres buildflow_db < backup.sql
```

---

## 🆘 Emergency Commands

### When Everything is Broken

```bash
# 1. Stop everything
docker compose -f docker-compose.dev.yml down

# 2. Remove all containers and volumes
docker compose -f docker-compose.dev.yml down -v

# 3. Clean Docker system
docker system prune -a

# 4. Rebuild from scratch
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

### When Database is Corrupted

```bash
# 1. Backup what you can
docker compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres buildflow_db > corrupted_backup.sql

# 2. Stop PostgreSQL
docker compose -f docker-compose.dev.yml stop postgres

# 3. Remove database volume
docker volume rm buildsite-flow_postgres_data_dev

# 4. Start fresh
docker compose -f docker-compose.dev.yml up -d postgres

# 5. Restore from backup (if you have one)
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres buildflow_db < backup.sql
```

---

## ✅ Checklist: Docker Mastery

- [ ] Can start/stop services
- [ ] Can view and understand logs
- [ ] Can check service status
- [ ] Can restart services
- [ ] Can rebuild containers
- [ ] Can connect to database
- [ ] Can backup/restore database
- [ ] Can troubleshoot common issues
- [ ] Can deploy to production
- [ ] Understand multi-tenant setup
- [ ] Can manage agency databases
- [ ] Can monitor resources
- [ ] Can handle emergencies

---

**Congratulations! You're now a Docker master! 🎉**

**Remember:** Practice makes perfect. Use these commands daily, and they'll become second nature!
