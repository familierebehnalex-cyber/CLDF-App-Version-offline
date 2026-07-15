# CLDF Offline-App v4.7.4

## Neu in v4.7.4: weitere API-Sammlungen dedupliziert eingebaut

Die neue `radio-api-sammlung.zip` wurde vor dem Import auf Mehrfachvorkommen geprüft. Aus 3.237 neuen Senderdatensätzen wurden 3.014 normalisierte Liedschlüssel ermittelt. 223 doppelte Zeilen innerhalb der neuen Sammlung und 255 bereits vorhandene Titel wurden zusammengeführt. Das Ergebnis umfasst jetzt **4.011 eindeutige Song-API-Zuordnungen** aus **10 Senderquellen** mit **70 API-Endpunkten**.

Fünf widersprüchliche alte API-Song-IDs wurden nicht automatisch vereinigt, weil sie unterschiedlichen Künstlern oder Liedern zugeordnet waren. Details stehen in `DUBLETTENPRUEFUNG-v4.7.4.md`.

Die App zeigt weiterhin keine Senderkatalog-Box und keinen Radioplayer. Beim jeweiligen Lied erscheint nur die vorhandene Kennzeichnung **„API-Daten vorhanden“**. Online werden im Hintergrund `current_song` und `last_songs` der hinterlegten Sender abgefragt; offline bleibt der vollständige lokale Katalog verfügbar.

## Musikerkennung

Die Audioaufnahme und die Fingerprint-Auswertung bleiben lokal. Die Radio-API-Metadaten erkennen nicht selbst die Aufnahme, sondern ergänzen ein bereits erkanntes oder manuell ausgewähltes Lied um Song-ID, Quelle, Album, Genre, Jahr und Tanzzuordnung.

## Datenbestand

- 4.502 Quelldatensätze vor senderübergreifender Zusammenführung
- 4.011 eindeutige Song-API-Einträge
- 10 Senderquellen und 70 Endpunkte
- 338 Einträge mit Tanzvorschlägen
- 143 Einträge mit exakter lokaler Tanzzuordnung
- 21 Jingles beziehungsweise Senderhinweise aus dem spielbaren Liedkatalog ausgeschlossen
- keine API-Schlüssel und keine laufenden Kosten

## Installation auf GitHub Pages

Den vollständigen Inhalt des ZIP-Archivs direkt in den Stamm des Repositorys kopieren und vorhandene Dateien ersetzen. GitHub Pages muss aus `main` und `/(root)` bereitstellen. Nach dem Deployment die Seite einmal vollständig neu laden; der Service Worker v4.7.4 ersetzt den alten Cache.

## Lokale Prüfung

```bash
npm run validate
npm start
```

Die App enthält weiterhin lokale Tanzsuche, Lied–Tanz-Zuordnung, Favoriten, Übungslisten, Audio-Fingerprints, MediaPipe-Videoanalyse, Get-in-Line-Import sowie Seiten für Datenschutz, Urheberrecht, Designschutz, Impressum und Lizenzen.
