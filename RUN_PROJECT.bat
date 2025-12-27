@echo off
echo ========================================
echo   Product Admin Panel - Full Stack
echo ========================================
echo.
echo Starting Backend and Frontend...
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:3000
echo.
echo ========================================
echo.

REM Start backend in new window
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak > nul

REM Start frontend in new window
start "Frontend Server" cmd /k "cd /d %~dp0 && npm start"

echo.
echo Both servers started!
echo.
echo - Backend: http://localhost:5000/api/health
echo - Frontend: http://localhost:3000
echo.
echo Close the terminal windows to stop servers
echo.
pause
