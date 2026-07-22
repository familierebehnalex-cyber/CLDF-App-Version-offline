# CLDF v4.7.13 – Android-/ShazamKit-Paket

Dieses Paket ergänzt die bestehende CLDF-Web-App um eine native Android-Hülle.
In der Android-App startet der vorhandene Aufnahme-Knopf die Musikerkennung über
**ShazamKit**. Anschließend werden Titel und Interpret an die vorhandenen
CLDF-Daten übergeben und als **Originaltanz** sowie **alternative Tänze** angezeigt.

## Bereits fertig eingebaut

- Android-WebView für den aktuellen CLDF-Serverstand
- native Mikrofonaufnahme mit PCM 16 Bit, Mono, 48 kHz
- ShazamKit-StreamingSession mit 15-Sekunden-Abbruch
- sichere Token-Schnittstelle über HTTPS-Endpunkt
- optionaler statischer Token nur für private Tests
- Übergabe von Titel, Interpret, Shazam-ID, ISRC und Apple-Music-Link
- Abgleich mit `CLDF_SONG_API_INDEX`, `CLDF_SONG_METADATA`, Radio-Daten und Tanzdaten
- sichtbarer Hinweis „Musikerkennung bereitgestellt durch ShazamKit“
- lokaler CLDF-Fingerprintmodus bleibt als Reserve erreichbar
- Demo-Build, der ohne Apple-SDK kompiliert werden kann

## Was noch von dir/Apple benötigt wird

1. Die offizielle Datei `shazamkit-android-release.aar` von Apple.
2. Ein gültiger Apple-Developer-Token oder ein HTTPS-Endpunkt, der den Token liefert.

Diese beiden Dinge können nicht öffentlich mitgeliefert werden. Der private
Apple-Schlüssel gehört niemals in GitHub oder in die APK.

## Ordner

- `android/` – Android-Studio-Projekt
- `github-update/` – optionale Web-Brücke für das Repository
- `APPLE-SHAZAMKIT-EINRICHTUNG.md` – genaue Restschritte
- `TESTBERICHT.md` – geprüfte und noch am Handy zu prüfende Punkte
