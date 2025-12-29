# 🐳 Docker Quick Start Guide

## ✅ Yes, Docker is Excellent for Your ERP System!

Docker provides:
- ✅ **Consistent environments** - Same setup on dev, staging, production
- ✅ **Easy deployment** - One command to start everything
- ✅ **Service isolation** - Each service (DB, Redis, Backend, Frontend) runs independently
- ✅ **Database persistence** - Your data survives container restarts
- ✅ **Easy scaling** - Add more backend instances easily
- ✅ **Simplified dependencies** - No need to install PostgreSQL/Redis locally

## 📦 What's Included

Your Docker setup includes:

1. **PostgreSQL 15** - Main database (port 5432)
2. **Redis 7** - Caching and sessions (port 6379)
3. **Backend API** - Node.js/Express server (port 3000)
4. **Frontend** - React/Vite application (port 8080 prod / 5173 dev)

## 🚀 How to Use It

### Step 1: Install Docker

Download and install Docker Desktop:
- **Windows/Mac**: https://www.docker.com/products/docker-desktop
- **Linux**: Follow your distribution's instructions

Verify installation:
```bash
docker --version
docker compose version
```

### Step 2: Start the System

**For Development (with hot reload):**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**For Production:**
```bash
docker compose up -d
```

**Or use PowerShell script (Windows):**
```powershell
.\scripts\docker-start.ps1 dev    # Development
.\scripts\docker-start.ps1 prod    # Production
```

### Step 3: Access Your Application

**Development Mode:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Database: localhost:5432 (user: postgres, password: admin)

**Production Mode:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api
- Database: localhost:5432 (user: postgres, password: admin)

### Step 4: View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Step 5: Stop the System

```bash
docker compose down
```

## 📋 Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose build
docker compose up -d

# Check service status
docker compose ps

# Access database
docker compose exec postgres psql -U postgres -d buildflow_db

# Access backend container
docker compose exec backend sh

# Restart a specific service
docker compose restart backend
```

## 🔧 Configuration

### Environment Variables

The Docker setup uses environment variables from:
- `docker-compose.yml` (production)
- `docker-compose.dev.yml` (development)
- `.env` file (if you create one)

### Database Connection

- **From your host machine**: `postgresql://postgres:admin@localhost:5432/buildflow_db`
- **From containers**: `postgresql://postgres:admin@postgres:5432/buildflow_db`

## 🗄️ Database Management

### Access Database

```bash
# Via Docker
docker compose exec postgres psql -U postgres -d buildflow_db

# Or from host (if psql installed)
psql -h localhost -U postgres -d buildflow_db
# Password: admin
```

### Backup Database

```bash
docker compose exec postgres pg_dump -U postgres buildflow_db > backup.sql
```

### Restore Database

```bash
docker compose exec -T postgres psql -U postgres buildflow_db < backup.sql
```

### Reset Database (⚠️ Deletes all data)

```bash
docker compose down -v
docker compose up -d
```

## 🔄 Development Workflow

### With Docker (Recommended)

1. Start development environment:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Make code changes:
   - Frontend: Edit files in `src/` - changes reflect immediately
   - Backend: Edit files in `server/` - nodemon restarts automatically

3. View logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f
   ```

4. Stop when done:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Without Docker (Traditional)

1. Install PostgreSQL and Redis locally
2. Run `npm install` in root and `server/` directory
3. Start backend: `cd server && npm run dev`
4. Start frontend: `npm run dev`

## 🚢 Production Deployment

### Build and Deploy

```bash
# Build production images
docker compose build

# Start services
docker compose up -d

# Verify health
curl http://localhost:3000/api/health
curl http://localhost:8080/health
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d
```

## 🐛 Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
netstat -an | grep 5432
netstat -an | grep 3000
netstat -an | grep 8080

# Stop conflicting services or change ports in docker-compose.yml
```

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check service status
docker compose ps

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker compose exec postgres pg_isready -U postgres

# Check database exists
docker compose exec postgres psql -U postgres -l
```

### Clear Everything and Start Fresh

```bash
# ⚠️ This deletes all data!
docker compose down -v
docker system prune -a
docker compose build --no-cache
docker compose up -d
```

## 📚 Next Steps

1. ✅ **Start Docker**: Run `docker compose -f docker-compose.dev.yml up -d`
2. ✅ **Verify Access**: Open http://localhost:5173
3. ✅ **Check Logs**: Run `docker compose logs -f`
4. ✅ **Read Full Guide**: See [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)

## 🎯 Benefits Summary

| Feature | Without Docker | With Docker |
|---------|---------------|-------------|
| Setup Time | 30+ minutes | 2 minutes |
| Environment Consistency | Manual setup | Automatic |
| Database Management | Manual install | Containerized |
| Deployment | Complex | Single command |
| Scaling | Difficult | Easy |
| Isolation | Shared resources | Isolated containers |

---

**You're all set! 🎉**

Start with: `docker compose -f docker-compose.dev.yml up -d`

For detailed documentation, see: [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)
