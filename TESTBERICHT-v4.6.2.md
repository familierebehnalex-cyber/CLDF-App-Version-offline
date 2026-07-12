# Testbericht – CLDF Offline-App v4.6.2

Erstellt am 12. Juli 2026.

## Ergebnis

Der automatisierte Build- und Quellcode-Prüflauf wurde ohne Fehler abgeschlossen. Die neue Fassung enthält die Rechteseiten, die zentrale Löschfunktion und die Datenschutzhinweise vor Mikrofon- und Kameranutzung. Eine rechtliche Einzelfallprüfung wird dadurch nicht ersetzt.

## Erfolgreich geprüft

- JavaScript-Syntax von App, lokalem Speicher und Service Worker
- Vorhandensein aller Pflicht-, Daten-, PWA-, MediaPipe- und Rechtedateien
- wesentliche Bedienelemente einschließlich zentraler Löschfunktion
- Get-in-Line-Parser: alle Tests bestanden
- Audio-Fingerprint-Selbsttest: 393 Stimmen, 99 % Testsicherheit
- Video-Schrittmuster: alle 8 Startermuster auf Platz 1, jeweils 99 % im synthetischen Test
- lokaler Serverabruf der Startseite, Datenschutzhinweise, des Impressums, der App-Datei und des Service Workers: HTTP 200
- alle lokalen Links und Dateien in 7 HTML-Seiten: 0 fehlerhafte Verweise
- keine bekannten Tracking- oder externen Musikerkennungs-Endpunkte in den aktiven App-Dateien
- MediaPipe Pose / BlazePose GHUM Lite vollständig lokal vorhanden
- ursprüngliche 596 CSS-Basiszeilen unverändert
- ursprüngliche Hero-Grafiken und zentralen App-Symbole bytegenau unverändert
- mobile statische Darstellung der Rechtskarte bei 412 Pixel Breite ohne horizontales Überlaufen
- Löschschaltfläche sichtbar; 7 Rechts-/Vereinslinks vorhanden

## Datenschutz- und Löschprüfung auf Quellcodeebene

Die zentrale Funktion entfernt sämtliche unter `STORAGE` geführten Local-Storage-Einträge sowie beide IndexedDB-Bereiche für Audio-Fingerprints und Katalogdaten. Laufende Medien-Tracks werden vor der Löschung beendet. Anschließend lädt die App neu.

Der Offline-Cache wird bewusst nicht als Nutzerdatum gelöscht, da er nur die technischen App-Dateien und Rechteseiten enthält. Browserberechtigungen für Mikrofon und Kamera müssen weiterhin in den Browser- oder Geräteeinstellungen verwaltet werden.

## Datenstand

- 135 CLDF-Grundtänze
- 659 Bild-Zuordnungen
- 182 unterschiedliche Tanznamen in den Bilddaten
- 196 zusammengeführte lokale Tanznamen ohne Get-in-Line
- 582 Lieddatensätze
- 307 Lieddatensätze mit Interpret
- 237 Lieddatensätze mit BPM
- 8 symbolische Video-Schrittmuster
- Live-Kamera-Mindestdauer: 30 Sekunden
- Mikrofonaufnahme: ungefähr 12 Sekunden

## Noch auf realen Geräten zu prüfen

- Mikrofon- und Kameraberechtigung auf den vorgesehenen Android- und iPhone-Geräten
- Löschfunktion mit tatsächlich angelegten Favoriten, Fingerprints, Katalogen und Bewegungsreferenzen
- PWA-Installation und Offline-Neustart nach vollständigem Erstladen
- externe Links und Zurücknavigation auf Mobilgeräten
- lesbare Darstellung aller Rechteseiten in den eingesetzten Browsern
- tatsächlicher Hosting-Anbieter, Serverprotokolle und Löschfristen

## Einschränkung der Build-Umgebung

Die App-Dateien und Rechteseiten wurden über den lokalen Server erfolgreich per HTTP abgerufen. Eine vollständige interaktive Browsernavigation zum lokalen Server war in der Build-Umgebung durch eine lokale URL-Richtlinie blockiert. Die Rechtskarte wurde deshalb zusätzlich statisch mit Chromium im mobilen Viewport gerendert und geprüft.
