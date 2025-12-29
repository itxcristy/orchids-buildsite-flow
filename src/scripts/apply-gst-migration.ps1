# Apply GST Compliance Migration
# This script applies the GST compliance schema migration to the database

param(
    [string]$Database = "buildflow_db",
    [string]$User = "postgres",
    [string]$Host = "localhost",
    [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "GST Compliance Schema Migration" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Database: $Database" -ForegroundColor Gray
Write-Host "User: $User" -ForegroundColor Gray
Write-Host "Host: $Host:$Port" -ForegroundColor Gray
Write-Host ""

# Set password
$env:PGPASSWORD = "admin"

# Check if migration file exists
$migrationFile = "database/migrations/07_gst_compliance_schema.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Applying migration..." -ForegroundColor Yellow

try {
    # Apply migration
    $result = Get-Content $migrationFile | & psql -U $User -h $Host -p $Port -d $Database 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "GST Compliance tables created:" -ForegroundColor Cyan
        Write-Host "  - gst_settings" -ForegroundColor Gray
        Write-Host "  - gst_transactions" -ForegroundColor Gray
        Write-Host "  - gst_returns" -ForegroundColor Gray
        Write-Host "  - calculate_gst_liability() function" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "❌ Error applying migration:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
