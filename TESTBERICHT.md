# Testbericht – CLDF Android/ShazamKit v4.7.13

## Statisch geprüft

- vollständige Android-Projektstruktur
- getrennte Build-Varianten `demo` und `shazam`
- keine Apple-Privatschlüssel oder Entwickler-Tokens im Paket
- Android-Berechtigungen für Internet, Mikrofon und optionale Kamera
- WebView-JavaScript-Brücke mit sichtbarer ShazamKit-Kennzeichnung
- 48-kHz-PCM-16-Bit-Mono-Aufnahme gemäß ShazamKit-Android-Vorgabe
- fortlaufende Audiotimestamps aus der übertragenen Byteanzahl
- Erkennungsabbruch nach 15 Sekunden
- Deduplizierung der Original-/Alternativtänze
- Fallback-Knopf zur bisherigen lokalen CLDF-Erkennung
- externe Links werden außerhalb der App geöffnet

## Nicht vollständig ausführbar in dieser Umgebung

Der echte `shazamDebug`-Build kann erst kompiliert und auf einem Handy geprüft
werden, nachdem die offizielle Apple-AAR-Datei und ein gültiger Developer-Token
eingesetzt wurden. Diese geschützten Bestandteile waren nicht verfügbar und sind
absichtlich nicht im ZIP enthalten.

## Auf echtem Android-Gerät prüfen

- Mikrofonfreigabe und AudioRecord auf dem Zielhandy
- Treffer mit leiser, lauter und verrauschter Musik
- Token-Endpunkt und Token-Erneuerung
- tatsächliche produktive CLDF-Serveradresse
- Originaltanz-Reihenfolge bei mehreren vorhandenen Zuordnungen
- Dateiimporte, Kamera und lokale Fingerprint-Reserve im WebView
