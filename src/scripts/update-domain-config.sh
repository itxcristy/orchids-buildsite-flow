#!/bin/bash

# ============================================================================
# Update Domain Configuration in Docker Compose
# ============================================================================
# This script updates environment variables for domain deployment

set -e

DOMAIN="dezignbuild.site"
SERVER_IP="72.61.243.152"

echo "=========================================="
echo "Updating Domain Configuration"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_info "docker-compose.yml not found in current directory"
    exit 1
fi

# Backup original file
cp docker-compose.yml docker-compose.yml.backup
print_success "Backup created: docker-compose.yml.backup"

# Update VITE_API_URL in docker-compose.yml
print_info "Updating VITE_API_URL to use domain..."
sed -i "s|VITE_API_URL: http://localhost:3000/api|VITE_API_URL: http://$DOMAIN:3000/api|g" docker-compose.yml
sed -i "s|VITE_API_URL: http://72.61.243.152:3000/api|VITE_API_URL: http://$DOMAIN:3000/api|g" docker-compose.yml

# CORS_ORIGINS should already include the domain (from previous update)
print_info "CORS_ORIGINS already includes domain"

print_success "Configuration updated!"
echo ""
echo "To apply changes, run:"
echo "  docker compose down"
echo "  docker compose up -d --build"

