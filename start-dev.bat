@echo off
echo 🚀 Starting Financial Hub Development Environment...

if not exist "financial-hub" (
    echo ❌ Error: financial-hub directory not found. Please run this script from the Race-OS root directory.
    pause
    exit /b 1
)

echo 🔧 Starting Backend and Frontend servers...
npm run dev

pause
