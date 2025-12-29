#!/bin/bash

# ============================================================================
# Complete Domain Setup Script for dezignbuild.site
# ============================================================================
# This script does everything needed to set up the domain on the server
# Run this on your server: 72.61.243.152

set -e

DOMAIN="dezignbuild.site"
SERVER_IP="72.61.243.152"

echo "=========================================="
echo "Complete Domain Setup for $DOMAIN"
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Verify DNS (warn if not ready)
print_step "Step 1: Verifying DNS..."
CURRENT_IP=$(dig +short $DOMAIN 2>/dev/null | head -n1 || echo "")
if [ -z "$CURRENT_IP" ]; then
    print_info "DNS not resolving yet - this is OK if you just updated DNS"
    print_info "Continue anyway - DNS will propagate in 1-2 hours"
elif [ "$CURRENT_IP" != "$SERVER_IP" ]; then
    print_error "DNS points to $CURRENT_IP, should be $SERVER_IP"
    print_info "Update DNS A record in Hostinger first!"
    print_info "Then wait 1-2 hours and run this script again"
    exit 1
else
    print_success "DNS correctly points to $SERVER_IP"
fi

# Step 2: Install dependencies
print_step "Step 2: Installing dependencies..."
apt update -qq
apt install -y nginx curl dnsutils > /dev/null 2>&1
print_success "Dependencies installed"

# Step 3: Configure Nginx
print_step "Step 3: Configuring Nginx..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/fix-domain-dns.sh"
print_success "Nginx configured"

# Step 4: Update Docker Compose CORS
print_step "Step 4: Updating Docker configuration..."
PROJECT_DIR="/docker/buildflow"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    if [ -f "docker-compose.yml" ]; then
        # Update CORS if not already updated
        if ! grep -q "dezignbuild.site" docker-compose.yml; then
            sed -i "s|CORS_ORIGINS:.*|CORS_ORIGINS: http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://$SERVER_IP,http://$SERVER_IP:80,http://$SERVER_IP:3000,http://$DOMAIN,http://www.$DOMAIN,https://$DOMAIN,https://www.$DOMAIN|" docker-compose.yml
            print_success "Docker Compose updated"
        else
            print_success "Docker Compose already configured"
        fi
        
        # Restart containers
        print_info "Restarting Docker containers..."
        docker compose down > /dev/null 2>&1 || true
        docker compose up -d --build > /dev/null 2>&1 || true
        print_success "Docker containers restarted"
    fi
else
    print_info "Project directory not found at $PROJECT_DIR"
    print_info "Update docker-compose.yml manually if needed"
fi

# Step 5: Configure firewall
print_step "Step 5: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    print_success "Firewall configured"
else
    print_info "UFW not found - configure firewall manually"
fi

# Step 6: Test everything
print_step "Step 6: Testing configuration..."
echo ""

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80 | grep -q "200\|301\|302"; then
    print_success "Frontend responding"
else
    print_error "Frontend not responding"
fi

# Test backend
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health | grep -q "200"; then
    print_success "Backend responding"
else
    print_error "Backend not responding"
fi

# Test Nginx
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1 | grep -q "200\|301\|302"; then
    print_success "Nginx responding"
else
    print_error "Nginx not responding"
fi

# Summary
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Domain: $DOMAIN"
echo "Server IP: $SERVER_IP"
echo ""
echo "Next Steps:"
echo "1. Verify DNS A record in Hostinger points to $SERVER_IP"
echo "2. Wait 1-2 hours for DNS propagation"
echo "3. Test: curl http://$DOMAIN"
echo "4. Set up SSL: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
print_success "All done!"

