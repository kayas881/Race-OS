@echo off
title Race-OS Frontend Server
color 0B

echo.
echo ========================================
echo    🎨 Starting Race-OS Frontend Only
echo ========================================
echo.

cd /d "%~dp0.."

if not exist "financial-hub\frontend" (
    echo ❌ Error: Frontend directory not found!
    pause
    exit /b 1
)

echo 📍 Navigating to frontend directory...
cd financial-hub\frontend

echo 🚀 Starting Frontend Server...
npm start

pause
