@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 18 oder neuer installieren.
  pause
  exit /b 1
)
start "CLDF Offline-Server" /D "%~dp0" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:4173/tools/fingerprint-builder.html
echo.
echo Nach dem Einlesen wird CLDF-Audio-Fingerprints.json heruntergeladen.
echo Lege diese Datei in den App-Hauptordner und starte FINGERPRINTS-EINBAUEN.bat.
pause
