# Navigate to the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Run the development server
Write-Host "Starting Next.js development server..." -ForegroundColor Green
npm run dev 