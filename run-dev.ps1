# PowerShell script to run both angular-fe and node-be in development mode from the monorepo root
Write-Host "Bootstrapping dynamic-forms monorepo dev stack..." -ForegroundColor Cyan

# Check for node_modules at the monorepo root and trigger installation if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Root node_modules not found. Installing workspace dependencies..." -ForegroundColor Yellow
    npm install
}

# Start both dev services concurrently
Write-Host "Launching Express Backend (port 3000) and Angular Frontend (port 4200)..." -ForegroundColor Green
npm start
