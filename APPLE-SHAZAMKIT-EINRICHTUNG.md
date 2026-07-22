# Apple-/ShazamKit-Einrichtung

## 1. ShazamKit aktivieren

Im Apple-Developer-Konto einen Media Identifier anlegen, ShazamKit aktivieren und
einen privaten Media-Services-Schlüssel erzeugen. Der private Schlüssel bleibt nur
auf einem geschützten Server oder Entwicklungsrechner.

## 2. Android-SDK einsetzen

Das offizielle ShazamKit-SDK für Android von Apple herunterladen. Die enthaltene
AAR-Datei nach

`android/app/libs/shazamkit-android-release.aar`

kopieren. Keine inoffizielle Shazam-API und keine fremde AAR-Datei verwenden.

## 3. Token konfigurieren

### Empfohlen: HTTPS-Endpunkt

In `android/gradle.properties` oder besser in der lokalen Datei
`~/.gradle/gradle.properties` setzen:

`CLDF_SHAZAM_TOKEN_ENDPOINT=https://dein-server.example/api/shazam-token`

Antwortformat:

`{"token":"eyJhbGciOiJFUzI1NiIs..."}`

Alternativ darf der Endpunkt nur den JWT-Text zurückgeben.

### Nur privater Test

`CLDF_SHAZAM_STATIC_TOKEN=eyJhbGciOiJFUzI1NiIs...`

Ein statischer Token ist aus einer APK auslesbar und deshalb nicht die empfohlene
Veröffentlichungslösung. Niemals den `.p8`-Privatschlüssel in die App einbauen.

## 4. Build-Variante wählen

Android Studio → **Build Variants** → `shazamDebug`.

- `demoDebug`: startet die App, enthält aber keine Shazam-Erkennung.
- `shazamDebug`: echte ShazamKit-Erkennung, benötigt AAR und Token.

## 5. Serveradresse

Standardmäßig lädt die App:

`https://familierebehnalex-cyber.github.io/CLDF-App-Version-offline/`

Falls die laufende CLDF-Adresse anders lautet, lokal setzen:

`CLDF_APP_URL=https://deine-richtige-cldf-adresse/`

## 6. Test

1. App auf einem echten Android-Handy installieren.
2. Internet einschalten.
3. „Mit ShazamKit erkennen“ antippen.
4. Mikrofon erlauben.
5. Etwa 10–15 Sekunden eines Liedes abspielen.
6. Prüfen, ob Titel, Interpret, Originaltanz und Alternativen erscheinen.
7. „Stattdessen lokale CLDF-Erkennung verwenden“ testen.
