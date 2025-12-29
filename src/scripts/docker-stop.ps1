# PowerShell script to stop Docker environment
# Usage: .\scripts\docker-stop.ps1 [dev|prod]

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

Write-Host "🛑 Stopping BuildFlow ERP System..." -ForegroundColor Yellow

if ($Mode -eq "dev") {
    docker compose -f docker-compose.dev.yml down
} else {
    docker compose down
}

Write-Host "✅ Services stopped!" -ForegroundColor Green
