@echo off
echo ===================================
echo Food Tracker - Installation Script
echo ===================================
echo.

echo Checking for Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/ (version 16.8.0 or later)
  echo and run this script again.
  pause
  exit /b 1
)

echo Node.js found. Checking version...
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node version: %NODE_VERSION%
echo.

echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
  echo Failed to install dependencies.
  echo Please check your internet connection and try again.
  pause
  exit /b 1
)
echo Dependencies installed successfully.
echo.

echo Starting development server...
echo The application will be available at http://localhost:3000
echo Press Ctrl+C to stop the server when you're done.
echo.
call npm run dev

pause 