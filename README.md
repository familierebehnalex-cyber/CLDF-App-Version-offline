# CLDF Offline-App v4.1

Installierbare Line-Dance-PWA auf Basis des gelieferten CLDF-Designs. Die Kernfunktionen laufen lokal: Tanzsuche, Lied–Tanz-Zuordnung, Favoriten, Übungslisten, BPM-Analyse, Motion-/Rhythmusregeln und – nach einmaligem Einlesen eigener Musik – Audio-Fingerprint-Erkennung.

## Bedienung

Der Benutzer tippt auf **„Lied erkennen“**. Die App fordert beim ersten Mal die offizielle Mikrofonfreigabe des Handys/Browsers an, nimmt ungefähr zwölf Sekunden auf und beendet die Aufnahme automatisch. Danach gilt folgende Reihenfolge:

1. lokaler Audio-Fingerprint-Treffer;
2. feste Lied–Tanz-Zuordnung;
3. BPM-, Taktart-, Motion- und Rhythmusbewertung als Reserve;
4. Anzeige des besten Tanzes und weiterer sinnvoller Vorschläge.

Audioaufnahmen werden nicht hochgeladen und nicht dauerhaft gespeichert.

## Eigene Musikbibliothek

Unter **Mehr → Eigene Musikbibliothek** können rechtmäßig vorhandene Audiodateien einmalig eingelesen werden. Gespeichert werden nur akustische Merkmale in IndexedDB. Die Referenzen können als JSON gesichert, auf ein anderes Gerät übertragen oder gelöscht werden.

Für eine fertig vorbereitete Vereinsausgabe können Referenzen mit `MUSIKREFERENZEN-ERSTELLEN.bat` erzeugt und mit `FINGERPRINTS-EINBAUEN.bat` fest in `assets/audio-fingerprints.js` eingebaut werden. Dann müssen die späteren Benutzer nur noch auf **„Lied erkennen“** tippen.

Ohne solche Referenzen kann eine rein lokale Web-App keinen beliebigen kommerziellen Titel zuverlässig benennen. In diesem Fall bleiben BPM-Analyse und Tanzempfehlungen verfügbar.

## Lokale Tanz- und Lieddaten

- 135 ursprüngliche CLDF-Tänze
- 659 vollständige Lied–Tanz-Zuordnungen aus den Benutzerbildern
- 196 eindeutige lokale Tanznamen vor Get-in-Line
- 582 Lieddatensätze
- 237 Einträge mit BPM
- Taktart, Motion und Rhythmus, sofern eindeutig
- keine abgeschnittenen oder mit „…“ verkürzten Bildangaben

Ein Lied kann mehreren Tänzen und ein Tanz mehreren Liedern zugeordnet sein.

## Get-in-Line

Der Importer übernimmt ausschließlich die vereinbarten Metadaten:

- Tanzname
- Lied und Interpret
- Choreograf/in
- Schwierigkeitsgrad
- Counts und Walls
- Tags, Restarts, Bridges, Breaks und Ending
- direkter Link zum jeweiligen Get-in-Line-Tanzsheet

BPM, Taktart, Motion und Rhythmus werden anhand der lokalen Lieddaten ergänzt, sofern eine eindeutige Zuordnung möglich ist. Vollständige Schrittbeschreibungen werden nicht kopiert.

### Lokal aktualisieren

```text
GETINLINE-KATALOG-AKTUALISIEREN.bat
```

oder im Terminal:

```bash
npm run sync:getinline
```

Für einen kompletten Neuabruf:

```bash
npm run sync:getinline:full
```

Der Vorgang speichert Zwischenstände. Aufgrund der Größe des Archivs kann der erste Durchlauf lange dauern. Der in dieser ZIP enthaltene Katalog ist zunächst leer, weil der Abruf in der Erstellungsumgebung nicht ausgeführt werden konnte. Importer, Laufzeit-Import und automatische GitHub-Aktion sind vollständig enthalten.

## Installation

### Windows-Test

1. Node.js 18+ installieren.
2. ZIP entpacken.
3. `STARTEN-AM-PC.bat` starten.

### Handy

Die App einmal über HTTPS bereitstellen und installieren. Dafür sind zwei fertige Möglichkeiten enthalten:

- `.github/workflows/deploy-pages.yml` für GitHub Pages
- `render.yaml` und `server.js` für einen einfachen Node-Host

Nach der Installation ist die Kern-App offline nutzbar. Externe Tanzsheet-Links benötigen weiterhin Internet.

## Datenschutz

- kein AudD und kein externer Erkennungsdienst
- keine API-Schlüssel
- Mikrofon erst nach bewusster Benutzeraktion
- Aufnahme wird nur lokal verarbeitet
- Audio-Fingerprints und importierte Kataloge liegen im Browser-IndexedDB
- Lösch-, Export- und Importfunktionen sind in der App vorhanden

## Entwicklung und Prüfung

```bash
npm run validate
npm start
```

`VALIDIERUNG.json` enthält die ermittelten Datenzahlen und technischen Prüfungen.
