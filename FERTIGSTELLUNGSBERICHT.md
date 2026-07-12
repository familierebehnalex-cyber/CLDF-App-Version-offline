# Fertigstellungsbericht – CLDF Offline-App v4.7.2

Stand: 12. Juli 2026

## Ergebnis

Die bisher nur lokal eingebundene Radio-Sammlung wurde um einen echten Live-Abruf der öffentlichen laut.fm-API ergänzt. Die Radio-Oberfläche bleibt vollständig ausgeblendet.

## Live-API

- fünf hinterlegte laut.fm-Sender
- Abruf von `current_song` und `last_songs`
- Startabruf bei bestehender Internetverbindung
- weitere Aktualisierung frühestens etwa alle zehn Minuten
- Zeitlimit pro Anfrage: acht Sekunden
- keine API-Schlüssel oder Zugangsdaten
- keine Musikdateien, Radiostreams oder Senderlogos
- Jingles und Promos werden nicht in den Liedkatalog übernommen
- bis zu 500 zuletzt abgerufene Einträge als lokaler Offline-Fallback

## Einbindung in die App

Aktuelle Titel und Interpreten werden unsichtbar mit dem vorhandenen Liedkatalog zusammengeführt. Beim Sender Linedance Nahetal wird das Muster `Lied – Tanz` konservativ ausgewertet. Ein Tanzvorschlag wird nur dann fest verknüpft, wenn sein normalisierter Name exakt zu einem vorhandenen Tanz passt.

## Datenschutz

Mikrofon-, Kamera-, Audio- und Videodaten werden weiterhin nicht an laut.fm übertragen. Beim API-Abruf entstehen nur die technisch notwendigen Verbindungsdaten. Die Datenschutzerklärung und Lizenzhinweise wurden an diesen Stand angepasst. Der lokale Live-API-Cache wird von der zentralen Funktion „Alle lokalen Nutzerdaten löschen“ mit entfernt.

## Gestaltung

Die unerwünschte Box „Lokaler Senderkatalog“ bleibt entfernt. Es gibt weiterhin keine sichtbare Senderauswahl, keinen Live-Titel-Button und keinen Radioplayer.

## Prüfung

- JavaScript-Syntax: bestanden
- statischer Radio-Katalogtest: bestanden
- neuer Live-API-Selbsttest: bestanden
- Jingle-Filter: bestanden
- Linedance-Titelparser: bestanden
- Offline-Fallback: bestanden
- Audio-Fingerprint-Selbsttest: bestanden
- Video-Schrittmuster: 8 von 8 bestanden
- Get-in-Line-Parser: bestanden
- Originalgrafiken und ursprüngliche CSS-Basis: unverändert
