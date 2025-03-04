# Food Tracker - PowerShell Setup Script
# This script installs dependencies and runs the development server

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script needs to be run as Administrator to ensure proper execution." -ForegroundColor Yellow
    Write-Host "Please right-click on the script and select 'Run as Administrator'." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Set execution policy for this process only
try {
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
} catch {
    Write-Host "Failed to set execution policy. Some commands may not work." -ForegroundColor Red
}

# Check for Node.js installation
Write-Host "Checking for Node.js installation..." -ForegroundColor Cyan
$nodeInstalled = $null -ne (Get-Command node -ErrorAction SilentlyContinue)

if (-not $nodeInstalled) {
    Write-Host "Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/ (version 16.8.0 or later)" -ForegroundColor Yellow
    Write-Host "and run this script again."
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Check Node.js version
$nodeVersion = (node -v)
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
    Write-Host "Dependencies installed successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to install dependencies: $_" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again."
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Start development server
Write-Host "`nStarting development server..." -ForegroundColor Cyan
Write-Host "The application will be available at http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server when you're done.`n" -ForegroundColor Yellow

try {
    npm run dev
} catch {
    Write-Host "Failed to start development server: $_" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} 