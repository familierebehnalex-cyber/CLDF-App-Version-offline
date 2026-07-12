# CLDF-App v4.6.2 – Datenschutz, Urheberrecht und Designschutz

- vollständige, technisch abgeglichene Datenschutzhinweise ergänzt
- Impressum innerhalb der App ergänzt
- Urheberrechts- und Quellenhinweise erweitert
- vorsichtige Designschutz-Seite ohne Behauptung einer bestehenden Registrierung ergänzt
- Drittanbieter-Lizenzseite für MediaPipe ergänzt
- zentrale Funktion zum Löschen aller lokalen Nutzerdaten ergänzt
- Hosting-/externe-Link-Hinweise präzisiert
- interne Versionsangaben auf v4.6.2 vereinheitlicht
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
