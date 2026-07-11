# Fertigstellungsbericht – CLDF Offline-App v4.0

## Umgesetzt

Die gelieferte Online-App wurde zu einer serverunabhängigen, installierbaren Offline-PWA ausgebaut. Das vorhandene Layout und die ursprüngliche CSS-Datei wurden beibehalten.

### Lied- und Tanzerkennung

- automatische Mikrofonaufnahme von ungefähr zwölf Sekunden
- einmalige Systemfreigabe des Mikrofons
- lokale Audio-Fingerprint-Engine
- direkte Lied–Tanz-Zuordnung mit mehreren Liedern pro Tanz und mehreren Tänzen pro Lied
- Rückfall auf BPM, Taktart, Motion und Rhythmus
- Sicherheitsbewertung und alternative Tanzvorschläge
- keine dauerhafte Speicherung der Mikrofonaufnahme

### Daten

- 135 CLDF-Grundtänze
- 659 Bild-Zuordnungen; abgeschnittene Angaben ausgeschlossen
- 196 lokale eindeutige Tanznamen vor Get-in-Line
- 582 Lieddatensätze
- 237 Lieddatensätze mit BPM
- lokale Motion-/Rhythmusregeln

### Get-in-Line

Der Importer liest nur die vereinbarten Metadaten und den Original-Tanzsheet-Link ein. Die App kann einen erzeugten Katalog fest eingebettet oder zur Laufzeit aus IndexedDB verwenden. Eine wöchentliche/manuelle GitHub-Aktion ist enthalten.

## Nicht als fremder Inhalt mitgeliefert

- keine Musikdateien oder kommerziellen Referenzaufnahmen
- keine vollständigen Get-in-Line-Schrittbeschreibungen
- kein vorab vollständig abgerufener Get-in-Line-Katalog; dieser wird über den mitgelieferten Aktualisierer erzeugt

Diese Grenzen verhindern nicht die Nutzung: Nach dem einmaligen Einlesen eigener Musik und dem einmaligen Katalogabruf läuft die Erkennung und Suche lokal; nur externe Tanzsheet-Links benötigen Internet.
