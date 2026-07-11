# Get-in-Line-Metadatenimport

Der Import übernimmt ausschließlich sachliche Metadaten und den Link zum jeweiligen Original-Tanzsheet:

- Tanzname
- Musik und Interpret
- Choreograf/in
- Level
- Counts und Walls
- Tags, Restarts, Bridges, Breaks und Ending
- Veröffentlichungs-/Änderungsdatum, soweit vorhanden
- direkter Tanzsheet-Link

Vollständige Schrittbeschreibungen werden nicht in die App kopiert.

## Aktualisierung

```bash
npm run sync:getinline
```

Der normale Lauf ergänzt neue und bisher fehlgeschlagene Seiten. Ein vollständiger Neuabruf erfolgt mit:

```bash
npm run sync:getinline:full
```

Optionen:

```bash
node tools/sync-getinline.js --limit=100 --concurrency=2 --delay=500
```

Der Importer speichert regelmäßig Zwischenstände in:

- `data/getinline-dances.json`
- `assets/getinline-data.js`
- `data/getinline-sync-checkpoint.json`

Die App ergänzt BPM, Taktart, Motion und Rhythmus nur bei eindeutiger Übereinstimmung mit ihren lokalen Liedmetadaten. Unklare Werte bleiben „Zu prüfen“.

## Laufzeitimport

Eine erzeugte `getinline-dances.json` kann in der App unter **Mehr → Get-in-Line-Katalog** eingespielt werden. Sie wird dann lokal in IndexedDB gespeichert und steht offline zur Verfügung.
