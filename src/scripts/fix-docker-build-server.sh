#!/bin/bash

# ============================================================================
# Docker Build Fix Script for Server
# ============================================================================
# Run this on your server to diagnose and fix Docker build issues

set -e

echo "=========================================="
echo "Docker Build Fix Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_step() { echo -e "${BLUE}→ $1${NC}"; }

# Step 1: Enable BuildKit
print_step "Step 1: Enabling BuildKit..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
print_success "BuildKit enabled"

# Add to bashrc for permanent
if ! grep -q "DOCKER_BUILDKIT=1" ~/.bashrc 2>/dev/null; then
    echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
    echo 'export COMPOSE_DOCKER_CLI_BUILD=1' >> ~/.bashrc
    print_success "Added to ~/.bashrc"
fi

# Step 2: Find project directory
print_step "Step 2: Finding project directory..."
POSSIBLE_DIRS=(
    "/docker/buildflow"
    "/opt/buildflow"
    "/root/buildflow"
    "/var/www/buildflow"
    "$(pwd)"
)

PROJECT_DIR=""
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
        PROJECT_DIR="$dir"
        print_success "Found project at: $PROJECT_DIR"
        break
    fi
done

if [ -z "$PROJECT_DIR" ]; then
    print_error "Could not find project directory"
    print_info "Please navigate to your project directory first"
    print_info "Or set PROJECT_DIR environment variable"
    exit 1
fi

cd "$PROJECT_DIR"
print_info "Working directory: $(pwd)"

# Step 3: Check required files
print_step "Step 3: Checking required files..."
MISSING_FILES=0

# Frontend files
[ ! -f "package.json" ] && print_error "Missing: package.json" && MISSING_FILES=1
[ ! -f "vite.config.ts" ] && print_error "Missing: vite.config.ts" && MISSING_FILES=1
[ ! -f "nginx.conf" ] && print_error "Missing: nginx.conf" && MISSING_FILES=1
[ ! -d "src" ] && print_error "Missing: src/" && MISSING_FILES=1
[ ! -d "public" ] && print_error "Missing: public/" && MISSING_FILES=1

# Backend files
[ ! -f "server/package.json" ] && print_error "Missing: server/package.json" && MISSING_FILES=1
[ ! -f "server/index.js" ] && print_error "Missing: server/index.js" && MISSING_FILES=1

if [ $MISSING_FILES -eq 1 ]; then
    print_error "Missing required files. Please upload them first."
    exit 1
fi

print_success "All required files present"

# Step 4: Check Docker resources
print_step "Step 4: Checking Docker resources..."
DISK_SPACE=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')
print_info "Available disk space: $DISK_SPACE"

MEMORY=$(free -h | grep Mem | awk '{print $7}')
print_info "Available memory: $MEMORY"

# Step 5: Clean up Docker
print_step "Step 5: Cleaning up Docker..."
docker system prune -f > /dev/null 2>&1
print_success "Docker cleaned"

# Step 6: Set build arguments
print_step "Step 6: Setting build arguments..."
export VITE_API_URL="${VITE_API_URL:-http://72.61.243.152:3000/api}"
export VITE_APP_NAME="${VITE_APP_NAME:-BuildFlow Agency Management}"
export VITE_APP_VERSION="${VITE_APP_VERSION:-1.0.0}"
export VITE_APP_ENVIRONMENT="${VITE_APP_ENVIRONMENT:-production}"

print_info "VITE_API_URL: $VITE_API_URL"
print_info "VITE_APP_NAME: $VITE_APP_NAME"

# Step 7: Test npm connectivity
print_step "Step 7: Testing npm connectivity..."
if npm config get registry > /dev/null 2>&1; then
    REGISTRY=$(npm config get registry)
    print_info "NPM registry: $REGISTRY"
    
    if curl -s --connect-timeout 5 "$REGISTRY" > /dev/null 2>&1; then
        print_success "NPM registry is reachable"
    else
        print_error "NPM registry is not reachable"
        print_info "Trying alternative registry..."
        npm config set registry https://registry.npmjs.org/
    fi
else
    print_info "Setting default npm registry..."
    npm config set registry https://registry.npmjs.org/
fi

# Step 8: Build with verbose output
print_step "Step 8: Building Docker images..."
echo ""
print_info "This may take several minutes..."
echo ""

# Build with progress output
if DOCKER_BUILDKIT=1 docker compose build --progress=plain 2>&1 | tee /tmp/docker-build.log; then
    print_success "Build completed successfully!"
else
    print_error "Build failed!"
    echo ""
    print_info "Last 50 lines of build log:"
    tail -50 /tmp/docker-build.log
    echo ""
    print_info "Full log saved to: /tmp/docker-build.log"
    print_info "Common issues:"
    print_info "  1. Missing files - check file paths"
    print_info "  2. Network issues - check npm registry connectivity"
    print_info "  3. Insufficient resources - check disk space and memory"
    print_info "  4. BuildKit not enabled - ensure DOCKER_BUILDKIT=1"
    exit 1
fi

# Step 9: Verify images
print_step "Step 9: Verifying images..."
if docker images | grep -q "dezign-frontend"; then
    print_success "Frontend image created"
else
    print_error "Frontend image not found"
fi

if docker images | grep -q "dezign-backend"; then
    print_success "Backend image created"
else
    print_error "Backend image not found"
fi

# Summary
echo ""
echo "=========================================="
echo "Build Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start services: docker compose up -d"
echo "2. Check logs: docker compose logs -f"
echo "3. Verify health: docker compose ps"
echo ""
print_success "All done!"

