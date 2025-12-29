#!/bin/bash

# ============================================================================
# Complete Domain Setup Script for dezignbuild.site
# ============================================================================
# Run this directly on the server - it will find your project and configure everything

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

# Find project directory
print_step "Finding project directory..."
POSSIBLE_DIRS=(
    "/docker/buildflow"
    "/opt/buildflow"
    "/root/buildflow"
    "/var/www/buildflow"
    "/home/buildflow"
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
    print_error "Could not find project directory with docker-compose.yml"
    print_info "Please navigate to your project directory first"
    print_info "Or specify the path: PROJECT_DIR=/path/to/project bash $0"
    exit 1
fi

cd "$PROJECT_DIR"
print_info "Working directory: $(pwd)"

# Step 1: Verify DNS (warn if not ready)
print_step "Step 1: Verifying DNS..."
CURRENT_IP=$(dig +short $DOMAIN 2>/dev/null | head -n1 || echo "")
if [ -z "$CURRENT_IP" ]; then
    print_info "DNS not resolving yet - this is OK if you just updated DNS"
    print_info "Continue anyway - DNS will propagate in 1-2 hours"
elif [ "$CURRENT_IP" != "$SERVER_IP" ]; then
    print_error "DNS points to $CURRENT_IP, should be $SERVER_IP"
    print_info "Update DNS A record in Namecheap first!"
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
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

cat > "$NGINX_CONFIG" <<EOF
# Frontend - Main Domain
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (Docker container on port 80)
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

print_success "Nginx configuration created at $NGINX_CONFIG"

# Enable the site
if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    rm "/etc/nginx/sites-enabled/$DOMAIN"
fi
ln -s "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
print_success "Site enabled"

# Test Nginx configuration
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    exit 1
fi

# Reload Nginx
systemctl reload nginx
print_success "Nginx reloaded"

# Step 4: Update Docker Compose CORS
print_step "Step 4: Updating Docker configuration..."
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
else
    print_info "docker-compose.yml not found - skipping Docker update"
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
echo "Project Directory: $PROJECT_DIR"
echo ""
echo "Next Steps:"
echo "1. Wait for DNS propagation (if not done): 1-2 hours"
echo "2. Test: curl http://$DOMAIN"
echo "3. Set up SSL: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
print_success "All done!"

