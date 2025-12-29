# Docker Setup Guide for BuildFlow ERP System

## 🐳 Overview

This guide explains how to use Docker for the BuildFlow ERP system. Docker provides:
- **Consistent environments** across development, staging, and production
- **Easy deployment** with a single command
- **Isolated services** (PostgreSQL, Redis, Backend, Frontend)
- **Database persistence** with volumes
- **Easy scaling** and management

## 📋 Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Download: https://www.docker.com/products/docker-desktop
   - Minimum version: Docker 20.10+

2. **Docker Compose** (usually included with Docker Desktop)
   - Verify: `docker compose version`

## 🚀 Quick Start

### Production Mode

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v
```

### Development Mode (with hot reload)

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker compose -f docker-compose.dev.yml down
```

## 📦 Services

The Docker setup includes:

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Main database |
| **Redis** | 6379 | Caching and sessions |
| **Backend API** | 3000 | Express.js server |
| **Frontend** | 8080 (prod) / 5173 (dev) | React application |

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root (or use `.env.example`):

```env
# Database (already configured in docker-compose.yml)
VITE_DATABASE_URL=postgresql://postgres:admin@postgres:5432/buildflow_db

# JWT Secret (change in production!)
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@buildflow.com
```

### Database Connection

In Docker, services communicate using service names:
- **From host machine**: `localhost:5432`
- **From containers**: `postgres:5432` (service name)

## 📊 Database Management

### Access Database

```bash
# Connect via Docker
docker compose exec postgres psql -U postgres -d buildflow_db

# Or from host (if PostgreSQL client installed)
psql -h localhost -U postgres -d buildflow_db
# Password: admin
```

### Run Migrations

Migrations in `database/migrations/` are automatically executed on first startup.

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U postgres buildflow_db > backup.sql

# Restore backup
docker compose exec -T postgres psql -U postgres buildflow_db < backup.sql
```

### Reset Database

```bash
# Stop and remove volumes
docker compose down -v

# Start fresh
docker compose up -d
```

## 🔍 Useful Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Execute Commands in Containers

```bash
# Backend container
docker compose exec backend sh

# PostgreSQL container
docker compose exec postgres psql -U postgres -d buildflow_db

# Frontend container
docker compose exec frontend sh
```

### Rebuild Services

```bash
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build backend

# Rebuild and restart
docker compose up -d --build
```

### Check Service Status

```bash
# List running containers
docker compose ps

# Check resource usage
docker stats
```

## 🛠️ Development Workflow

### 1. Start Development Environment

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- PostgreSQL and Redis (same as production)
- Backend with hot reload (nodemon)
- Frontend with hot reload (Vite dev server)

### 2. Access Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Make Changes

- **Frontend**: Edit files in `src/` - changes reflect immediately
- **Backend**: Edit files in `server/` - nodemon restarts automatically

### 4. View Logs

```bash
# Watch all logs
docker compose -f docker-compose.dev.yml logs -f

# Watch specific service
docker compose -f docker-compose.dev.yml logs -f backend
```

## 🚢 Production Deployment

### 1. Build Production Images

```bash
docker compose build
```

### 2. Start Services

```bash
docker compose up -d
```

### 3. Verify Health

```bash
# Check all services are running
docker compose ps

# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost:8080/health
```

### 4. Access Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api

## 🔐 Security Best Practices

1. **Change Default Passwords**
   - Update PostgreSQL password in `docker-compose.yml`
   - Update JWT secret in `.env`

2. **Use Secrets Management**
   - For production, use Docker secrets or environment variable files
   - Never commit `.env` files to version control

3. **Network Security**
   - Services communicate on internal Docker network
   - Only expose necessary ports

4. **Regular Updates**
   ```bash
   # Update base images
   docker compose pull
   docker compose up -d
   ```

## 📈 Scaling

### Scale Backend Services

```bash
# Run 3 backend instances
docker compose up -d --scale backend=3
```

### Add Load Balancer

For production, add nginx as a reverse proxy/load balancer in front of backend services.

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check if ports are in use
netstat -an | grep 5432
netstat -an | grep 3000
netstat -an | grep 8080
```

### Database Connection Issues

```bash
# Verify PostgreSQL is healthy
docker compose exec postgres pg_isready -U postgres

# Check database exists
docker compose exec postgres psql -U postgres -l
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended)
sudo docker compose up -d
```

### Clear Everything and Start Fresh

```bash
# Stop and remove everything
docker compose down -v
docker system prune -a

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

## ✅ Next Steps

1. **Customize Configuration**: Update `.env` with your settings
2. **Run Migrations**: Database migrations run automatically on first start
3. **Seed Data**: Run seed scripts if needed
4. **Test Access**: Verify all services are accessible
5. **Set Up Monitoring**: Consider adding monitoring tools (Prometheus, Grafana)

---

**Happy Dockerizing! 🐳**
