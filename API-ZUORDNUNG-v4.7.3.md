# Songbezogene API-Zuordnung in CLDF v4.7.3

## Was aus `data.zip` übernommen wurde

Die bereitgestellte Sammlung enthält keine einzelnen ausführbaren API-Dateien pro Lied. Sie enthält jedoch für jedes gesammelte Lied API-Metadaten, insbesondere `apiSongIds`, Senderquellen und die API-Endpunkte der jeweiligen Sender.

Die App bereitet diese Daten nun als eigenen Song-API-Index auf. Ein Lied wird über den normalisierten Titel und Interpreten mit diesem Index verbunden. Zusätzlich bleiben die API-Song-IDs als eindeutige Herkunftsmerkmale erhalten.

## Verwendete API-Endpunkte

Für jeden der fünf Sender sind folgende Endpunkte aus der gelieferten Sammlung hinterlegt:

- `station`
- `current_song`
- `last_songs`
- `next_artists`
- `playlists`
- `schedule`
- `listeners`

Für die automatische Aktualisierung des Liedkatalogs werden `current_song` und `last_songs` verwendet. Die übrigen Endpunkte bleiben als Quelleninformation beim jeweiligen Sender hinterlegt, werden aber nicht unnötig im Hintergrund aufgerufen.

## Liedabgleich

1. Audio-Fingerprint oder Dateiname liefert Liedtitel und Interpret.
2. Die App sucht zuerst nach einer exakten Zuordnung im Song-API-Index.
3. Bei einem Treffer werden API-Song-ID, Senderquelle und Metadaten an das Lied angehängt.
4. Exakte Tanznamen aus der API-Sammlung werden mit der lokalen Tanzdatenbank verbunden.
5. Erst wenn kein exakter API-Treffer vorhanden ist, folgt der bisherige unscharfe Titel-/Interpretvergleich.

## Sichtbarkeit

Die große Senderkatalog-Box ist weiterhin nicht vorhanden. Eine API-Kennzeichnung erscheint ausschließlich direkt beim ausgewählten oder erkannten Lied.
