# 🚨 Docker Debug Cheat Sheet - VPS

## ⚡ Quick Commands (Copy & Paste)

### See What's Failing
```bash
docker compose -f docker-compose.prod.yml ps
```

### See Error Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Follow logs (real-time)
docker compose -f docker-compose.prod.yml logs -f
```

### Check Exit Code (Why Container Stopped)
```bash
docker inspect <container-name> | grep ExitCode
# 0 = Success, 1+ = Error
```

### Check Container Health
```bash
docker inspect <container-name> | grep -A 10 Health
```

### Test Services
```bash
# Backend
curl http://localhost:3000/health

# Database
docker exec drena-postgres pg_isready -U postgres

# Redis
docker exec drena-redis redis-cli ping
```

### Restart Everything
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

## 🔍 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `connection refused` | Database not ready - wait or check postgres logs |
| `port already in use` | `netstat -tulpn \| grep 3000` - kill process or change port |
| `file not found` | Check volume mounts in docker-compose.prod.yml |
| `permission denied` | Check file permissions: `ls -la /path/to/file` |
| Container keeps restarting | Check logs: `docker logs <container>` |
| Out of memory | `df -h` and `docker system prune -f` |

## 📋 Debug Script

Run this to see everything:
```bash
cd /root/buildsite-flow
chmod +x scripts/debug-docker.sh
./scripts/debug-docker.sh
```

## 🆘 Emergency

If nothing works:
```bash
docker compose -f docker-compose.prod.yml down
docker system prune -f
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

---

**Always check logs first!** `docker compose -f docker-compose.prod.yml logs -f`

