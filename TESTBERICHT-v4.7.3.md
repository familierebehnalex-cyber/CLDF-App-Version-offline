# Testbericht – CLDF Offline-App v4.7.3

Stand: 12. Juli 2026

## Ergebnis

Alle automatischen Prüfungen wurden erfolgreich abgeschlossen.

## Song-API-Prüfung

- 1.254 eindeutige Song-API-Einträge geladen
- alle 1.254 Einträge besitzen mindestens eine API-Song-ID
- fünf Senderquellen erkannt
- 35 Sender-Endpunkte übernommen
- 261 Einträge mit Tanzvorschlägen
- 63 Einträge mit exakter Tanzzuordnung
- Referenztest „Aaron Goodvin – Lonely Drum“:
  - API-Song-ID `19470677` vorhanden
  - Senderquelle `linedance_nahetal` vorhanden
  - `current_song`- und `last_songs`-Endpunkt vorhanden
  - exakte Tanzzuordnung „Lonely Drum“ vorhanden
- Song-API-Script in `index.html` und `404.html` eingebunden
- Song-API-Dateien im Offline-Cache enthalten
- API-Kennzeichnung pro Lied im App-Code vorhanden
- Senderkatalog-Box weiterhin nicht vorhanden

## Weitere Prüfungen

- JavaScript-Syntax: bestanden
- Service Worker: bestanden
- Radio-Katalog: bestanden
- Live-API-Fallback: bestanden
- Audio-Fingerprint-Selbsttest: bestanden
- Video-Schrittmuster: acht von acht bestanden
- Get-in-Line-Parser: bestanden
- Pflichtdateien: vollständig
- Original-CSS-Basis: unverändert
- Originalgrafiken: unverändert
- keine verbotenen externen Musikerkennungsdienste oder API-Schlüssel enthalten

## Hinweis zur Musikerkennung

Die gelieferte laut.fm-Sammlung ergänzt Metadaten zu einem bereits erkannten beziehungsweise ausgewählten Lied. Sie ist kein Audio-Erkennungsdienst, der eine unbekannte Musikaufnahme an einen Server hochlädt. Die Audioerkennung der App bleibt lokal über Dateiname und Audio-Fingerprints; danach wird das Ergebnis mit dem Song-API-Index verbunden.
