# Stop Redis Docker Container for BuildFlow

Write-Host "Stopping Redis container..." -ForegroundColor Yellow

docker stop buildflow-redis

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis container stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis container may not be running or doesn't exist." -ForegroundColor Yellow
}
