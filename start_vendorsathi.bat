@echo off
title VendorSaathi Launcher
echo ========================================================
echo          Starting VendorSaathi Vendor-Side Platform
echo ========================================================
echo.

echo [1/2] Launching Backend Server on http://localhost:8002...
start cmd /k "cd /d %~dp0backend && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Vendor Mobile Application on http://localhost:3000...
start cmd /k "cd /d %~dp0frontend && npx vite --port 3000 --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo  All systems running! Opening browser in 2 seconds...
echo ========================================================
start http://localhost:3000
start http://localhost:8002/docs
