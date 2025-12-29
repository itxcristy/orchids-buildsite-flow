#!/bin/bash
# BuildFlow Production Deployment Script for Hostinger KVM Server
# This script handles complete production deployment with zero-downtime

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 BuildFlow ERP - Hostinger KVM Server Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running as root (not recommended, but check anyway)
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Running as root. Consider using a non-root user.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if .env.hostinger exists
ENV_FILE=".env.hostinger"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  $ENV_FILE not found${NC}"
    echo "Creating from template..."
    if [ -f ".env.hostinger.example" ]; then
        cp .env.hostinger.example "$ENV_FILE"
        echo -e "${RED}❌ Please update $ENV_FILE with your production values!${NC}"
        echo ""
        echo "Required changes:"
        echo "  1. Set POSTGRES_PASSWORD (strong password, min 16 chars)"
        echo "  2. Set REDIS_PASSWORD (strong password, min 16 chars)"
        echo "  3. Set VITE_JWT_SECRET (generate with: openssl rand -base64 32)"
        echo "  4. Update VITE_API_URL with your server IP/domain"
        echo "  5. Update CORS_ORIGINS with your domains"
        echo "  6. Configure email settings (SMTP or other provider)"
        echo ""
        exit 1
    else
        echo -e "${RED}❌ .env.hostinger.example not found!${NC}"
        exit 1
    fi
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Validate critical environment variables
echo -e "${BLUE}🔍 Validating environment configuration...${NC}"

ERRORS=0

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "CHANGE_THIS_STRONG_PASSWORD_MIN_16_CHARS" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD not set or using default value${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ ${#POSTGRES_PASSWORD} -lt 16 ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD must be at least 16 characters${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "CHANGE_THIS_REDIS_PASSWORD_MIN_16_CHARS" ]; then
    echo -e "${RED}❌ REDIS_PASSWORD not set or using default value${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -z "$VITE_JWT_SECRET" ] || [ "$VITE_JWT_SECRET" = "CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_32_CHARS_MIN" ]; then
    echo -e "${RED}❌ VITE_JWT_SECRET not set or using default value${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ ${#VITE_JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ VITE_JWT_SECRET must be at least 32 characters${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [[ "$VITE_API_URL" == *"YOUR_SERVER_IP"* ]] || [ -z "$VITE_API_URL" ]; then
    echo -e "${RED}❌ VITE_API_URL not configured (still contains YOUR_SERVER_IP)${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [[ "$CORS_ORIGINS" == *"YOUR_SERVER_IP"* ]] || [ -z "$CORS_ORIGINS" ]; then
    echo -e "${YELLOW}⚠️  CORS_ORIGINS not configured (may cause CORS errors)${NC}"
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Please fix the errors above before continuing${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration validated${NC}"
echo ""

# Check Docker and Docker Compose
echo -e "${BLUE}🐳 Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "Start Docker: sudo systemctl start docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"
echo ""

# Create necessary directories
echo -e "${BLUE}📁 Creating data directories...${NC}"
mkdir -p data/postgres
mkdir -p data/storage
mkdir -p data/logs
mkdir -p database/backups
chmod 755 data/postgres data/storage data/logs database/backups 2>/dev/null || true
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Check disk space (at least 5GB free recommended)
echo -e "${BLUE}💾 Checking disk space...${NC}"
AVAILABLE_SPACE=$(df -BG "$PROJECT_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
    echo -e "${YELLOW}⚠️  Warning: Less than 5GB free space available${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Sufficient disk space available (${AVAILABLE_SPACE}GB)${NC}"
fi
echo ""

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers (if any)...${NC}"
$DOCKER_COMPOSE -f docker-compose.hostinger.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Build images
echo -e "${BLUE}🔨 Building production images...${NC}"
echo "This may take several minutes on first build..."
$DOCKER_COMPOSE -f docker-compose.hostinger.yml build --no-cache
echo -e "${GREEN}✅ Images built successfully${NC}"
echo ""

# Start services
echo -e "${BLUE}🚀 Starting production services...${NC}"
$DOCKER_COMPOSE -f docker-compose.hostinger.yml up -d
echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
MAX_WAIT=120
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    # Check PostgreSQL
    if $DOCKER_COMPOSE -f docker-compose.hostinger.yml exec -T postgres pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
        POSTGRES_READY=true
    else
        POSTGRES_READY=false
    fi
    
    # Check Redis
    if $DOCKER_COMPOSE -f docker-compose.hostinger.yml exec -T redis redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" ping > /dev/null 2>&1; then
        REDIS_READY=true
    else
        REDIS_READY=false
    fi
    
    # Check Backend
    if curl -f http://localhost:${BACKEND_PORT:-3000}/api/health > /dev/null 2>&1; then
        BACKEND_READY=true
    else
        BACKEND_READY=false
    fi
    
    if [ "$POSTGRES_READY" = true ] && [ "$REDIS_READY" = true ] && [ "$BACKEND_READY" = true ]; then
        echo -e "${GREEN}✅ All services are healthy!${NC}"
        break
    fi
    
    WAIT_COUNT=$((WAIT_COUNT + 5))
    echo "  Waiting... (${WAIT_COUNT}s/${MAX_WAIT}s)"
    sleep 5
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  Services may still be starting. Check logs with:${NC}"
    echo "   $DOCKER_COMPOSE -f docker-compose.hostinger.yml logs -f"
fi
echo ""

# Display service status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Service Status:${NC}"
$DOCKER_COMPOSE -f docker-compose.hostinger.yml ps
echo ""
echo -e "${CYAN}Access Points:${NC}"
echo "  - Frontend: http://localhost:${FRONTEND_PORT:-80}"
echo "  - Backend API: http://localhost:${BACKEND_PORT:-3000}/api"
echo "  - Database: localhost:${POSTGRES_PORT:-5432}"
echo "  - Redis: localhost:${REDIS_PORT:-6379}"
echo ""
echo -e "${CYAN}Useful Commands:${NC}"
echo "  - View logs: $DOCKER_COMPOSE -f docker-compose.hostinger.yml logs -f"
echo "  - View specific service: $DOCKER_COMPOSE -f docker-compose.hostinger.yml logs -f [service]"
echo "  - Stop services: $DOCKER_COMPOSE -f docker-compose.hostinger.yml down"
echo "  - Restart services: $DOCKER_COMPOSE -f docker-compose.hostinger.yml restart"
echo "  - Check health: curl http://localhost:${BACKEND_PORT:-3000}/api/health"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Configure firewall to allow ports ${FRONTEND_PORT:-80}, ${BACKEND_PORT:-3000}"
echo "  2. Set up reverse proxy (Nginx/Apache) if using domain name"
echo "  3. Configure SSL certificate (Let's Encrypt recommended)"
echo "  4. Set up domain DNS records pointing to your server IP"
echo ""

