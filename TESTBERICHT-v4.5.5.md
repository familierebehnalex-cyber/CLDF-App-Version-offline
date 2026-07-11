# Testbericht CLDF v4.5.5

## Automatisch geprüft

- JavaScript-Syntax von App, MediaPipe-Auswertung und Service Worker
- alle Offline-Dateien des Service Workers vorhanden
- acht eingebaute Sheet-Muster im Schrittvergleich
- ursprüngliche Grafiken und die ersten 596 CSS-Zeilen unverändert
- Live-Kamera ist im Programm auf mindestens 30 Sekunden festgelegt
- Zwischenstände der Körper- und Schrittauswertung werden während der Aufnahme an die Oberfläche übergeben
- Service-Worker-Cache auf v4.5.5 erhöht

## Noch auf einem echten Handy zu prüfen

- Kamera- und Mikrofonfreigabe
- tatsächliche Dauer der aufgenommenen Datei
- flüssige MediaPipe-Auswertung auf dem jeweiligen Handy
- Sichtbarkeit des Skeletts und der vorläufigen Schritt-/Tanzanzeige
- Erkennungsqualität bei unterschiedlichen Abständen, Lichtverhältnissen und Tanzgeschwindigkeiten

Die technische Logik ist eingebaut. Eine zuverlässige Benennung aller Tänze ist derzeit nur für Tänze mit maschinenlesbarem Sheet-Muster oder eigener Bewegungsreferenz möglich. Aktuell sind acht Sheet-Muster enthalten.
