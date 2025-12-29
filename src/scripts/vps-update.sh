#!/bin/bash
# VPS Update Script for Drena
# Run this script on your VPS to update Docker containers

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Drena VPS Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get project directory (default to current directory)
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

echo -e "${BLUE}📁 Project directory: ${PROJECT_DIR}${NC}"
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml not found in ${PROJECT_DIR}${NC}"
    exit 1
fi

# Step 1: Pull latest code (if git repo)
if [ -d ".git" ]; then
    echo -e "${BLUE}📥 Pulling latest code from git...${NC}"
    git pull || echo -e "${YELLOW}⚠️  Git pull failed, continuing anyway...${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Not a git repository, skipping git pull${NC}"
    echo ""
fi

# Step 2: Backup current status
echo -e "${BLUE}💾 Creating backup...${NC}"
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose -f docker-compose.prod.yml ps > "$BACKUP_DIR/containers-status.txt" 2>&1 || true
docker compose -f docker-compose.prod.yml config > "$BACKUP_DIR/config.txt" 2>&1 || true
echo -e "${GREEN}✅ Backup created in ${BACKUP_DIR}${NC}"
echo ""

# Step 3: Stop containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Step 4: Rebuild images
echo -e "${BLUE}🔨 Rebuilding Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✅ Images rebuilt${NC}"
echo ""

# Step 5: Start containers
echo -e "${BLUE}🚀 Starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Containers started${NC}"
echo ""

# Step 6: Wait for services
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 15
echo ""

# Step 7: Check status
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Step 8: Health checks
echo -e "${BLUE}🏥 Running health checks...${NC}"

# Backend health
echo -n "Backend (http://localhost:3000/health): "
if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Frontend health
echo -n "Frontend (http://localhost/health): "
if curl -s -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Database check
echo -n "Database: "
if docker exec drena-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""

# Step 9: Show recent logs
echo -e "${BLUE}📝 Recent logs (last 20 lines):${NC}"
docker compose -f docker-compose.prod.yml logs --tail 20
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs: ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Check status: ${YELLOW}docker compose -f docker-compose.prod.yml ps${NC}"
echo -e "  Restart service: ${YELLOW}docker compose -f docker-compose.prod.yml restart <service>${NC}"
echo ""

