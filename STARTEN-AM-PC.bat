@echo off
setlocal
cd /d "%~dp0"
title CLDF Offline-App v4.7.4
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 18 oder neuer installieren.
  pause
  exit /b 1
)
start "CLDF Offline-Server" /D "%~dp0" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
exit /b 0
