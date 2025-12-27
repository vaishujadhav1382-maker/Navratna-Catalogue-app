@echo off
echo ========================================
echo    Firebase Backend Server
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo.
    echo Please create .env file first:
    echo 1. Copy .env.template to .env
    echo 2. Add your Firebase credentials
    echo.
    echo Read SIMPLE_STEPS_HINDI.md for help
    echo.
    pause
    exit
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    echo.
    call npm install
    echo.
)

echo Starting backend server...
echo.
echo Server will run on: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

call npm run dev
