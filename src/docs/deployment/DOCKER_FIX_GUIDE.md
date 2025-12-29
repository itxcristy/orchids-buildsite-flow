# Docker Build Fix Guide

## Issues Fixed

### 1. Network Timeout Errors
- **Problem**: Docker Hub connection timeouts when pulling base images
- **Solution**: Added retry logic, increased timeouts, and better error handling

### 2. Build Performance
- **Problem**: Slow builds due to inefficient layer caching
- **Solution**: Optimized layer ordering, added build cache mounts, and improved .dockerignore

### 3. Reliability
- **Problem**: Builds failing without retry mechanisms
- **Solution**: Added automatic retry logic (5 attempts) for npm install operations

## Docker Daemon Configuration

### For Windows (Docker Desktop)

1. **Open Docker Desktop Settings**
   - Click the gear icon (⚙️) in Docker Desktop
   - Go to "Docker Engine"

2. **Add/Update Configuration**
   Add the following to your `daemon.json`:

```json
{
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5,
  "max-download-attempts": 5,
  "registry-mirrors": [],
  "insecure-registries": [],
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  }
}
```

3. **Network Settings** (if behind proxy/firewall)
   - Go to "Resources" → "Network"
   - Configure proxy if needed
   - Ensure DNS is set correctly (try 8.8.8.8, 8.8.4.4)

### For Linux

Edit `/etc/docker/daemon.json`:

```json
{
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5,
  "max-download-attempts": 5,
  "features": {
    "buildkit": true
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  }
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

## Build Commands

### Standard Build (with retry)
```powershell
# Windows PowerShell
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up
```

### Build with Progress Output
```powershell
docker compose -f docker-compose.dev.yml build --progress=plain
```

### Pull Images First (if network issues persist)
```powershell
# Pull base images manually first
docker pull node:20-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Then build
docker compose -f docker-compose.dev.yml up --build
```

### Build with BuildKit (recommended)
```powershell
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1
docker compose -f docker-compose.dev.yml build
```

## Troubleshooting

### Issue: Still Getting Timeout Errors

1. **Check Internet Connection**
   ```powershell
   Test-NetConnection registry-1.docker.io -Port 443
   ```

2. **Try Alternative Registry Mirror** (if available)
   - Update `NPM_REGISTRY` in docker-compose.dev.yml
   - Or use a local npm registry

3. **Increase Docker Resources**
   - Docker Desktop → Settings → Resources
   - Increase Memory to at least 4GB
   - Increase CPUs to at least 2

4. **Clear Docker Cache**
   ```powershell
   docker system prune -a --volumes
   ```

5. **Use VPN/Proxy** (if behind corporate firewall)
   - Configure Docker Desktop proxy settings
   - Or use `HTTP_PROXY` and `HTTPS_PROXY` environment variables

### Issue: Build Still Failing

1. **Check Docker Logs**
   ```powershell
   docker compose -f docker-compose.dev.yml logs backend
   docker compose -f docker-compose.dev.yml logs frontend
   ```

2. **Verify Dockerfile Syntax**
   ```powershell
   docker buildx build --dry-run -f Dockerfile.dev .
   ```

3. **Test Individual Services**
   ```powershell
   # Build only backend
   docker compose -f docker-compose.dev.yml build backend
   
   # Build only frontend
   docker compose -f docker-compose.dev.yml build frontend
   ```

### Issue: Slow Builds

1. **Enable BuildKit** (already enabled in Dockerfiles)
   ```powershell
   $env:DOCKER_BUILDKIT=1
   ```

2. **Use Build Cache**
   - Don't use `--no-cache` unless necessary
   - Keep Docker volumes for node_modules

3. **Check .dockerignore**
   - Ensure unnecessary files are excluded
   - Smaller build context = faster builds

## Performance Optimizations Applied

1. **Layer Caching**
   - Package files copied first
   - Dependencies installed in separate layer
   - Source files copied last

2. **Build Cache Mounts**
   - npm cache mounted as volume
   - Persists between builds

3. **Multi-stage Optimization**
   - Minimal base images (alpine)
   - Only necessary files copied

4. **Health Checks**
   - Added to all services
   - Ensures containers are ready before use

5. **Retry Logic**
   - 5 automatic retries for npm install
   - Exponential backoff for network operations

## Quick Start (After Fixes)

```powershell
# 1. Ensure Docker Desktop is running
# 2. Enable BuildKit
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# 3. Build and start
docker compose -f docker-compose.dev.yml up --build

# 4. Check health
docker compose -f docker-compose.dev.yml ps
```

## Verification

After building, verify all services are healthy:

```powershell
# Check service status
docker compose -f docker-compose.dev.yml ps

# Check logs
docker compose -f docker-compose.dev.yml logs -f

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:5173
```

## Additional Resources

- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [Docker Compose Best Practices](https://docs.docker.com/compose/best-practices/)
- [Troubleshooting Docker Desktop](https://docs.docker.com/desktop/troubleshoot/)

