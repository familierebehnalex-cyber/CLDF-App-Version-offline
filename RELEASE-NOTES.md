# CLDF Offline-App v4.7.4 – erweiterte Song-API-Sammlung

## Neu

- fünf zusätzliche Senderquellen ergänzt; Eagle FM wurde mit dem aktuelleren Stand aktualisiert
- 3.237 neue Senderdatensätze vor dem Import geprüft
- Dubletten nach normalisiertem Lied/Interpret und bei eindeutigen Schreibvarianten über API-Song-ID zusammengeführt
- 4.011 eindeutige Song-API-Zuordnungen aus 10 Sendern
- 70 öffentliche laut.fm-Endpunkte im Hintergrund verfügbar
- 338 Songs mit Tanzvorschlägen und 143 exakten Tanzzuordnungen
- sichtbare Senderbox bleibt entfernt

## Sicherheitsregel bei Dubletten

API-Song-IDs wurden nicht blind als eindeutig behandelt. Fünf bereits vorhandene widersprüchliche IDs wurden getrennt gelassen, weil Künstler oder Titel nicht ausreichend übereinstimmten.

## Geänderte Kerndateien

- `data/radio-api-catalog.json`
- `data/song-api-index.json`
- `assets/radio-api-data.js`
- `assets/song-api-index.js`
- `assets/app.js`
- `service-worker.js`
- neue Senderordner unter `data/radio-api-sammlung/`
