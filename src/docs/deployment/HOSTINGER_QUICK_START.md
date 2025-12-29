# ⚡ Quick Start - Hostinger KVM Deployment

## 🚀 Fast Deployment (5 Minutes)

### 1. Connect to Server
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y
```

### 3. Clone/Upload Project
```bash
cd /opt
git clone YOUR_REPO_URL buildflow
cd buildflow
```

### 4. Configure Environment
```bash
cp .env.hostinger.example .env.hostinger
nano .env.hostinger
```

**Minimum Required Changes:**
- `POSTGRES_PASSWORD` - Set strong password (16+ chars)
- `REDIS_PASSWORD` - Set strong password (16+ chars)
- `VITE_JWT_SECRET` - Generate: `openssl rand -base64 32`
- `VITE_API_URL` - Replace `YOUR_SERVER_IP` with actual IP
- `CORS_ORIGINS` - Replace `YOUR_SERVER_IP` with actual IP

### 5. Deploy
```bash
chmod +x scripts/deploy-hostinger.sh
./scripts/deploy-hostinger.sh
```

### 6. Access Application
- Frontend: `http://YOUR_SERVER_IP`
- Backend: `http://YOUR_SERVER_IP:3000/api`
- Health: `http://YOUR_SERVER_IP:3000/api/health`

## ✅ Verify Deployment

```bash
# Check services
docker compose ps

# Check logs
docker compose logs -f

# Test health
curl http://localhost:3000/api/health
```

## 🔧 Common Commands

```bash
# Restart all services
docker compose restart

# Stop services
docker compose down

# Start services
docker compose up -d

# View logs
docker compose logs -f [service]
```

## 📚 Full Documentation

See [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md) for complete guide.

