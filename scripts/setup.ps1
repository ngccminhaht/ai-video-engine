# Initial project setup
# Usage: .\scripts\setup.ps1

Write-Host "Setting up AI Video Platform" -ForegroundColor Cyan

# Create virtual environment
Write-Host "`n[1/4] Creating virtual environment..." -ForegroundColor Yellow
python -m venv .venv

# Activate
Write-Host "[2/4] Activating virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
pip install -e ".[dev]"

# Copy env file
Write-Host "[4/4] Setting up environment file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env already exists, skipping" -ForegroundColor Gray
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start Docker services: docker compose -f docker-compose.dev.yml up -d"
Write-Host "  2. Run API server: python -m uvicorn apps.api.main:app --reload"
Write-Host "  3. Open docs: http://localhost:8000/docs"
