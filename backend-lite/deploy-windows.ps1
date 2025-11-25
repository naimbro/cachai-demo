# Deploy script for Windows native (not WSL)
# Run this from PowerShell: .\deploy-windows.ps1

Write-Host "🚀 Deploying backend-lite from Windows native path..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path ".\firebase.json")) {
    Write-Host "❌ Error: firebase.json not found. Make sure you're in the backend-lite directory." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Using npx to run Firebase CLI..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Starting deployment..." -ForegroundColor Cyan

# Use npx to run firebase-tools without global installation
npx firebase-tools deploy --only functions

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
