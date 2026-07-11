@echo off
setlocal
cd /d "%~dp0"
title CLDF - Get-in-Line-Katalog aktualisieren

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 18 oder neuer installieren und danach erneut starten.
  pause
  exit /b 1
)

set "SYNC_MODE="
set "CATALOG_COUNT=0"
for /f %%C in ('node tools\catalog-count.js') do set "CATALOG_COUNT=%%C"
if not "%CATALOG_COUNT%"=="0" (
  echo.
  echo Es ist bereits ein Get-in-Line-Katalog vorhanden.
  echo N = nur neue und bisher fehlgeschlagene Seiten einlesen
  echo V = alle vorhandenen Seiten vollstaendig neu einlesen
  choice /C NV /N /M "Auswahl [N/V]: "
  if errorlevel 2 set "SYNC_MODE=--full"
)

echo.
echo Get-in-Line-Metadaten werden eingelesen.
echo Gespeichert werden Titel, Musik, Interpret, Choreograf, Level,
echo Counts, Walls, Tags/Restarts/Bridges und der Original-Tanzsheet-Link.
echo Die vollstaendige Schrittbeschreibung wird nicht kopiert.
echo.
echo Das Archiv ist sehr gross. Das Fenster bis zur Fertigmeldung offen lassen.
echo Zwischenstaende werden regelmaessig gespeichert.
echo.
node tools\sync-getinline.js %SYNC_MODE%
if errorlevel 1 (
  echo.
  echo Die Aktualisierung wurde mit einem Fehler beendet.
  echo Bereits gespeicherte Zwischenstaende bleiben erhalten.
  pause
  exit /b 1
)

echo.
echo Der Get-in-Line-Katalog wurde aktualisiert.
pause
