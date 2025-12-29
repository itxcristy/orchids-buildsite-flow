# Docker Debug Script for VPS (PowerShell)
# Run this from your local machine to debug VPS issues

param(
    [string]$VpsHost = "72.61.243.152",
    [string]$VpsUser = "root",
    [string]$ProjectPath = "/root/buildsite-flow"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Blue
Write-Host "🔍 Docker Debug Report - Drena VPS" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Connecting to VPS: $VpsUser@$VpsHost" -ForegroundColor Yellow
Write-Host "Project path: $ProjectPath" -ForegroundColor Yellow
Write-Host ""

# Commands to run on VPS
$debugScript = @"
cd $ProjectPath
echo '📊 Container Status:'
docker compose -f docker-compose.prod.yml ps
echo ''
echo '📝 Recent Logs (last 50 lines):'
docker compose -f docker-compose.prod.yml logs --tail 50
echo ''
echo '🏥 Health Checks:'
echo -n 'Backend: '
curl -s http://localhost:3000/health || echo 'FAILED'
echo -n 'Database: '
docker exec drena-postgres pg_isready -U postgres 2>/dev/null && echo 'OK' || echo 'FAILED'
echo ''
echo '💾 Disk Space:'
df -h | head -2
echo ''
echo '🐳 Docker Disk Usage:'
docker system df
"@

Write-Host "Run these commands on VPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host $debugScript -ForegroundColor White
Write-Host ""

Write-Host "Or SSH and run the debug script:" -ForegroundColor Yellow
Write-Host "  ssh $VpsUser@$VpsHost" -ForegroundColor White
Write-Host "  cd $ProjectPath" -ForegroundColor White
Write-Host "  chmod +x scripts/debug-docker.sh" -ForegroundColor White
Write-Host "  ./scripts/debug-docker.sh" -ForegroundColor White
Write-Host ""

Write-Host "Quick Debug Commands:" -ForegroundColor Cyan
Write-Host "  # Check status" -ForegroundColor Gray
Write-Host "  docker compose -f docker-compose.prod.yml ps" -ForegroundColor White
Write-Host ""
Write-Host "  # View logs" -ForegroundColor Gray
Write-Host "  docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host ""
Write-Host "  # Check specific service" -ForegroundColor Gray
Write-Host "  docker compose -f docker-compose.prod.yml logs backend" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.prod.yml logs frontend" -ForegroundColor White
Write-Host ""

