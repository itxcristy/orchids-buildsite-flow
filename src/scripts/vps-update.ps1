# VPS Update Script for Drena (PowerShell)
# Run this script from your local machine to update VPS

param(
    [string]$VpsHost = "72.61.243.152",
    [string]$VpsUser = "root",
    [string]$ProjectPath = "/root/buildsite-flow"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🚀 Drena VPS Update Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Step 1: Transfer files to VPS
Write-Host "📤 Transferring files to VPS..." -ForegroundColor Blue
Write-Host "   Host: $VpsUser@$VpsHost" -ForegroundColor Gray
Write-Host "   Path: $ProjectPath" -ForegroundColor Gray
Write-Host ""

# Use rsync or scp to transfer files
# Note: You'll need to have SSH keys set up for passwordless login

# Option 1: Using SCP (simpler but slower)
Write-Host "Transferring files using SCP..." -ForegroundColor Yellow
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "*.log"
)

# Create tar archive excluding patterns
$tarFile = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
Write-Host "Creating archive..." -ForegroundColor Yellow

# Note: This requires WSL or Git Bash on Windows
# Alternative: Use WinSCP or FileZilla for GUI transfer

Write-Host ""
Write-Host "⚠️  Manual Transfer Required" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Use Git (Recommended)" -ForegroundColor Cyan
Write-Host "  1. SSH to VPS: ssh $VpsUser@$VpsHost" -ForegroundColor White
Write-Host "  2. cd $ProjectPath" -ForegroundColor White
Write-Host "  3. git pull" -ForegroundColor White
Write-Host "  4. Run update script on VPS" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Use SCP from Git Bash/WSL" -ForegroundColor Cyan
Write-Host "  scp -r . $VpsUser@$VpsHost:$ProjectPath" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Use WinSCP or FileZilla (GUI)" -ForegroundColor Cyan
Write-Host "  Connect to: $VpsUser@$VpsHost" -ForegroundColor White
Write-Host "  Upload files to: $ProjectPath" -ForegroundColor White
Write-Host ""

# Step 2: Execute update on VPS
Write-Host "🔧 Executing update on VPS..." -ForegroundColor Blue
Write-Host ""

$updateCommands = @"
cd $ProjectPath
if [ -f scripts/vps-update.sh ]; then
    chmod +x scripts/vps-update.sh
    ./scripts/vps-update.sh
else
    # Manual update
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml build --no-cache
    docker compose -f docker-compose.prod.yml up -d
    docker compose -f docker-compose.prod.yml ps
fi
"@

Write-Host "Run these commands on VPS:" -ForegroundColor Yellow
Write-Host $updateCommands -ForegroundColor White
Write-Host ""

Write-Host "Or SSH and run:" -ForegroundColor Cyan
Write-Host "  ssh $VpsUser@$VpsHost" -ForegroundColor White
Write-Host "  cd $ProjectPath" -ForegroundColor White
Write-Host "  ./scripts/vps-update.sh" -ForegroundColor White
Write-Host ""

