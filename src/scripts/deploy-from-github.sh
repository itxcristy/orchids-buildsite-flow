#!/bin/bash
# Deploy Drena ERP from GitHub to VPS
# Run this on your VPS

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Drena ERP Deployment from GitHub${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
PROJECT_DIR="/root/buildsite-flow"
GITHUB_REPO="https://github.com/eddy7896/buildsite-flow.git"
BRANCH="main"

# Check if project directory exists
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📁 Project directory exists, updating from GitHub...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if it's a git repo
    if [ -d ".git" ]; then
        echo -e "${BLUE}📥 Pulling latest changes from GitHub...${NC}"
        git stash || true  # Save local changes
        git pull origin $BRANCH
        git stash pop || true  # Restore local changes
    else
        echo -e "${RED}❌ Directory exists but not a git repository${NC}"
        echo -e "${YELLOW}Removing and cloning fresh...${NC}"
        cd /root
        rm -rf "$PROJECT_DIR"
        git clone -b $BRANCH "$GITHUB_REPO" "$PROJECT_DIR"
    fi
else
    echo -e "${BLUE}📥 Cloning repository from GitHub...${NC}"
    cd /root
    git clone -b $BRANCH "$GITHUB_REPO" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

echo -e "${GREEN}✅ Code updated from GitHub${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating from template...${NC}"
    if [ -f ".env.production" ]; then
        cp .env.production .env
        echo -e "${GREEN}✅ Created .env from .env.production${NC}"
    else
        echo -e "${RED}❌ No .env.production found. Please create .env manually${NC}"
        echo "Required variables:"
        echo "  - POSTGRES_PASSWORD"
        echo "  - VITE_JWT_SECRET"
        echo "  - VITE_API_URL"
        echo "  - FRONTEND_URL"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

echo ""
echo -e "${BLUE}🐳 Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down || true

echo ""
echo -e "${BLUE}🔨 Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo -e "${BLUE}🚀 Starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 15

echo ""
echo -e "${BLUE}📊 Container Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${BLUE}🏥 Health Checks:${NC}"
echo -n "Backend: "
if curl -s -f -m 5 http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Frontend: "
if curl -s -f -m 5 http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Database: "
if docker exec drena-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${BLUE}Check status:${NC}"
echo "  docker compose -f docker-compose.prod.yml ps"
echo ""
echo -e "${BLUE}Access application:${NC}"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
echo "  Backend: http://$(hostname -I | awk '{print $1}'):3000"
echo ""

