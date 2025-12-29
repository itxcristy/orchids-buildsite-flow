#!/bin/bash
# Production Deployment Script for Drena
# Handles complete production deployment with multi-tenant database setup

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Drena - Production Deployment${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file with production values"
    exit 1
fi

# Check for critical environment variables
source .env 2>/dev/null || true

if [ -z "${POSTGRES_PASSWORD}" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD not set in .env${NC}"
    exit 1
fi

if [ -z "${VITE_JWT_SECRET}" ]; then
    echo -e "${RED}❌ VITE_JWT_SECRET not set in .env${NC}"
    exit 1
fi

if [ -z "${VITE_API_URL}" ]; then
    echo -e "${YELLOW}⚠️  VITE_API_URL not set, using default${NC}"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating data directories...${NC}"
mkdir -p data/postgres
mkdir -p data/storage
mkdir -p data/logs
mkdir -p database/backups
chmod 755 data/postgres data/storage data/logs database/backups

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down || true

# Remove old images (optional, uncomment if you want fresh builds)
# echo -e "${BLUE}🧹 Removing old images...${NC}"
# docker rmi drena-frontend:latest drena-backend:latest 2>/dev/null || true

# Build images
echo -e "${BLUE}🔨 Building production images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
echo -e "${BLUE}🚀 Starting production services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🏥 Checking service health...${NC}"
docker compose -f docker-compose.prod.yml ps

# Wait for backend to be ready
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -f http://localhost:${PORT:-3000}/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend health check failed${NC}"
        docker compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    sleep 2
done

# Wait for frontend to be ready
echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
for i in {1..30}; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend health check failed${NC}"
        docker compose -f docker-compose.prod.yml logs frontend
        exit 1
    fi
    sleep 2
done

# Show final status
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost${NC}"
echo -e "   Backend API: ${GREEN}http://localhost:${PORT:-3000}/api${NC}"
echo ""
echo -e "${BLUE}📝 View logs:${NC}"
echo -e "   ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo ""
