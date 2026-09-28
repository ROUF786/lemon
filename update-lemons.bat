@echo off
setlocal
cd /d "%~dp0"
title Bagawan Brothers - website update
echo.
echo   ==========================================
echo      Bagawan Brothers - website update
echo   ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 goto nonode
if exist "node_modules\sharp\package.json" goto build
echo   Pehli baar setup ho raha hai - 1-2 minute lagenge...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto npmfail

:build
node scripts\build.mjs
if errorlevel 1 goto buildfail
echo   Website "site" folder mein taiyaar hai.
echo   Dekhne ke liye preview.bat chalao - ya site\index.html kholo.
echo.
pause
exit /b 0

:nonode
echo   Node.js install nahi hai.
echo   https://nodejs.org se LTS version install karo, phir ye file dobara chalao.
echo.
pause
exit /b 1

:npmfail
echo   Tools install nahi ho paaye. Internet check karke dobara chalao.
echo.
pause
exit /b 1

:buildfail
echo   Kuch gadbad hui - upar ka message padho.
echo.
pause
exit /b 1
