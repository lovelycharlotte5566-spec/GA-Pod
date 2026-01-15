@echo off
REM GA POD Server Startup Script (Batch file)
echo Refreshing environment variables...
call refreshenv >nul 2>&1

echo Checking Node.js...
node --version
npm --version

echo.
echo Starting GA POD Server...
echo.
cd /d "%~dp0"
npm start
pause
