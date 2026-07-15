# Dublettenprüfung – CLDF v4.7.4

## Ergebnis

- neue Rohdatensätze: 3.237
- eindeutige neue Liedschlüssel vor API-ID-Aliasprüfung: 3.014
- erkannte Dublettengruppen innerhalb der neuen Sammlung: 202
- zusammengeführte doppelte Zeilen: 223
- Überschneidungen mit der bisherigen App: 255
- neue Liedschlüssel: 2.759
- endgültige eindeutige Song-API-Einträge: 4.011

## Nicht automatisch zusammengeführte Konflikte

Die folgenden API-Song-IDs wurden in der vorhandenen Sammlung unterschiedlichen Künstlern oder Titeln zugeordnet. Sie bleiben getrennt, damit keine falsche Liedzuordnung entsteht.

- `19470519`: Casey James – Drive / Jason Boland & The Stragglers – Drive
- `19470509`: Rhett Adkins – Driving my life away / Rhett Akins – Driving My Life Away
- `19470393`: Garth Brooks – If Tomorrow Never Comes / Ronan Keating – If tomorrow never comes
- `19470562`: Gary Barlow – Let me go / Hailee Steinfeld & Alesso ft. Florida Georgia Line & Watt – Let Me Go
- `19470862`: Backstrom – The Gambler / Kenny Rogers – The Gambler

## Importregel

Zusammengeführt wurde bei identischem normalisiertem Lied-/Interpret-Schlüssel. Eine gemeinsame API-Song-ID wurde nur dann zusätzlich als Alias verwendet, wenn Künstler und Titel ausreichend übereinstimmten.
