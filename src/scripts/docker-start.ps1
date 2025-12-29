# PowerShell script to start Docker environment
# Usage: .\scripts\docker-start.ps1 [dev|prod]

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

Write-Host "🐳 Starting BuildFlow ERP System with Docker..." -ForegroundColor Cyan

if ($Mode -eq "dev") {
    Write-Host "📦 Starting Development Environment (with hot reload)..." -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml up -d
    
    Write-Host ""
    Write-Host "✅ Services started!" -ForegroundColor Green
    Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "📍 Backend API: http://localhost:3000/api" -ForegroundColor Cyan
    Write-Host "📍 PostgreSQL: localhost:5432" -ForegroundColor Cyan
    Write-Host "📍 Redis: localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 View logs: docker compose -f docker-compose.dev.yml logs -f" -ForegroundColor Yellow
} else {
    Write-Host "📦 Starting Production Environment..." -ForegroundColor Yellow
    docker compose up -d
    
    Write-Host ""
    Write-Host "✅ Services started!" -ForegroundColor Green
    Write-Host "📍 Frontend: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "📍 Backend API: http://localhost:3000/api" -ForegroundColor Cyan
    Write-Host "📍 PostgreSQL: localhost:5432" -ForegroundColor Cyan
    Write-Host "📍 Redis: localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 View logs: docker compose logs -f" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Check status: docker compose ps" -ForegroundColor Yellow
Write-Host "🛑 Stop services: docker compose down" -ForegroundColor Yellow
