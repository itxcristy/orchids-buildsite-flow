# PowerShell script to apply quotation schema migration to all agency databases
# This script applies the migration to each agency's isolated database

$env:PGPASSWORD = 'admin'
$PGUSER = 'postgres'
$PGHOST = 'localhost'
$PGPORT = '5432'
$MAIN_DB = 'buildflow_db'

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Applying Quotation Migration to All Agencies" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get all agency database names from main database
Write-Host "Fetching agency database names..." -ForegroundColor Yellow
$dbNamesQuery = "SELECT database_name FROM public.agencies WHERE database_name IS NOT NULL;"
$dbNamesResult = & psql -U $PGUSER -d $MAIN_DB -t -c $dbNamesQuery

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error fetching agency database names!" -ForegroundColor Red
    exit 1
}

$dbNames = $dbNamesResult | Where-Object { $_.Trim() -ne '' } | ForEach-Object { $_.Trim() }

if ($dbNames.Count -eq 0) {
    Write-Host "No agency databases found." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($dbNames.Count) agency databases" -ForegroundColor Green
Write-Host ""

$successCount = 0
$errorCount = 0
$skippedCount = 0

foreach ($dbName in $dbNames) {
    Write-Host "Processing: $dbName" -ForegroundColor Cyan
    
    # Check if quotations table exists
    $checkTableQuery = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations');"
    $tableExists = & psql -U $PGUSER -d $dbName -t -c $checkTableQuery
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Error checking table existence, skipping..." -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    if ($tableExists.Trim() -ne 't') {
        Write-Host "  ⏭️  Quotations table doesn't exist, skipping..." -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    # Apply migration
    Write-Host "  Applying migration..." -ForegroundColor Gray
    $migrationResult = Get-Content "database/migrations/add_quotation_agency_columns.sql" | & psql -U $PGUSER -d $dbName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Migration applied successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ❌ Error applying migration:" -ForegroundColor Red
        Write-Host $migrationResult -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Migration Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Errors: $errorCount" -ForegroundColor Red
Write-Host "⏭️  Skipped: $skippedCount" -ForegroundColor Yellow
Write-Host ""

if ($errorCount -gt 0) {
    Write-Host "Some migrations failed. Please review the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All migrations completed successfully!" -ForegroundColor Green
    exit 0
}
