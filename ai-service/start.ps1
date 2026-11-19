# Start MedTech AI Microservice
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting MedTech AI Service (FastAPI + DenseNet-121)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
& "$PSScriptRoot\.venv\Scripts\uvicorn.exe" app.main:app --reload --host 0.0.0.0 --port 8000
