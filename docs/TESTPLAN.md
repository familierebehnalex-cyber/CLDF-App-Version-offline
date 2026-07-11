# Testplan CLDF Offline-App v4.0

## Start und Offline

1. `STARTEN-AM-PC.bat` starten.
2. Startseite, Navigation und Version 4.0 prüfen.
3. Browser-Entwicklerwerkzeuge öffnen und auf JavaScript-Fehler prüfen.
4. Seite einmal vollständig laden, Netzwerk auf „Offline“ stellen und neu laden.
5. Suche, Favoriten, Übungslisten, Tanzdetails und Liedlisten prüfen.

## Mikrofon

1. „Lied erkennen“ antippen.
2. Systemabfrage einmal erlauben.
3. Prüfen, dass die Aufnahme automatisch nach ungefähr zwölf Sekunden endet.
4. Ohne Fingerprint muss eine BPM-/Motion-/Rhythmus-Empfehlung erscheinen.
5. Mit eingelesener Referenz muss ein ausreichend sauberer Ausschnitt des gleichen Liedes als Titel erkannt werden.

## Eigene Musikbibliothek

1. Eine eigene Audiodatei einlesen.
2. Zuordnung kontrollieren.
3. Fingerprint-Liste, Export, Import und Löschen testen.
4. Prüfen, dass keine Audiodatei in der App gespeichert wird.

## Get-in-Line

1. `GETINLINE-KATALOG-AKTUALISIEREN.bat` zunächst mit kleinem Testlimit im Terminal prüfen:
   `node tools/sync-getinline.js --limit=10`
2. `data/getinline-dances.json` in der App einspielen.
3. Anzahl, Suchergebnis, Metadaten und direkten Tanzsheet-Link prüfen.
4. Offline prüfen: Metadaten bleiben sichtbar; externer Link benötigt Internet.

## Datenqualität

- abgeschnittene Bildtexte dürfen nicht enthalten sein
- Liedtitel/Interpret nicht raten
- Original-, Live- und Remix-Versionen getrennt behandeln
- direkte Liedzuordnung vor BPM-Vorschlag anzeigen
- mehrere passende Tänze vollständig anzeigen

## Technische Prüfung

```bash
npm run validate
```

Der Bericht wird in `VALIDIERUNG.json` geschrieben.
