# EC2 Windows Server Setup Script for arXiv Feed Backend
# Run this script as Administrator on your EC2 instance

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "arXiv Feed Backend - EC2 Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

# 1. Install Chocolatey (package manager)
Write-Host "`n[1/6] Installing Chocolatey..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path += ";C:\ProgramData\chocolatey\bin"
} else {
    Write-Host "Chocolatey already installed" -ForegroundColor Green
}

# 2. Install Node.js LTS
Write-Host "`n[2/6] Installing Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y
    $env:Path += ";C:\Program Files\nodejs"
} else {
    Write-Host "Node.js already installed: $(node --version)" -ForegroundColor Green
}

# 3. Install Git
Write-Host "`n[3/6] Installing Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
    $env:Path += ";C:\Program Files\Git\bin"
} else {
    Write-Host "Git already installed: $(git --version)" -ForegroundColor Green
}

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 4. Clone or update the repository
Write-Host "`n[4/6] Setting up application..." -ForegroundColor Yellow
$appDir = "C:\apps\arxiv-feed"

if (Test-Path $appDir) {
    Write-Host "Updating existing installation..." -ForegroundColor Yellow
    Set-Location $appDir
    git pull origin master
} else {
    Write-Host "Cloning repository..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "C:\apps" -Force | Out-Null
    Set-Location "C:\apps"
    git clone https://github.com/mynamesjohnd0e/arxiv-feed.git
    Set-Location $appDir
}

# 5. Install dependencies
Write-Host "`n[5/6] Installing dependencies..." -ForegroundColor Yellow
Set-Location "$appDir\backend"
npm install

# 6. Create .env file template
Write-Host "`n[6/6] Creating environment file..." -ForegroundColor Yellow
$envFile = "$appDir\backend\.env"
if (-not (Test-Path $envFile)) {
    @"
# Anthropic API Key (required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# AWS Configuration (for DynamoDB and Bedrock)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
DYNAMODB_TABLE=arxiv-papers

# Server port
PORT=3001
"@ | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "Created .env template at $envFile" -ForegroundColor Yellow
    Write-Host "IMPORTANT: Edit this file with your actual API keys!" -ForegroundColor Red
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Edit C:\apps\arxiv-feed\backend\.env with your API keys" -ForegroundColor White
Write-Host "2. Run: cd C:\apps\arxiv-feed\backend" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
Write-Host "4. Or install as Windows Service (see ec2-service.ps1)" -ForegroundColor White
Write-Host "`nTo run batch processor: npm run batch" -ForegroundColor White
