# Fertigstellungsbericht – CLDF Offline-App v4.6.2

## Schwerpunkt dieser Version

Die Fassung v4.6.2 erweitert die bestehende Offline-Line-Dance-App um einen technisch abgeglichenen Rechtsbereich. Das ursprüngliche CLDF-Design, die Hero-Grafiken und die zentralen App-Symbole wurden nicht verändert.

## Neu und überarbeitet

- ausführliche Datenschutzhinweise für Hosting, Mikrofon, Kamera, Dateien, lokale Speicherung, Offline-Cache, externe Links und Betroffenenrechte
- Datenschutzhinweise direkt vor Mikrofon- und Kameranutzung
- eigenes App-Impressum
- überarbeitete Urheberrechts- und Nutzungsregeln
- Designschutz-Seite mit neutralem Status und ohne Behauptung einer Registrierung
- Drittanbieter-Lizenzseite für MediaPipe / BlazePose
- zentrale Schaltfläche zum Löschen lokaler Nutzerdaten
- IndexedDB-Gesamtlöschung für Audio-Fingerprints und Katalogimporte
- Aktualisierung des Service-Worker-Caches und der Offline-Dateiliste
- vereinheitlichte aktuelle App-Version 4.6.2 in Programm- und Datendateien
- rechtliche Prüfliste für Betreiber-, Hosting-, Rechte- und Schutzrechtsfragen

## Technischer Datenschutzstand

Audio, Kamera und Video werden innerhalb der App lokal verarbeitet. Die aktiven App-Dateien enthalten keinen bekannten Tracking-Code und keinen externen Musikerkennungs-Endpunkt. Beim Laden der online veröffentlichten App entstehen weiterhin technisch notwendige Verbindungsdaten beim jeweiligen Hosting-Anbieter. Dessen konkrete Angaben müssen vor Veröffentlichung in die Datenschutzhinweise übernommen werden.

## Zentrale Datenlöschung

Die neue Löschfunktion entfernt Favoriten, Übungslisten, Verlauf, eigene Tänze, Einstellungen, Bewegungsreferenzen, Audio-Fingerprints und importierte Katalogdaten. Der technische Offline-Cache und Browserberechtigungen bleiben bestehen und werden in der Oberfläche ausdrücklich getrennt erklärt.

## Prüfstatus

Alle eingebauten automatischen Tests, Syntaxprüfungen, Dateiprüfungen, Linkprüfungen, Audio-/Video-Selbsttests und Originaldesign-Prüfungen wurden bestanden. Details stehen in `TESTBERICHT-v4.6.2.md` und `VALIDIERUNG.json`.

## Noch offen

Vor einer öffentlichen Veröffentlichung müssen insbesondere der tatsächliche Hosting-Anbieter, die aktuellen Vereins-/Vertretungsangaben, die Rechtekette aller Grafiken und das Datum einer ersten Designveröffentlichung bestätigt werden. Die Texte sind keine anwaltliche Einzelfallprüfung.
