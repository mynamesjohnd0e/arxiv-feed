<#
run-local.ps1

Starts the backend dev server and the Expo mobile dev server (with tunnel) in separate PowerShell windows.

Usage: Run from repository root or double-click this file in Explorer.
#>

$backendPath = Join-Path $PSScriptRoot 'backend'
$mobilePath = Join-Path $PSScriptRoot 'mobile'

if (-Not (Test-Path (Join-Path $backendPath '.env'))) {
    Write-Host "Warning: backend/.env not found. Create 'backend/.env' with ANTHROPIC_API_KEY=your_key" -ForegroundColor Yellow
}

Write-Host "Starting backend in a new PowerShell window..."
$backendCmd = "cd `"$backendPath`"; npm install; npm run dev"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCmd

Write-Host "Starting Expo (mobile) in a new PowerShell window with tunnel..."
$mobileCmd = "cd `"$mobilePath`"; npm install; npx expo start --tunnel"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $mobileCmd

Write-Host "Launched backend and Expo. Check the newly opened PowerShell windows for logs." -ForegroundColor Green
