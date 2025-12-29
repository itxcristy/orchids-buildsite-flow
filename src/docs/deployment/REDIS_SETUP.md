# Redis Setup Guide for BuildFlow

## Quick Start with Docker (Recommended)

### Prerequisites
- Docker Desktop installed and running

### Steps

1. **Start Docker Desktop** (if not already running)

2. **Start Redis container:**
   ```powershell
   docker run -d --name buildflow-redis -p 6379:6379 redis:7-alpine
   ```

3. **Verify Redis is running:**
   ```powershell
   docker ps | findstr redis
   ```

4. **Test Redis connection:**
   ```powershell
   docker exec -it buildflow-redis redis-cli ping
   ```
   Should return: `PONG`

5. **Restart your backend server:**
   ```powershell
   cd server
   npm start
   ```

## Alternative: Install Redis on Windows

### Option 1: Using WSL (Windows Subsystem for Linux)

1. Install WSL2 if not already installed:
   ```powershell
   wsl --install
   ```

2. Install Redis in WSL:
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

3. Configure Redis to accept connections from Windows:
   Edit `/etc/redis/redis.conf`:
   ```
   bind 0.0.0.0
   protected-mode no
   ```

4. Restart Redis:
   ```bash
   sudo service redis-server restart
   ```

### Option 2: Using Memurai (Windows-native Redis)

1. Download Memurai from: https://www.memurai.com/
2. Install and start Memurai
3. It will run on port 6379 by default

### Option 3: Using Chocolatey

```powershell
choco install redis-64
```

## Configuration

Redis configuration is in `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Verify Redis Connection

After starting Redis, restart your backend server. You should see:

```
✅ Redis cache initialized
[Redis] ✅ Connected to Redis
```

Instead of:

```
⚠️  Redis not available, using in-memory cache fallback
```

## Troubleshooting

### Redis connection fails

1. **Check if Redis is running:**
   ```powershell
   # For Docker
   docker ps | findstr redis
   
   # For Windows service
   Get-Service | Where-Object {$_.Name -like "*redis*"}
   ```

2. **Check if port 6379 is in use:**
   ```powershell
   netstat -ano | findstr :6379
   ```

3. **Test Redis connection manually:**
   ```powershell
   # Docker
   docker exec -it buildflow-redis redis-cli ping
   
   # WSL
   wsl redis-cli ping
   ```

### Docker issues

- Ensure Docker Desktop is running
- Check Docker daemon status
- Try restarting Docker Desktop

## Redis Management Commands

### Stop Redis (Docker)
```powershell
docker stop buildflow-redis
```

### Start Redis (Docker)
```powershell
docker start buildflow-redis
```

### Remove Redis Container
```powershell
docker stop buildflow-redis
docker rm buildflow-redis
```

### View Redis Logs
```powershell
docker logs buildflow-redis
```

## Benefits of Using Redis

- **Performance**: Faster caching than in-memory
- **Persistence**: Data survives server restarts
- **Scalability**: Can be shared across multiple server instances
- **Advanced Features**: Pub/Sub, transactions, etc.
