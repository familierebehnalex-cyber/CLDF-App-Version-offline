# Testplan CLDF Offline-App v4.7.6

## Start, Version und Offline

1. `STARTEN-AM-PC.bat` starten.
2. Startseite, ursprüngliche Grafik, Navigation und sichtbare Version 4.7.6 prüfen.
3. Browser-Entwicklerwerkzeuge öffnen und auf JavaScript-Fehler prüfen.
4. Seite einmal vollständig laden, Netzwerk auf „Offline“ stellen und neu laden.
5. Suche, Favoriten, Übungslisten, Tanzdetails und Liedlisten prüfen.
6. Datenschutz, Impressum, Urheberrecht, Designschutz und Lizenzen auch offline öffnen.

## Mikrofon und Datenschutzhinweis

1. Prüfen, dass vor der Bedienung ein Hinweis auf lokale Verarbeitung sichtbar ist.
2. „Lied erkennen“ antippen und die Systemabfrage erlauben.
3. Prüfen, dass die Aufnahme automatisch nach ungefähr zwölf Sekunden endet.
4. Ohne Fingerprint darf nur eine klar unsichere BPM-/Rhythmus-Empfehlung erscheinen.
5. Mit eigener Referenz muss ein sauberer Ausschnitt desselben Liedes erkannt werden.
6. In den Netzwerkwerkzeugen prüfen, dass die Aufnahme nicht hochgeladen wird.

## Live-Kamera und MediaPipe

1. Prüfen, dass vor der Kameranutzung ein Hinweis auf lokale Verarbeitung sichtbar ist.
2. „Live-Kamera starten“ antippen.
3. Kamera erlauben; bei abgelehntem Mikrofon muss die Körperanalyse weiter möglich sein.
4. Eine Person vollständig einschließlich Füßen aufnehmen.
5. Skelett-Overlay, Fortschritt und automatisches Ende nach mindestens 30 Sekunden prüfen.
6. Prüfen, dass ohne sicheren Liedtreffer nur „Beta-Vorschlag“ angezeigt wird.
7. Electric Slide oder einen anderen eingebauten Startertanz testen.
8. Mit bewegter Kamera, verdeckten Füßen und schlechtem Licht wiederholen; die Bewertung soll vorsichtiger werden.

## Video und eigene Referenzen

1. Ein vorhandenes Video auswählen und Körper-/Schrittauswertung prüfen.
2. Ein eigenes Referenzvideo einlesen.
3. Kontrollieren, dass nur die Bewegungssignatur gespeichert wird.
4. Ein zweites Video desselben Tanzes vergleichen.
5. Referenz wieder löschen und prüfen, dass das Sheet-Muster separat weiter funktioniert.

## Zentrale Datenlöschung

1. Testdaten anlegen: Favorit, Übungstanz, Verlauf, Einstellung, Audio-Fingerprint, Katalog und Bewegungsreferenz.
2. Unter „Mehr → Datenschutz, Rechte & Impressum“ die zentrale Löschfunktion öffnen.
3. Abbrechen testen: Daten müssen erhalten bleiben.
4. Löschung bestätigen: App muss neu laden.
5. Danach `localStorage` und beide IndexedDB-Speicher kontrollieren; Nutzerdaten müssen leer sein.
6. Prüfen, dass die App selbst und die Rechteseiten weiterhin offline starten.

## Get-in-Line und externe Links

1. `node tools/sync-getinline.js --limit=10` als kleinen Testlauf ausführen.
2. Katalog einspielen und Anzahl, Suche, Metadaten und Tanzsheet-Link prüfen.
3. Offline prüfen: lokale Metadaten bleiben sichtbar; der externe Link benötigt Internet.
4. Externe Website-/YouTube-Links dürfen erst nach dem Anklicken laden.

## Technische Prüfung

```bash
npm run test:video-steps
npm run test:fingerprint
npm run validate
```

Der Bericht wird in `VALIDIERUNG.json` geschrieben.

## Audio-Erkennung v4.7.6

1. Bei leerer Fingerprint-Datenbank auf „Lied erkennen“ tippen.
2. Prüfen, dass der Hinweis „Es fehlen Musikreferenzen“ erscheint und keine Titelerkennung vorgetäuscht wird.
3. Prüfen, dass 1.959 eingebaute Audio-Referenzen angezeigt werden und keine Benutzerdatei verlangt wird.
4. Prüfen, dass die Anzahl der Audio-Referenzen steigt.
5. Einen Ausschnitt desselben Liedes aufnehmen und Ergebnis, Zuordnung sowie Fallback prüfen.
