# 🚀 BuildFlow Deployment Guide for Hostinger KVM Server

Complete step-by-step guide to deploy BuildFlow on your Hostinger KVM server with zero issues.

## 📋 Prerequisites

- Hostinger KVM server with root/SSH access
- Ubuntu 20.04+ or Debian 11+ (recommended)
- At least 4GB RAM, 20GB disk space
- Domain name (optional, but recommended)

## 🔧 Step 1: Server Initial Setup

### 1.1 Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose (v2)
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Add your user to docker group (if not root)
usermod -aG docker $USER
```

### 1.4 Configure Firewall

```bash
# Install UFW if not present
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow backend API (if accessing directly)
ufw allow 3000/tcp

# Enable firewall
ufw enable
ufw status
```

## 📦 Step 2: Deploy Application

### 2.1 Clone or Upload Project

**Option A: Using Git (Recommended)**
```bash
# Install Git if not present
apt install git -y

# Clone your repository
cd /opt
git clone YOUR_REPOSITORY_URL buildflow
cd buildflow
```

**Option B: Upload Files via SCP**
```bash
# From your local machine
scp -r /path/to/buildsite-flow root@YOUR_SERVER_IP:/opt/buildflow
```

### 2.2 Configure Environment

```bash
cd /opt/buildflow

# Copy environment template
cp .env.hostinger.example .env.hostinger

# Edit environment file
nano .env.hostinger
```

**Required Changes in `.env.hostinger`:**

1. **Database Password:**
   ```bash
   POSTGRES_PASSWORD=your_strong_password_here_min_16_chars
   ```

2. **Redis Password:**
   ```bash
   REDIS_PASSWORD=your_redis_password_here_min_16_chars
   ```

3. **JWT Secret:**
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   # Copy output to:
   VITE_JWT_SECRET=generated_secret_here
   ```

4. **API URL:**
   ```bash
   # Replace YOUR_SERVER_IP with your actual server IP or domain
   VITE_API_URL=http://YOUR_SERVER_IP:3000/api
   # Or if using domain:
   VITE_API_URL=https://api.yourdomain.com/api
   ```

5. **CORS Origins:**
   ```bash
   # Add your domains/IPs (comma-separated, no spaces)
   CORS_ORIGINS=http://YOUR_SERVER_IP,https://yourdomain.com
   ```

6. **Email Configuration:**
   ```bash
   # Configure your email provider (SMTP, SendGrid, etc.)
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=noreply@yourdomain.com
   ```

### 2.3 Run Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy-hostinger.sh

# Run deployment
./scripts/deploy-hostinger.sh
```

The script will:
- ✅ Validate environment configuration
- ✅ Check Docker installation
- ✅ Create necessary directories
- ✅ Build Docker images
- ✅ Start all services
- ✅ Wait for services to be healthy
- ✅ Display service status

## 🔍 Step 3: Verify Deployment

### 3.1 Check Service Status

```bash
cd /opt/buildflow
docker compose -f docker-compose.hostinger.yml ps
```

All services should show as "Up" and "healthy".

### 3.2 Test Health Endpoint

```bash
# Test backend health
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost:80/health
```

### 3.3 Check Logs

```bash
# View all logs
docker compose -f docker-compose.hostinger.yml logs -f

# View specific service logs
docker compose -f docker-compose.hostinger.yml logs -f backend
docker compose -f docker-compose.hostinger.yml logs -f frontend
docker compose -f docker-compose.hostinger.yml logs -f postgres
```

### 3.4 Access Application

- **Frontend:** `http://YOUR_SERVER_IP`
- **Backend API:** `http://YOUR_SERVER_IP:3000/api`
- **Health Check:** `http://YOUR_SERVER_IP:3000/api/health`

## 🌐 Step 4: Configure Domain & SSL (Optional but Recommended)

### 4.1 Install Nginx

```bash
apt install nginx -y
```

### 4.2 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/buildflow
```

Add this configuration:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.3 Enable Site

```bash
ln -s /etc/nginx/sites-available/buildflow /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 4.4 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is set up automatically
```

### 4.5 Update Environment Variables

After setting up domain, update `.env.hostinger`:

```bash
VITE_API_URL=https://api.yourdomain.com/api
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com
```

Then restart services:

```bash
cd /opt/buildflow
docker compose -f docker-compose.hostinger.yml restart
```

## 🔧 Step 5: Maintenance Commands

### View Logs

```bash
# All services
docker compose -f docker-compose.hostinger.yml logs -f

# Specific service
docker compose -f docker-compose.hostinger.yml logs -f [service_name]
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.hostinger.yml restart

# Restart specific service
docker compose -f docker-compose.hostinger.yml restart backend
```

### Stop Services

```bash
docker compose -f docker-compose.hostinger.yml down
```

### Start Services

```bash
docker compose -f docker-compose.hostinger.yml up -d
```

### Update Application

```bash
cd /opt/buildflow

# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker compose -f docker-compose.hostinger.yml build --no-cache
docker compose -f docker-compose.hostinger.yml up -d
```

### Backup Database

```bash
# Manual backup
docker compose -f docker-compose.hostinger.yml exec postgres pg_dump -U postgres buildflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backups are configured via BACKUP_SCHEDULE in .env.hostinger
```

## 🐛 Troubleshooting

### Services Won't Start

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.hostinger.yml logs
   ```

2. **Check disk space:**
   ```bash
   df -h
   ```

3. **Check Docker:**
   ```bash
   docker ps
   docker system df
   ```

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   docker compose -f docker-compose.hostinger.yml exec postgres pg_isready -U postgres
   ```

2. **Check connection from backend:**
   ```bash
   docker compose -f docker-compose.hostinger.yml exec backend node -e "require('./config/database').pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e))"
   ```

### Port Already in Use

If ports 80, 3000, or 5432 are already in use:

1. **Find what's using the port:**
   ```bash
   netstat -tulpn | grep :80
   ```

2. **Update ports in `.env.hostinger`:**
   ```bash
   FRONTEND_PORT=8080
   BACKEND_PORT=3001
   POSTGRES_PORT=5433
   ```

3. **Restart services:**
   ```bash
   docker compose -f docker-compose.hostinger.yml down
   docker compose -f docker-compose.hostinger.yml up -d
   ```

### Out of Memory

If services crash due to memory:

1. **Check memory usage:**
   ```bash
   free -h
   docker stats
   ```

2. **Reduce resource limits in `docker-compose.hostinger.yml`** (edit the `deploy.resources.limits` sections)

3. **Add swap space:**
   ```bash
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

### CORS Errors

1. **Verify CORS_ORIGINS in `.env.hostinger`** includes your domain
2. **Restart backend:**
   ```bash
   docker compose -f docker-compose.hostinger.yml restart backend
   ```

## 📊 Monitoring

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
# or
top
```

### Check Service Health

```bash
# Backend health
curl http://localhost:3000/api/health | jq

# Frontend health
curl http://localhost/health
```

## 🔐 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret (32+ characters)
- [ ] Configured firewall (UFW)
- [ ] Set up SSL certificate
- [ ] Updated CORS origins
- [ ] Configured email service
- [ ] Enabled automatic backups
- [ ] Set up log rotation
- [ ] Restricted database access (ports not exposed publicly)
- [ ] Regular security updates

## 📞 Support

If you encounter issues:

1. Check logs: `docker compose -f docker-compose.hostinger.yml logs -f`
2. Verify environment: `cat .env.hostinger`
3. Check service status: `docker compose -f docker-compose.hostinger.yml ps`
4. Review this guide's troubleshooting section

---

**🎉 Your BuildFlow application is now deployed and ready to use!**

