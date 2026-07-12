# Testbericht – CLDF Offline-App v4.7.2

Stand: 12. Juli 2026

## Automatische Prüfungen

| Prüfung | Ergebnis |
|---|---|
| JavaScript-Syntax der App | bestanden |
| JavaScript-Syntax des Live-API-Moduls | bestanden |
| statischer Radio-Katalog: 5 Sender / 1.265 Quelldatensätze | bestanden |
| Live-API: `current_song` und `last_songs` | bestanden |
| Live-Einträge im lokalen Offline-Fallback | bestanden |
| Jingles werden ausgeschlossen | bestanden |
| Muster `Lied – Tanz` wird konservativ zerlegt | bestanden |
| zentrale Löschfunktion umfasst Live-API-Cache | bestanden |
| Audio-Fingerprint-Selbsttest | 99 % / bestanden |
| Video-Step-Matcher | 8 von 8 / bestanden |
| Get-in-Line-Parser | bestanden |
| Service-Worker-Dateiliste | bestanden |
| wichtige HTML-Elemente | bestanden |
| sichtbare Radio-Box nicht vorhanden | bestanden |
| Originalgrafiken | unverändert |
| ursprüngliche CSS-Basis | unverändert |

## Live-API-Testaufbau

Der Selbsttest simuliert zwei Sender und vier HTTP-Anfragen. Er prüft, dass aktuelle und zuletzt gespielte Titel übernommen werden, ein Jingle herausgefiltert wird, der Tanzhinweis aus `He Drinks Tequila – You're So Naughty` extrahiert wird und die Ergebnisse im lokalen Speicher landen.

## Betriebsverhalten

Ohne Internet bleibt der statische Katalog mit 1.239 nutzbaren Radio-Liedmetadatensätzen verfügbar. Bei Internetverbindung werden neue Metadaten im Hintergrund ergänzt. Ein fehlgeschlagener Senderabruf blockiert weder die App noch die übrigen Sender.
