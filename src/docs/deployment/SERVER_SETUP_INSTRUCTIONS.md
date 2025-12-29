# Server Setup Instructions - Quick Guide

## 🚨 Script Not Found? Here's What to Do

If you get `No such file or directory`, follow these steps:

---

## Option 1: Find Your Project Directory

The script needs to find your project. Try these commands:

```bash
# Check current directory
pwd

# Look for docker-compose.yml
find / -name "docker-compose.yml" 2>/dev/null | head -5

# Common locations to check
ls -la /docker/buildflow
ls -la /opt/buildflow
ls -la /root/buildflow
ls -la ~/buildflow
```

Once you find it, navigate there:
```bash
cd /path/to/your/project
```

---

## Option 2: Create Script Directly on Server

Copy and paste this entire script into your server:

```bash
# Create the script
cat > /tmp/setup-domain.sh << 'SCRIPT_END'
#!/bin/bash
# Complete Domain Setup Script
set -e

DOMAIN="dezignbuild.site"
SERVER_IP="72.61.243.152"

echo "=========================================="
echo "Complete Domain Setup for $DOMAIN"
echo "=========================================="

# Find project directory
POSSIBLE_DIRS=("/docker/buildflow" "/opt/buildflow" "/root/buildflow" "/var/www/buildflow" "$(pwd)")
PROJECT_DIR=""
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
        PROJECT_DIR="$dir"
        echo "Found project at: $PROJECT_DIR"
        break
    fi
done

if [ -z "$PROJECT_DIR" ]; then
    echo "ERROR: Could not find project directory"
    echo "Please navigate to your project directory first:"
    echo "  cd /path/to/your/project"
    exit 1
fi

cd "$PROJECT_DIR"
echo "Working in: $(pwd)"

# Install dependencies
echo "Installing dependencies..."
apt update -qq
apt install -y nginx curl dnsutils > /dev/null 2>&1

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Update Docker Compose
if [ -f "docker-compose.yml" ]; then
    echo "Updating Docker Compose..."
    sed -i "s|CORS_ORIGINS:.*|CORS_ORIGINS: http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://$SERVER_IP,http://$SERVER_IP:80,http://$SERVER_IP:3000,http://$DOMAIN,http://www.$DOMAIN,https://$DOMAIN,https://www.$DOMAIN|" docker-compose.yml
    
    echo "Restarting containers..."
    docker compose down > /dev/null 2>&1 || true
    docker compose up -d > /dev/null 2>&1 || true
fi

# Configure firewall
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo "Test: curl http://$DOMAIN"
SCRIPT_END

# Make executable and run
chmod +x /tmp/setup-domain.sh
/tmp/setup-domain.sh
```

---

## Option 3: Manual Setup (Step by Step)

If scripts don't work, do it manually:

### Step 1: Find Your Project

```bash
# Find docker-compose.yml
find / -name "docker-compose.yml" 2>/dev/null

# Navigate to that directory
cd /path/found/above
```

### Step 2: Install Nginx

```bash
apt update
apt install -y nginx
```

### Step 3: Create Nginx Config

```bash
cat > /etc/nginx/sites-available/dezignbuild.site <<EOF
server {
    listen 80;
    server_name dezignbuild.site www.dezignbuild.site;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
```

### Step 4: Enable Site

```bash
ln -s /etc/nginx/sites-available/dezignbuild.site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 5: Update Docker Compose

```bash
# Navigate to your project
cd /path/to/your/project

# Update CORS_ORIGINS in docker-compose.yml
nano docker-compose.yml
# Find CORS_ORIGINS and add: ,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site

# Restart containers
docker compose down
docker compose up -d
```

### Step 6: Configure Firewall

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

### Step 7: Test

```bash
curl http://dezignbuild.site
```

---

## Quick Commands to Find Your Project

```bash
# Method 1: Search for docker-compose.yml
find / -name "docker-compose.yml" 2>/dev/null

# Method 2: Check running containers
docker ps
# Note the container names, then:
docker inspect <container-name> | grep -i "workdir\|source"

# Method 3: Check common locations
ls -la /docker/
ls -la /opt/
ls -la /root/
ls -la /var/www/
```

---

## After Finding Project Directory

Once you know where your project is:

```bash
cd /path/to/your/project
ls -la  # Should see docker-compose.yml

# Then run the setup commands manually or use Option 2 above
```

---

## Need Help?

1. **Find your project:** `find / -name "docker-compose.yml" 2>/dev/null`
2. **Navigate there:** `cd /path/found`
3. **Run setup:** Use Option 2 or Option 3 above

