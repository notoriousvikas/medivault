@echo off
cd /d "%~dp0"
echo ====================================================
echo Starting MedTech AI Service (FastAPI + DenseNet-121)
echo ====================================================
"%~dp0.venv\Scripts\uvicorn.exe" app.main:app --reload --host 0.0.0.0 --port 8000
pause
