# PowerShell script to run both angular-fe and node-be in development mode from the monorepo root
Write-Host "Bootstrapping dynamic-forms monorepo dev stack..." -ForegroundColor Cyan

# Kill any existing processes on port 3000 (Express backend)
Write-Host "Checking for existing processes on port 3000..." -ForegroundColor Yellow
$PID_3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
if ($PID_3000) {
    Write-Host "Killing existing process on port 3000 (PID: $PID_3000)..." -ForegroundColor Red
    Stop-Process -Id $PID_3000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Kill any existing processes on port 4200 (Angular frontend)
Write-Host "Checking for existing processes on port 4200..." -ForegroundColor Yellow
$PID_4200 = (Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
if ($PID_4200) {
    Write-Host "Killing existing process on port 4200 (PID: $PID_4200)..." -ForegroundColor Red
    Stop-Process -Id $PID_4200 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Check for node_modules at the monorepo root and trigger installation if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Root node_modules not found. Installing workspace dependencies..." -ForegroundColor Yellow
    npm install
}

# Start both dev services concurrently
Write-Host "Launching Express Backend (port 3000) and Angular Frontend (port 4200)..." -ForegroundColor Green
npm start
