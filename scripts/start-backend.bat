@echo off
title Race-OS Backend Server
color 0C

echo.
echo ========================================
echo    🔧 Starting Race-OS Backend Only
echo ========================================
echo.

cd /d "%~dp0.."

if not exist "financial-hub\backend" (
    echo ❌ Error: Backend directory not found!
    pause
    exit /b 1
)

echo 📍 Navigating to backend directory...
cd financial-hub\backend

echo 🚀 Starting Backend Server...
npm start

pause
