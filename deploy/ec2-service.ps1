# Install arXiv Feed as a Windows Service using NSSM
# Run this AFTER ec2-setup.ps1 and configuring .env

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing arXiv Feed as Windows Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator" -ForegroundColor Red
    exit 1
}

# Install NSSM (Non-Sucking Service Manager)
Write-Host "`n[1/3] Installing NSSM..." -ForegroundColor Yellow
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    choco install nssm -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

$serviceName = "ArxivFeedBackend"
$appDir = "C:\apps\arxiv-feed\backend"
$nodeExe = "C:\Program Files\nodejs\node.exe"

# Remove existing service if present
Write-Host "`n[2/3] Configuring service..." -ForegroundColor Yellow
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    nssm stop $serviceName
    nssm remove $serviceName confirm
}

# Install the service
nssm install $serviceName $nodeExe "src\index.js"
nssm set $serviceName AppDirectory $appDir
nssm set $serviceName DisplayName "arXiv Feed Backend API"
nssm set $serviceName Description "Node.js backend for arXiv Feed mobile app"
nssm set $serviceName Start SERVICE_AUTO_START
nssm set $serviceName AppStdout "$appDir\logs\service.log"
nssm set $serviceName AppStderr "$appDir\logs\error.log"
nssm set $serviceName AppRotateFiles 1
nssm set $serviceName AppRotateBytes 1048576

# Create logs directory
New-Item -ItemType Directory -Path "$appDir\logs" -Force | Out-Null

# Start the service
Write-Host "`n[3/3] Starting service..." -ForegroundColor Yellow
nssm start $serviceName

# Check status
Start-Sleep -Seconds 3
$service = Get-Service -Name $serviceName
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Service Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Red' })
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nUseful commands:" -ForegroundColor White
Write-Host "  Check status:  Get-Service $serviceName" -ForegroundColor Gray
Write-Host "  View logs:     Get-Content $appDir\logs\service.log -Tail 50" -ForegroundColor Gray
Write-Host "  Stop service:  Stop-Service $serviceName" -ForegroundColor Gray
Write-Host "  Start service: Start-Service $serviceName" -ForegroundColor Gray
Write-Host "  Restart:       Restart-Service $serviceName" -ForegroundColor Gray

Write-Host "`nAPI will be available at: http://localhost:3001" -ForegroundColor Green
Write-Host "Don't forget to configure EC2 Security Group to allow port 3001" -ForegroundColor Yellow
