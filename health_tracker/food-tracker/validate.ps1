# Navigate to the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Validating TypeScript code..." -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

# Check for TypeScript errors
Write-Host "Running TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit

Write-Host "Done!" -ForegroundColor Green
Read-Host -Prompt "Press Enter to exit" 