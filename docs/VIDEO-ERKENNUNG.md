# Video-, Körper- und Schritterkennung

## Technik

Die App nutzt die lokal eingebundene MediaPipe-Pose-Lösung mit BlazePose GHUM Lite. Pro Bild werden 33 Körperpunkte berechnet. Die Videodatei beziehungsweise Livekamera bleibt auf dem Gerät.

Aus den Körperpunkten werden normalisierte Zeitreihen für Füße, Knie, Hüfte, Körperdrehung und Bewegungstempo erstellt. Die App erkennt daraus grobe Line-Dance-Merkmale wie:

- Schritt seitwärts, vorwärts oder zurück
- Kreuzen vor beziehungsweise hinter dem anderen Fuß
- Touch, Kick, Hitch, Heel/Toe und Stomp
- Viertel- und Halbdrehung
- wiederkehrende Gruppen wie Vine oder Shuffle, soweit im Bild eindeutig

## Entscheidungsreihenfolge

1. lokaler sicherer Liedtreffer aus dem Videoton
2. feste Lied–Tanz-Zuordnung
3. eigene MediaPipe-Referenzsignaturen
4. maschinenlesbare Sheet-Schrittmuster
5. BPM als Reserve

Ein Liedtreffer wird durch Video niemals überschrieben. Video kann einen Liedtreffer nur bestätigen oder einen Konflikt als Hinweis anzeigen.

## Referenzsignaturen

Beim Einlesen eines Referenzvideos speichert die App nur:

- resampelte Pose-Merkmale
- erkannte Schritt-Codes
- Bewegungstempo und Drehungszahl
- Qualitäts- und Sichtbarkeitswerte

Das ursprüngliche Video wird nicht im App-Speicher abgelegt.

## Sheet-Muster

Die App enthält keine kopierten vollständigen Schritttexte. Gespeichert werden lediglich symbolische Codes wie `SIDE_R`, `CROSS_L_BEHIND`, `TOUCH_L` oder `TURN_QUARTER_L`. Der lokale Matcher nutzt eine zeitlich flexible Sequenzbewertung, damit unterschiedliche Tanzgeschwindigkeiten toleriert werden.

## Aufnahmehinweise

- nur eine tanzende Person
- Oberkörper und Füße immer sichtbar
- Kamera fest aufstellen
- möglichst frontale oder rückwärtige Ganzkörperansicht
- gutes Licht und wenig Verdeckung
- mindestens 15 Sekunden zusammenhängend tanzen

## Status

Die Funktion ist Beta. Sie liefert Wahrscheinlichkeiten und Vorschläge, keine sportrechtlich oder medizinisch belastbare Bewegungsbewertung.
