#!/bin/bash
# Fix Docker Build Issues on VPS
# Run this script on your VPS: bash VPS_BUILD_FIX.sh

set -e

echo "🔧 Fixing Docker Build Issues..."
echo ""

# Navigate to project directory
cd /docker/buildsite-flow || cd ~/buildsite-flow || { echo "❌ Project directory not found!"; exit 1; }

echo "📁 Current directory: $(pwd)"
echo ""

# Step 1: Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git pull origin main || echo "⚠️  Git pull failed, continuing anyway..."
echo ""

# Step 2: Verify required files exist
echo "🔍 Checking required files..."
echo ""

# Backend files
if [ -f "server/package.json" ]; then
    echo "✅ server/package.json exists"
else
    echo "❌ server/package.json MISSING!"
    exit 1
fi

if [ -f "server/index.js" ]; then
    echo "✅ server/index.js exists"
else
    echo "❌ server/index.js MISSING!"
    exit 1
fi

# Frontend files
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
else
    echo "❌ package.json MISSING!"
    exit 1
fi

if [ -f "vite.config.ts" ]; then
    echo "✅ vite.config.ts exists"
else
    echo "❌ vite.config.ts MISSING!"
    exit 1
fi

if [ -d "src" ]; then
    echo "✅ src/ directory exists"
else
    echo "❌ src/ directory MISSING!"
    exit 1
fi

echo ""
echo "✅ All required files found!"
echo ""

# Step 3: Check .dockerignore
echo "🔍 Checking .dockerignore..."
if [ -f ".dockerignore" ]; then
    echo "✅ .dockerignore exists"
    # Check if package.json is excluded (it shouldn't be)
    if grep -q "^package.json$" .dockerignore; then
        echo "⚠️  WARNING: package.json is in .dockerignore - this will cause build failures!"
        echo "   Removing package.json from .dockerignore..."
        sed -i '/^package.json$/d' .dockerignore
    fi
else
    echo "⚠️  .dockerignore not found (this is okay)"
fi
echo ""

# Step 4: Clean up old containers and images
echo "🧹 Cleaning up old containers..."
docker compose down 2>/dev/null || true
echo ""

# Step 5: Rebuild
echo "🔨 Rebuilding containers..."
echo "   This may take several minutes..."
docker compose build --no-cache

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "✅ Done! Check status with: docker compose ps"
echo ""

