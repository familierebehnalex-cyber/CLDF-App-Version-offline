# CLDF Offline-App v4.7.8 – flexible Live-Kamera

## Neu

- Auswahl zwischen den vom Gerät angebotenen Front-, Rück- und Ultraweitwinkelkameras.
- Hochformat und Querformat direkt vor der Live-Analyse auswählbar.
- Zoom-/Bildausschnittregler über `MediaStreamTrack.getCapabilities()` und `applyConstraints()`, sofern vom Gerät unterstützt.
- niedrigste verfügbare Zoomstufe wird als Ausgangspunkt verwendet.
- Kameravorschau und Aufnahme werden nicht mehr zwangsweise beschnitten.
- Ganzkörperrahmen mit automatischer Prüfung von Kopf, Schultern, Hüfte, Knien und Füßen.
- verständliche Hinweise bei fehlenden Füßen, zu geringem Abstand oder zu wenig seitlichem Platz.
- Analyse startet erst nach ausdrücklichem Tippen auf „Analyse starten“.
- bevorzugte Kamera, Orientierung und Zoomstufe werden lokal gespeichert.
- PWA-Orientierung auf `any` gesetzt, damit Querformat auch in der installierten App funktioniert.
- Service-Worker-Cache auf v4.7.8 erhöht.

## Unverändert

- Video und Körperpunkte werden lokal verarbeitet.
- Die 3.480 eingebauten Audio-Fingerprints bleiben unverändert.
- Liedtreffer und feste Lied–Tanz-Zuordnungen haben weiterhin Vorrang vor Video-Vorschlägen.
