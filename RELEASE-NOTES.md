# CLDF Offline-App v4.7.2 – echte Live-API im Hintergrund

- echte Online-Abfragen der öffentlichen laut.fm-API eingebaut
- beim Online-Start und danach frühestens etwa alle zehn Minuten werden `current_song` und `last_songs` für fünf Sender abgerufen
- neue Titel werden unsichtbar in den vorhandenen Liedkatalog übernommen
- Linedance-Nahetal-Titel im Muster `Lied – Tanz` liefern weiterhin konservative Tanzvorschläge
- bis zu 500 Live-Metadatensätze werden lokal als Offline-Fallback gespeichert
- keine sichtbare Senderbox, keine Senderauswahl und kein Radioplayer
- keine API-Schlüssel, Musikdateien oder Radiostreams erforderlich
- Datenschutz- und Lizenzhinweise an den aktiven Live-Abruf angepasst
- App-, Cache- und Paketversion auf 4.7.2 aktualisiert

---

# CLDF Offline-App v4.7.1 – Radio-Daten im Hintergrund

- die sichtbare Box „Lokaler Senderkatalog / Radio-API-Sammlung“ wurde vollständig aus „Mehr“ entfernt
- sichtbare Radio-API- und Senderhinweise wurden aus Liedauswahl, Diagnose und Versionsanzeige entfernt
- die importierten Lied- und Tanzzuordnungsdaten bleiben intern in der lokalen Suche verfügbar
- ohne sichtbare Schaltfläche wird kein Live-Senderabruf durch den Nutzer ausgelöst
- Offline-Cache und App-Version auf 4.7.1 aktualisiert

---

# CLDF Offline-App v4.7.0 – Radio-API-Integration

## Neu

- 1.265 gesammelte Radio-API-Datensätze aus fünf laut.fm-Sendern eingelesen
- 1.254 eindeutige Lied-/Interpret-Einträge zusammengeführt
- 1.239 abspielbare Liedmetadatensätze lokal und offline durchsuchbar
- 263 Tanzvorschläge aus Senderdaten, davon 63 exakt mit vorhandenen Tänzen verknüpft
- Linedance-Nahetal-Muster `Lied – Tanz` konservativ ausgewertet
- Radio-Lieder erweitern Liedsuche, Dateinamensuche und Fingerprint-Zuordnung
- optionaler aktueller Titel über die laut.fm-API, ausschließlich nach bewusstem Klick
- Datenschutz- und Urheberrechtstexte um die Radio-API ergänzt
- Jingles und Promos bleiben im Quellarchiv, werden aber nicht als Lieder angeboten

## Unverändert

- keine Musikdateien oder Radiostreams im Offline-Katalog
- keine API-Schlüssel erforderlich
- Mikrofon-, Audio- und Videoanalyse bleiben lokal
- ursprüngliche Grafiken und CSS-Basis bleiben unverändert


## Vorheriger Stand

# CLDF-App v4.7.0 – Datenschutz, Urheberrecht und Designschutz

- vollständige, technisch abgeglichene Datenschutzhinweise ergänzt
- Impressum innerhalb der App ergänzt
- Urheberrechts- und Quellenhinweise erweitert
- vorsichtige Designschutz-Seite ohne Behauptung einer bestehenden Registrierung ergänzt
- Drittanbieter-Lizenzseite für MediaPipe ergänzt
- zentrale Funktion zum Löschen aller lokalen Nutzerdaten ergänzt
- Hosting-/externe-Link-Hinweise präzisiert
- interne Versionsangaben auf v4.7.0 vereinheitlicht
- Service-Worker-Cache und Offline-Dateiliste aktualisiert

# CLDF-App v4.5.5

- Live-Kamera-Aufnahme auf mindestens 30 Sekunden verlängert.
- Schrittmerkmale werden während der laufenden Kameraaufnahme ausgewertet.
- Vorläufige Tanzvorschläge werden live aus Sheet-Mustern und eigenen Bewegungsreferenzen berechnet.
- Hochkant-Aufnahme und Originaldesign bleiben erhalten.

# Release Notes – CLDF Offline-App v4.5

## Neu

- MediaPipe Pose vollständig lokal eingebaut
- 33 Körperpunkte für Oberkörper, Hüfte, Knie, Knöchel, Fersen und Fußspitzen
- Live-Kameraanalyse mit automatischem 18-Sekunden-Ablauf
- Skelettanzeige während der Liveaufnahme
- Schrittmerkmale wie Side, Forward, Back, Cross, Touch, Kick, Hitch und Turn
- Vergleich eigener Referenzvideos über Pose- und Schritt-Signaturen
- maschinenlesbarer Sheet-Schrittvergleich
- acht vorbereitete Startermuster
- kombinierter Treffer, wenn Referenzvideo und Sheet-Muster denselben Tanz stützen
- klare Beta-Kennzeichnung ohne falsche „sicher erkannt“-Aussage

## Beibehalten

- ursprüngliche CLDF-Grafiken, Farben und Grundaufbau
- Lied–Tanz-Zuordnung hat Vorrang
- lokale Audio-Fingerprints
- BPM, Motion und Rhythmus nur als Reserve
- Offline-PWA und GitHub-Pages-Unterstützung
- Get-in-Line-Metadaten und externe Tanzsheet-Links

## Grenzen

- Noch keine vollständigen Sheet-Muster für alle Tänze
- keine Garantie bei verdeckten Füßen, Kamerabewegung oder mehreren Personen
- eigene Referenzvideos verbessern die Erkennung deutlich

## v4.5.6
- Startbildschirm bleibt bis zum bewussten Öffnen sichtbar.
- Untere Navigation für mobile Viewports und Safe-Areas stabilisiert.
