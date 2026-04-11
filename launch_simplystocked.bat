@echo off
title SimplyStocked Launcher
echo ==============================================
echo    SimplyStocked Auto-Prep ^& Launch Script
echo ==============================================
echo.

echo [1/5] Scanning for and purging stuck AI processes (freeing RAM)...
powershell -Command "Stop-Process -Name ollama -Force -ErrorAction SilentlyContinue"
timeout /t 2 /nobreak >nul

echo [2/5] Initializing Ollama daemon silently...
start /b "" ollama serve >nul 2>&1
timeout /t 5 /nobreak >nul

echo [3/5] Ensuring high-performance text model (llama3.2) is available...
ollama pull llama3.2

echo [4/5] Firing up the Python FastAPI Backend...
start "SimplyStocked Backend" cmd /c "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

echo [5/5] Firing up the React Vite Frontend...
start "SimplyStocked Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ==============================================
echo System cleaned, prepared, and fully loaded!
echo Both frontend and backend terminals have been opened.
echo You can safely close this launcher window now.
echo ==============================================
pause
