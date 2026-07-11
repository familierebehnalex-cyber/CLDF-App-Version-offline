# Testbericht – CLDF Offline-App v4.0

Erstellt am 10.07.2026.

## Erfolgreich geprüft

- JavaScript-Syntax aller zentralen Programmdateien
- Vorhandensein der App-, Daten-, Manifest- und Service-Worker-Dateien
- wichtige HTML-Bedienelemente und IDs
- gültiges Web-App-Manifest
- lokaler HTTP-Start über `server.js`
- Sicherheits- und Mikrofon-Header des lokalen Servers
- Get-in-Line-Parser mit den enthaltenen Testdaten
- Audio-Fingerprint-Selbsttest: richtiger 12-Sekunden-Ausschnitt wurde trotz geringerer Lautstärke und leichtem Störsignal eindeutig der richtigen Referenz zugeordnet
- kein AudD-Endpunkt, kein API-Schlüssel und kein externer Audio-Upload im Programmcode
- Datenzahlen und Zusammenführung der CLDF-/Bilddaten

## Ermittelter Datenstand

- 135 CLDF-Grundtänze
- 659 Lied–Tanz-Zuordnungen
- 182 verschiedene Tanznamen in den Bilddaten
- 196 zusammengeführte lokale Tanznamen ohne Get-in-Line
- 582 Lieddatensätze
- 307 Lieddatensätze mit Interpret
- 237 Lieddatensätze mit BPM
- 0 bereits eingebettete Get-in-Line-Tänze

## Noch am Zielgerät zu prüfen

Browser und Handys handhaben Mikrofon, Audioformate und PWA-Installation unterschiedlich. Deshalb müssen vor der Veröffentlichung einmal auf dem vorgesehenen Android-/iPhone-Gerät geprüft werden:

- Mikrofonfreigabe und automatische 12-Sekunden-Aufnahme
- Installation zum Startbildschirm
- Offline-Neustart nach vollständigem ersten Laden
- Erkennung mit den tatsächlich verwendeten Musikdateien und Lautsprechern
- Speicherbedarf einer großen eigenen Fingerprint-Bibliothek
- erster vollständiger Get-in-Line-Abruf

Der Get-in-Line-Katalog konnte in der Erstellungsumgebung wegen fehlendem direkten Netzwerkzugriff des Build-Containers nicht abgerufen werden. Der Parser, Aktualisierer, Laufzeitimport und die GitHub-Aktion sind enthalten und getestet beziehungsweise syntaktisch geprüft.
