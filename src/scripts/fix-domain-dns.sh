#!/bin/bash

# ============================================================================
# Fix Domain DNS Configuration for dezignbuild.site
# ============================================================================
# This script configures the server to work with dezignbuild.site domain
# Run this on your server: 72.61.243.152

set -e

DOMAIN="dezignbuild.site"
SERVER_IP="72.61.243.152"
BACKEND_PORT="3000"
FRONTEND_PORT="80"

echo "=========================================="
echo "Domain DNS Fix Script for $DOMAIN"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Check current DNS resolution
echo "Step 1: Checking DNS resolution..."
CURRENT_IP=$(dig +short $DOMAIN | head -n1)
if [ -z "$CURRENT_IP" ]; then
    print_warning "DNS not resolving yet. This is normal if you just updated DNS records."
    print_info "Wait 1-2 hours for DNS propagation, then run this script again."
else
    if [ "$CURRENT_IP" = "$SERVER_IP" ]; then
        print_success "DNS is correctly pointing to $SERVER_IP"
    else
        print_error "DNS is pointing to $CURRENT_IP, should be $SERVER_IP"
        print_info "Please update DNS A record in Hostinger to point to $SERVER_IP"
        print_info "Then wait 1-2 hours for propagation and run this script again"
        exit 1
    fi
fi

# Step 2: Install Nginx if not installed
echo ""
echo "Step 2: Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt update
    apt install -y nginx
    print_success "Nginx installed"
else
    print_success "Nginx is already installed"
fi

# Step 3: Create Nginx configuration for domain
echo ""
echo "Step 3: Creating Nginx configuration..."
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
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
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
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
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

# Step 4: Enable the site
echo ""
echo "Step 4: Enabling Nginx site..."
if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    print_info "Site already enabled, removing old link..."
    rm "/etc/nginx/sites-enabled/$DOMAIN"
fi

ln -s "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
print_success "Site enabled"

# Step 5: Test Nginx configuration
echo ""
echo "Step 5: Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors. Please check $NGINX_CONFIG"
    exit 1
fi

# Step 6: Reload Nginx
echo ""
echo "Step 6: Reloading Nginx..."
systemctl reload nginx
print_success "Nginx reloaded"

# Step 7: Configure firewall
echo ""
echo "Step 7: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    print_success "Firewall configured"
else
    print_warning "UFW not found, please manually allow ports 80 and 443"
fi

# Step 8: Check Docker containers
echo ""
echo "Step 8: Checking Docker containers..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q frontend && docker ps | grep -q backend; then
        print_success "Docker containers are running"
    else
        print_warning "Some Docker containers may not be running"
        print_info "Run: docker ps"
    fi
else
    print_warning "Docker not found"
fi

# Step 9: Test connections
echo ""
echo "Step 9: Testing connections..."
echo ""

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$FRONTEND_PORT | grep -q "200\|301\|302"; then
    print_success "Frontend is responding on port $FRONTEND_PORT"
else
    print_error "Frontend is not responding on port $FRONTEND_PORT"
fi

# Test backend
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$BACKEND_PORT/health | grep -q "200"; then
    print_success "Backend is responding on port $BACKEND_PORT"
else
    print_error "Backend is not responding on port $BACKEND_PORT"
fi

# Test domain (if DNS is ready)
if [ "$CURRENT_IP" = "$SERVER_IP" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "Domain $DOMAIN is accessible"
    else
        print_warning "Domain $DOMAIN is not accessible yet (may need DNS propagation)"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Server IP: $SERVER_IP"
echo "Frontend Port: $FRONTEND_PORT"
echo "Backend Port: $BACKEND_PORT"
echo ""
echo "Next Steps:"
echo "1. Verify DNS A record in Hostinger points to $SERVER_IP"
echo "2. Wait 1-2 hours for DNS propagation"
echo "3. Test: curl http://$DOMAIN"
echo "4. Set up SSL: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
print_success "Configuration complete!"

