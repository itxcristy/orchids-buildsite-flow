# Production Deployment Script for Drena (PowerShell)
# Handles complete production deployment with multi-tenant database setup

$ErrorActionPreference = "Stop"

Write-Host "🚀 Drena - Production Deployment" -ForegroundColor Blue
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Please create .env file with production values"
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Check for critical environment variables
if (-not $env:POSTGRES_PASSWORD) {
    Write-Host "❌ POSTGRES_PASSWORD not set in .env" -ForegroundColor Red
    exit 1
}

if (-not $env:VITE_JWT_SECRET) {
    Write-Host "❌ VITE_JWT_SECRET not set in .env" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating data directories..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "data/postgres" | Out-Null
New-Item -ItemType Directory -Force -Path "data/storage" | Out-Null
New-Item -ItemType Directory -Force -Path "data/logs" | Out-Null
New-Item -ItemType Directory -Force -Path "database/backups" | Out-Null

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Blue
docker compose -f docker-compose.prod.yml down

# Build images
Write-Host "🔨 Building production images..." -ForegroundColor Blue
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
Write-Host "🚀 Starting production services..." -ForegroundColor Blue
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Blue
docker compose -f docker-compose.prod.yml ps

# Wait for backend to be ready
Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Blue
$backendPort = if ($env:PORT) { $env:PORT } else { "3000" }
$backendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$backendPort/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend is healthy" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Start-Sleep -Seconds 2
}

if (-not $backendReady) {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
    docker compose -f docker-compose.prod.yml logs backend
    exit 1
}

# Wait for frontend to be ready
Write-Host "⏳ Waiting for frontend to be ready..." -ForegroundColor Blue
$frontendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend is healthy" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Start-Sleep -Seconds 2
}

if (-not $frontendReady) {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
    docker compose -f docker-compose.prod.yml logs frontend
    exit 1
}

# Show final status
Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Blue
docker compose -f docker-compose.prod.yml ps
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Blue
Write-Host "   Frontend: http://localhost" -ForegroundColor Green
Write-Host "   Backend API: http://localhost:$backendPort/api" -ForegroundColor Green
Write-Host ""
Write-Host "📝 View logs:" -ForegroundColor Blue
Write-Host "   docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
Write-Host ""

