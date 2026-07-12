# CLDF Offline-App v4.7.3 – API-Zuordnung pro Song

## Wichtigste Korrektur

Die vom Nutzer gelieferte `data.zip` wird jetzt nicht mehr nur als allgemeiner Radio-Katalog behandelt. Aus den enthaltenen Senderkatalogen, Verlaufsdateien und `station-info.json`-Dateien wurde ein eigener **Song-API-Index** erzeugt.

Für jedes passende Lied stehen nun direkt zur Verfügung:

- laut.fm-API-Song-ID beziehungsweise mehrere Song-IDs
- Senderquelle
- die zum Sender gehörenden API-Endpunkte
- Album, Genre und Veröffentlichungsjahr, soweit in der Sammlung vorhanden
- Spielhäufigkeit und letzter bekannter Sendezeitpunkt
- Tanzvorschläge und exakte Tanzzuordnungen

## Verhalten in der App

- Der Liedabgleich prüft zuerst eine exakte Song-API-Zuordnung aus der gelieferten Sammlung.
- Bei einem Treffer erscheint direkt am Lied die Kennzeichnung **„API-Daten vorhanden“**.
- Song-ID, Quelle und vorhandene Metadaten werden direkt im Lied-Ergebnis angezeigt.
- In der manuellen Liedliste sind API-verknüpfte Titel mit **„API“** markiert.
- Die unerwünschte Box „Lokaler Senderkatalog“ bleibt entfernt.
- Es gibt weiterhin keinen Radioplayer und keine sichtbare Senderauswahl.
- Neue Live-Titel werden im Hintergrund über `current_song` und `last_songs` ergänzt.
- Ohne Internet bleibt der vollständige lokale Song-API-Index verfügbar.

## Datenstand

- 1.254 eindeutige Song-API-Zuordnungen
- 1.254 Einträge mit mindestens einer API-Song-ID
- 5 Senderquellen
- 35 in der Sammlung enthaltene Sender-Endpunkte
- 261 Songs mit Tanzvorschlägen
- 63 Songs mit exakter Tanzzuordnung

## Technische Dateien

Neu:

- `assets/song-api-index.js`
- `data/song-api-index.json`
- `tools/test-song-api-index.js`
- `API-ZUORDNUNG-v4.7.3.md`

Geändert:

- `assets/app.js`
- `assets/styles.css`
- `index.html`
- `404.html`
- `service-worker.js`
- Versions-, Test- und Begleitdateien
