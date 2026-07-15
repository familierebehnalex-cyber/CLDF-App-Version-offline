# Testbericht – CLDF Offline-App v4.7.4

Stand: 15. Juli 2026

## Ergebnis

Alle automatischen Prüfungen wurden erfolgreich abgeschlossen.

- JavaScript-Syntax gültig
- Pflichtdateien vollständig
- ursprüngliche Grafiken unverändert
- ursprüngliche CSS-Basis unverändert
- Get-in-Line-Parser bestanden
- Audio-Fingerprint-Test bestanden
- alle acht Video-Schrittmuster bestanden
- Radio-API- und Live-API-Test bestanden
- Song-API-Index-Test bestanden
- eigener Dubletten-Selbsttest bestanden
- unerwünschte Senderkatalog-Box weiterhin nicht vorhanden

## API-Datenbestand

- 4.502 Quelldatensätze vor der Zusammenführung
- 4.011 eindeutige Song-API-Einträge
- 3.990 spielbare Liedmetadatensätze
- 10 Senderquellen
- 70 API-Endpunkte
- 338 Einträge mit Tanzvorschlägen
- 143 Einträge mit exakter Tanzzuordnung
- 21 Jingles beziehungsweise Stationshinweise ausgeschlossen
- 223 doppelte Zeilen aus der neuen Sammlung zusammengeführt
- 255 Überschneidungen mit der bisherigen App erkannt
- fünf widersprüchliche API-Song-IDs sicher getrennt gelassen

## Datenschutz und Kosten

Es sind keine API-Schlüssel enthalten. Mikrofon-, Audio-, Kamera- und Videodaten werden nicht an laut.fm übertragen. Die App ruft ausschließlich öffentliche Sender-Metadaten ab und verwendet den lokalen Katalog als Offline-Fallback.
