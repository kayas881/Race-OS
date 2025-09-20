# Race-OS Quick Start PowerShell Script
param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Both
)

# Set console title and colors
$Host.UI.RawUI.WindowTitle = "Race-OS Development Environment"

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    🚀 Race-OS Quick Development Starter" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root (script is in scripts/ folder)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "📍 Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host ""

# Function to start backend
function Start-Backend {
    Write-Host "🔧 Starting Backend Server..." -ForegroundColor Magenta
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\financial-hub\backend'; npm start" -WindowStyle Normal
}

# Function to start frontend  
function Start-Frontend {
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\financial-hub\frontend'; npm start" -WindowStyle Normal
}

# Handle parameters
if ($Backend) {
    Start-Backend
} elseif ($Frontend) {
    Start-Frontend  
} elseif ($Both) {
    Start-Backend
    Start-Sleep -Seconds 3
    Start-Frontend
} else {
    # Default: start both
    Write-Host "No specific option selected. Starting both servers..." -ForegroundColor Green
    Start-Backend
    Start-Sleep -Seconds 3  
    Start-Frontend
}

Write-Host ""
Write-Host "✅ Servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 Backend:  " -NoNewline -ForegroundColor White  
Write-Host "http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
