# Start Redis Docker Container for BuildFlow
# Run this script to start Redis if it's not running

Write-Host "Checking Redis container status..." -ForegroundColor Cyan

$container = docker ps -a --filter "name=buildflow-redis" --format "{{.Names}}"

if ($container -eq "buildflow-redis") {
    $running = docker ps --filter "name=buildflow-redis" --format "{{.Names}}"
    
    if ($running -eq "buildflow-redis") {
        Write-Host "✅ Redis container is already running!" -ForegroundColor Green
    } else {
        Write-Host "Starting Redis container..." -ForegroundColor Yellow
        docker start buildflow-redis
        Start-Sleep -Seconds 2
        
        $test = docker exec buildflow-redis redis-cli ping 2>$null
        if ($test -eq "PONG") {
            Write-Host "✅ Redis started successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis failed to start. Check Docker logs." -ForegroundColor Red
        }
    }
} else {
    Write-Host "Creating and starting Redis container..." -ForegroundColor Yellow
    docker run -d --name buildflow-redis -p 6379:6379 redis:7-alpine
    Start-Sleep -Seconds 3
    
    $test = docker exec buildflow-redis redis-cli ping 2>$null
    if ($test -eq "PONG") {
        Write-Host "✅ Redis container created and started!" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis failed to start. Check Docker logs." -ForegroundColor Red
    }
}

Write-Host "`nRedis is available at: localhost:6379" -ForegroundColor Cyan
