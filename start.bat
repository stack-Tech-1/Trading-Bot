@echo off
title TradingBot Launcher
echo Starting TradingBot Pro...
echo.

echo [1/3] Starting Python bridge...
start "TradingBot Bridge" cmd /k "cd /d %~dp0backend\bridge && python bridge.py"

echo [2/3] Starting React dashboard...
start "TradingBot Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Opening dashboard in browser...
timeout /t 4 /nobreak > nul
start http://localhost:5173

echo.
echo All services started.
echo - Bridge running in its own window
echo - Dashboard running in its own window
echo - Browser opening at http://localhost:5173
echo.
echo Close this window when done. Stop services by closing their windows.
pause
