@echo off
setlocal
cd /d "%~dp0"
title Bagawan Brothers - preview
where node >nul 2>nul
if errorlevel 1 goto nonode
node scripts\preview.mjs
pause
exit /b 0

:nonode
echo   Node.js install nahi hai. https://nodejs.org se LTS version install karo.
echo   Tab tak site\index.html par double-click karke bhi website dekh sakte ho.
echo.
pause
exit /b 1
