# Navigate to the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

Write-Host "Setup complete!" -ForegroundColor Green
Read-Host -Prompt "Press Enter to exit" 