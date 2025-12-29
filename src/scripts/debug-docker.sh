#!/bin/bash
# Docker Debug Script for VPS
# Run this to see what's failing

set -e

echo "=========================================="
echo "🔍 Docker Debug Report - Drena VPS"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml not found${NC}"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo -e "${BLUE}📊 Container Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Check for failed containers
FAILED=$(docker compose -f docker-compose.prod.yml ps | grep -i "exited\|restarting" || true)
if [ ! -z "$FAILED" ]; then
    echo -e "${RED}⚠️  Failed/Restarting Containers Found:${NC}"
    echo "$FAILED"
    echo ""
fi

echo -e "${BLUE}💾 Disk Space:${NC}"
df -h | head -2
echo ""

echo -e "${BLUE}🐳 Docker Disk Usage:${NC}"
docker system df
echo ""

echo -e "${BLUE}📝 Recent Logs (last 30 lines per service):${NC}"
echo ""
for service in backend frontend postgres redis; do
    echo -e "${YELLOW}--- $service logs ---${NC}"
    docker compose -f docker-compose.prod.yml logs --tail 30 $service 2>&1 | tail -10
    echo ""
done

echo -e "${BLUE}🏥 Health Checks:${NC}"
echo -n "Backend (http://localhost:3000/health): "
if curl -s -f -m 5 http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "   Trying to get error..."
    curl -s -m 5 http://localhost:3000/health || echo "   Connection refused"
fi

echo -n "Frontend (http://localhost/): "
if curl -s -f -m 5 http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Database (pg_isready): "
if docker exec drena-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Redis: "
if docker exec drena-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi
echo ""

echo -e "${BLUE}🔌 Port Status:${NC}"
netstat -tulpn 2>/dev/null | grep -E '3000|5432|6379|80' || echo "No ports found (or netstat not available)"
echo ""

echo -e "${BLUE}📦 Container Resource Usage:${NC}"
docker stats --no-stream 2>/dev/null || echo "Stats not available"
echo ""

echo -e "${BLUE}🔍 Container Details (Exited containers):${NC}"
EXITED=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep -E "drena|buildflow" || true)
if [ ! -z "$EXITED" ]; then
    for container in $EXITED; do
        echo -e "${YELLOW}--- $container ---${NC}"
        EXIT_CODE=$(docker inspect $container --format='{{.State.ExitCode}}' 2>/dev/null || echo "unknown")
        echo "  Exit Code: $EXIT_CODE"
        echo "  Last 10 log lines:"
        docker logs --tail 10 $container 2>&1 | sed 's/^/    /'
        echo ""
    done
else
    echo "No exited containers found"
fi
echo ""

echo -e "${BLUE}📋 Environment Check:${NC}"
echo -n "Docker version: "
docker --version 2>/dev/null || echo "Not found"
echo -n "Docker Compose version: "
docker compose version 2>/dev/null || echo "Not found"
echo -n ".env file exists: "
[ -f .env ] && echo -e "${GREEN}✅ Yes${NC}" || echo -e "${RED}❌ No${NC}"
echo ""

echo -e "${GREEN}=========================================="
echo "✅ Debug Report Complete"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check the logs above for errors"
echo "2. If a container is exited, check its exit code and logs"
echo "3. Verify .env file has correct values"
echo "4. Check disk space and Docker resources"
echo ""
echo "View full logs: docker compose -f docker-compose.prod.yml logs -f"
echo "Restart: docker compose -f docker-compose.prod.yml restart <service>"

