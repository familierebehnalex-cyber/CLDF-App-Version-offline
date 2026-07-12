# Testbericht – CLDF Offline-App v4.7.1

Stand: 12. Juli 2026

## Änderung

Die sichtbare Radio-/Senderkatalog-Box wurde aus der App-Oberfläche entfernt. Die importierten Katalogdaten bleiben intern eingebunden. Sichtbare Radio-Hinweise wurden aus manueller Liedauswahl, Diagnose und Versionsanzeige entfernt. Der Live-Titelabruf wurde aus dem aktiven App-Code entfernt.

## Prüfungen

- JavaScript-Syntaxprüfung bestanden
- Build-Validierung bestanden
- Radio-Datentest bestanden
- Audio-Fingerprint-Selbsttest bestanden
- Video-Schrittmuster-Selbsttest bestanden
- Get-in-Line-Parser-Test bestanden
- `radioApiSection`, Senderauswahl und Live-Abrufschaltfläche nicht im HTML vorhanden
- keine aktive `fetchCurrentRadioSong`-Funktion mehr vorhanden
- lokale Radio-Datendatei weiterhin eingebunden
- mobile Mehr-Ansicht bei 390 px ohne horizontales Überlaufen
- Originalgrafiken und ursprüngliche CSS-Basis unverändert

Das maschinenlesbare Ergebnis steht zusätzlich in `VALIDIERUNG.json`.
