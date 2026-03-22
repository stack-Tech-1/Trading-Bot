@echo off
title TradingBot Stop
echo Stopping TradingBot services...
taskkill /FI "WINDOWTITLE eq TradingBot Bridge*" /F
taskkill /FI "WINDOWTITLE eq TradingBot Dashboard*" /F
echo Done. All TradingBot services stopped.
pause
