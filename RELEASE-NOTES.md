# Release Notes – CLDF Offline-App v4.1

## Neu

- Lokale Audio-Fingerprint-Erkennung für selbst eingelesene Musikreferenzen.
- Einlesen mehrerer Audiodateien direkt in der App.
- Export, Import und Löschen der lokalen Fingerprint-Bibliothek.
- IndexedDB-Speicher für große Fingerprint- und Get-in-Line-Daten.
- Lokaler Import/Export eines erzeugten Get-in-Line-Katalogs.
- Automatische Get-in-Line-Aktualisierung über eine enthaltene GitHub-Aktion.
- GitHub-Pages-Deployment ohne Server-API.
- Robuster Offline-Service-Worker mit aktualisierbaren Katalogdateien.
- Ergänzung von 53 weiteren eindeutigen Liedmetadaten; insgesamt 237 Einträge mit BPM.

## Beibehalten

- Aufbau und CSS-Design der gelieferten CLDF-App.
- 135 CLDF-Tänze.
- 659 vollständige Lied–Tanz-Zuordnungen aus den Bildern.
- Favoriten, Übungslisten, Tanzsuche, manuelle Liedsuche, BPM-Eingabe und Tap-Tempo.

## Entfernt

- AudD-API und API-Schlüssel.
- kostenpflichtige Online-Musikerkennung.
- Server-Endpunkt für Audio-Uploads.

## Bewusste Grenze

Musikdateien und kommerzielle Audioaufnahmen sind nicht Bestandteil der App. Für die exakte Offline-Titelerkennung liest der Betreiber beziehungsweise Benutzer eigene rechtmäßig vorhandene Musikdateien einmalig ein. Der vollständige Get-in-Line-Katalog wird mit dem mitgelieferten Aktualisierer erzeugt; die Erstellungsumgebung konnte den großen Abruf nicht ausführen.
