@echo off
title Race-OS Development Server
color 0A

echo.
echo ==========================================
echo    🚀 Starting Race-OS Development
echo ==========================================
echo.

if not exist "financial-hub" (
    echo ❌ Error: financial-hub directory not found. Please run this script from the Race-OS root directory.
    pause
    exit /b 1
)

echo 📍 Project directory found!
echo.
echo 🔧 Starting Backend Server...
start "Race-OS Backend" cmd /k "cd financial-hub\backend && npm start"

timeout /t 3 /nobreak > nul

echo 🎨 Starting Frontend Server...
start "Race-OS Frontend" cmd /k "cd financial-hub\frontend && npm start"

echo.
echo ✅ Both servers starting in separate windows!
echo.
echo 📱 Frontend will be available at: http://localhost:3000
echo 🔌 Backend API will be available at: http://localhost:5000
echo.
echo Press any key to exit this window...
pause > nul
