@echo off
setlocal
cd /d "%~dp0"
title CLDF komplett aktualisieren
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 18 oder neuer installieren.
  pause
  exit /b 1
)
echo.
echo 1/2 Get-in-Line-Metadaten werden aktualisiert.
echo Der erste Lauf kann wegen der Groesse des Archivs lange dauern.
call GETINLINE-KATALOG-AKTUALISIEREN.bat
if errorlevel 1 exit /b 1
echo.
echo 2/2 Die App wird gestartet.
call STARTEN-AM-PC.bat
