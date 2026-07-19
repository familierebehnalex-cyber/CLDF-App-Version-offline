# Testbericht – CLDF Offline-App v4.7.8

Stand: 19. Juli 2026

## Bestandene automatische Prüfungen

- JavaScript-Syntax von `app.js`, `video-motion.js` und `service-worker.js`
- vollständige Build-Validierung
- Get-in-Line-Parser
- Audio-Fingerprint-Selbsttest mit 3.480 eingebauten Referenzen
- Video-Schrittmuster-Selbsttest
- Radio-, Live-Radio-, Song-API- und Dubletten-Selbsttests
- unveränderte Originalgrafiken und unveränderte CSS-Basis
- 14 Fingerprint-Pakete vollständig lesbar

## Kamera-spezifische Prüfungen

- Kameraauswahl über `enumerateDevices()` vorhanden
- Kamerawechsel über `deviceId`-Constraints vorhanden
- Hoch-/Querformat-Constraints vorhanden
- erzwungenes `crop-and-scale` entfernt; Vorschau nutzt `contain`
- Zoomfähigkeiten werden über `getCapabilities()` geprüft
- Zoom wird über `applyConstraints()` gesetzt
- Ganzkörperbewertung erkennt fehlenden Kopf oder fehlende Füße
- synthetischer vollständiger Pose-Datensatz wird als aufnahmebereit bewertet
- Manifest erlaubt beide Bildschirmorientierungen
- Cache-Version v4.7.8

## Gerätegrenze

Nicht jedes Smartphone stellt Zoom oder einzelne Objektive im Browser bereit. Der Regler wird dann als nicht unterstützt angezeigt. Die endgültige Bildqualität und Kameraauswahl müssen einmal auf dem Zielhandy geprüft werden.
