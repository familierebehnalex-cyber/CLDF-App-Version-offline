# CLDF Offline-App v4.7.9 – Bewegungsreferenzen fest eingebaut

Stand: 20. Juli 2026

## Neu

- 128 geprüfte MediaPipe-Bewegungsreferenzen für 127 Tänze fest in der App eingebaut.
- Zwei kompakte Referenzpakete werden erst beim Start einer Videoanalyse in den Arbeitsspeicher geladen.
- Die Referenzen sind im Offline-Cache enthalten; ein manueller Import ist nicht erforderlich.
- Eigene Bewegungsreferenzen können weiterhin ergänzt, exportiert und gelöscht werden.
- Das Löschen eigener Referenzen entfernt die fest eingebauten Referenzen nicht.
- Videovergleich kombiniert weiterhin Bewegungsreferenzen und die acht vorhandenen Sheet-Schrittmuster.
- Cache-Version auf v4.7.9 erhöht.

## Datenqualität

- Nur als „app-ready“ geprüfte Referenzen wurden eingebaut.
- Zwei falsche Tanzzuordnungen, fünf vorläufige Aufnahmen und 18 Referenzen ohne passenden Tanz im aktuellen App-Bestand sind nicht Bestandteil dieses Updates.
- Die Grundschritt-Bibliothek enthält derzeit bewusst keine bestätigten Modelle; falsche Grundschrittmodelle werden nicht ausgeliefert.

## Hinweis

Die Video-Tanzerkennung bleibt eine Beta-Funktion. Ein sicher erkannter Liedtreffer und dessen feste Tanzzuordnung haben weiterhin Vorrang.
