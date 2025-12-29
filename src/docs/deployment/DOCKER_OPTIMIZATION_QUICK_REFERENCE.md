# Docker Optimization Quick Reference

## 🚀 Quick Implementation Guide

### Step 1: Enable BuildKit (One-time setup)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell profile):
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

Or set in `docker-compose.yml`:
```yaml
x-build-args: &build-args
  BUILDKIT_INLINE_CACHE: 1
```

---

## 📋 File-by-File Changes

### 1. Frontend Production Dockerfile (`Dockerfile`)

**Key Changes:**
- ✅ Better layer caching (package.json copied first)
- ✅ Build cache mounts for npm
- ✅ Only copy necessary source files
- ✅ Non-root user for security
- ✅ Healthcheck added

**Replace with:** `Dockerfile.optimized`

---

### 2. Backend Production Dockerfile (`server/Dockerfile`)

**Key Changes:**
- ✅ Proper multi-stage build (only copy runtime files)
- ✅ Build cache mounts
- ✅ Exclude dev dependencies from final image
- ✅ Copy specific directories instead of entire app

**Replace with:** `server/Dockerfile.optimized`

---

### 3. Frontend Dev Dockerfile (`Dockerfile.dev`)

**Key Changes:**
- ✅ Use `npm ci` instead of `npm install`
- ✅ Build cache mounts
- ✅ Copy source files (works standalone)

**Replace with:** `Dockerfile.dev.optimized`

---

### 4. Backend Dev Dockerfile (`server/Dockerfile.dev`)

**Key Changes:**
- ✅ Use `npm ci` instead of `npm install`
- ✅ Use npm script instead of global nodemon
- ✅ Build cache mounts
- ✅ Copy source files (works standalone)

**Replace with:** `server/Dockerfile.dev.optimized`

---

### 5. .dockerignore Files

**Key Changes:**
- ✅ More comprehensive exclusions
- ✅ Better organized sections
- ✅ Excludes CI/CD files, IDE files, etc.

**Replace with:** `.dockerignore.optimized` and `server/.dockerignore.optimized`

---

## 🔧 docker-compose.yml Updates

### Add to Frontend Service:

```yaml
frontend:
  # ... existing config
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### Fix Redis Healthcheck:

```yaml
redis:
  # ... existing config
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    # OR if password: test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
```

### Optimize Dev Volume Mounts:

```yaml
frontend:
  volumes:
    - ./:/app
    - /app/node_modules  # Anonymous volume
    - /app/dist          # Anonymous volume
```

---

## 📊 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Frontend Build Time** (rebuild) | ~90s | ~30s | **67% faster** |
| **Backend Build Time** (rebuild) | ~60s | ~20s | **67% faster** |
| **Frontend Image Size** | ~150MB | ~90MB | **40% smaller** |
| **Backend Image Size** | ~120MB | ~70MB | **42% smaller** |
| **npm install time** (after first build) | ~30s | ~5s | **83% faster** |

---

## ✅ Testing Checklist

After implementing changes:

- [ ] Build frontend: `docker build -t frontend-test -f Dockerfile.optimized .`
- [ ] Build backend: `docker build -t backend-test -f server/Dockerfile.optimized ./server`
- [ ] Test dev compose: `docker-compose -f docker-compose.dev.yml up --build`
- [ ] Test prod compose: `docker-compose -f docker-compose.prod.yml up --build`
- [ ] Verify healthchecks work
- [ ] Verify non-root users work
- [ ] Check image sizes: `docker images`
- [ ] Test rebuild speed (change a file, rebuild)

---

## 🎯 Priority Order

1. **High Impact, Low Effort:**
   - Add build cache mounts (5 min)
   - Update .dockerignore (5 min)
   - Fix layer caching in Dockerfiles (10 min)

2. **High Impact, Medium Effort:**
   - Fix multi-stage backend build (15 min)
   - Add healthchecks (5 min)
   - Optimize volume mounts (5 min)

3. **Medium Impact, Low Effort:**
   - Add non-root user to frontend (5 min)
   - Fix Redis healthcheck (1 min)
   - Add build args (5 min)

---

## 🔍 Verification Commands

```bash
# Check image sizes
docker images | grep buildflow

# Check build cache usage
docker system df -v

# Test build time
time docker build -t test -f Dockerfile.optimized .

# Check layer count (fewer is better)
docker history image:tag

# Verify non-root user
docker run --rm image:tag id
```

---

## 📝 Migration Steps

1. **Backup current files:**
   ```bash
   cp Dockerfile Dockerfile.backup
   cp server/Dockerfile server/Dockerfile.backup
   ```

2. **Replace with optimized versions:**
   ```bash
   cp Dockerfile.optimized Dockerfile
   cp server/Dockerfile.optimized server/Dockerfile
   cp Dockerfile.dev.optimized Dockerfile.dev
   cp server/Dockerfile.dev.optimized server/Dockerfile.dev
   cp .dockerignore.optimized .dockerignore
   cp server/.dockerignore.optimized server/.dockerignore
   ```

3. **Update docker-compose files** (add healthchecks, fix Redis)

4. **Test builds**

5. **Deploy and monitor**

---

## 🚨 Common Issues & Fixes

### Issue: Build fails with "cache mount not supported"
**Fix:** Enable BuildKit: `export DOCKER_BUILDKIT=1`

### Issue: npm ci fails
**Fix:** Ensure `package-lock.json` exists and is committed

### Issue: Container runs as wrong user
**Fix:** Check USER directive in Dockerfile

### Issue: Healthcheck fails
**Fix:** Verify endpoint exists and is accessible

### Issue: Volume mounts not working in dev
**Fix:** Check volume syntax and paths in docker-compose

---

## 📚 Additional Resources

- Full review: `DOCKER_OPTIMIZATION_REVIEW.md`
- Docker best practices: https://docs.docker.com/develop/dev-best-practices/
- BuildKit docs: https://docs.docker.com/build/buildkit/
