@echo off
setlocal
cd /d "%~dp0"
title CLDF Audio-Fingerprints fest einbauen
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  pause
  exit /b 1
)
if not exist "CLDF-Audio-Fingerprints.json" (
  echo CLDF-Audio-Fingerprints.json wurde im App-Ordner nicht gefunden.
  echo Erstelle sie zuerst mit MUSIKREFERENZEN-ERSTELLEN.bat.
  pause
  exit /b 1
)
node tools\install-fingerprints.js
if errorlevel 1 (
  pause
  exit /b 1
)
node tools\validate-build.js
echo.
echo Fertig. Die Referenzen sind jetzt fest in der App eingebaut.
pause
