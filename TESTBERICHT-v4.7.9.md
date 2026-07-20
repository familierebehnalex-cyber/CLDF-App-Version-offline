# Testbericht – CLDF Offline-App v4.7.9

Stand: 20. Juli 2026

## Bewegungsreferenzen

- Eingebaute Referenzen: 128
- Zugeordnete Tänze: 127
- Algorithmus: cldf-motion-v2
- Pakete: 2
- Paket 1: 80 Referenzen / 3918231 Bytes
- Paket 2: 48 Referenzen / 2361041 Bytes
- Alle danceId-Werte existieren im aktuellen CLDF-Tanzbestand.
- Jede Referenz enthält eine v2-MediaPipe-Signatur.
- Vorläufige, ausgeschlossene und nicht zuordenbare Referenzen wurden nicht eingebaut.

## App-Integration

- JavaScript-Syntax geprüft.
- Automatischer Paketlader vorhanden.
- Lazy Loading vor Datei- und Live-Videoanalyse vorhanden.
- Lokale und eingebaute Referenzen werden gemeinsam verglichen, aber getrennt gespeichert.
- Service Worker enthält Index und beide Referenzpakete.
- Cache-Version: cldf-offline-v4-7-9-movement-references.
- GitHub-Webupload: keine Update-Datei überschreitet 25 MiB.

## Bestehende Funktionen

Die vorhandenen Audio-Fingerprints, Kameraeinstellungen, Lieddaten, Sheet-Muster und Offline-Dateien bleiben unverändert erhalten.
