# Start development environment
# Usage: .\scripts\dev.ps1

Write-Host "Starting AI Video Platform - Dev Environment" -ForegroundColor Cyan

# Start Docker services
Write-Host "`n[1/3] Starting PostgreSQL + Redis..." -ForegroundColor Yellow
docker compose -f docker-compose.dev.yml up -d

# Wait for services
Write-Host "[2/3] Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start API server
Write-Host "[3/3] Starting API server..." -ForegroundColor Yellow
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Green
python -m uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000
