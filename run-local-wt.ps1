<#
run-local-wt.ps1

Opens backend and Expo dev servers in two tabs inside Windows Terminal (`wt`).
If `wt` is not available, falls back to `run-local.ps1` (which opens separate windows).

Usage: From repository root:
  cd .\arxiv-feed
  .\run-local-wt.ps1
#>

$backendPath = Join-Path $PSScriptRoot 'backend'
$mobilePath = Join-Path $PSScriptRoot 'mobile'

if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
    Write-Host "Windows Terminal ('wt') not found. Falling back to run-local.ps1" -ForegroundColor Yellow
    $fallback = Join-Path $PSScriptRoot 'run-local.ps1'
    if (Test-Path $fallback) {
        & $fallback
    } else {
        Write-Host "Fallback script run-local.ps1 not found. Please install Windows Terminal or run commands manually." -ForegroundColor Red
    }
    exit
}

if (-Not (Test-Path (Join-Path $backendPath '.env'))) {
    Write-Host "Warning: backend/.env not found. Create 'backend/.env' with ANTHROPIC_API_KEY=your_key" -ForegroundColor Yellow
}

# Build wt command pieces. Each new-tab will run a PowerShell instance and keep it open.
$backendTab = "new-tab -d \"$backendPath\" powershell -NoExit -Command \"npm install; npm run dev\""
$mobileTab  = "new-tab -d \"$mobilePath\" powershell -NoExit -Command \"npm install; npx expo start --tunnel\""

$args = "$backendTab ; $mobileTab"

Start-Process -FilePath "wt.exe" -ArgumentList $args

Write-Host "Launched Windows Terminal with backend and Expo tabs." -ForegroundColor Green
