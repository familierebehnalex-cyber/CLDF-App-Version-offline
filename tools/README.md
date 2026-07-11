# Werkzeuge

## Get-in-Line-Katalog

`sync-getinline.js` liest das Tanzverzeichnis und die einzelnen Tanzseiten ein. Gespeichert werden ausschließlich Metadaten und Original-Links.

```bash
npm run sync:getinline
npm run sync:getinline:full
npm run test:getinline
```

Ein begrenzter Testabruf:

```bash
node tools/sync-getinline.js --limit=10 --concurrency=2 --delay=500
```

## Audio-Fingerprints

`fingerprint-builder.html` erstellt im Browser aus eigenen Musikdateien lokale Audio-Fingerprints. Die Musik wird nicht gespeichert. Die erzeugte Datei kann mit `install-fingerprints.js` fest in die App eingebaut werden.

```bash
node tools/install-fingerprints.js CLDF-Audio-Fingerprints.json
npm run test:fingerprint
```

## Gesamtprüfung

```bash
npm run validate
```
