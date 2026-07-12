# Fertigstellungsbericht – CLDF Offline-App v4.7.1

## Änderung

Die sichtbare Box „Lokaler Senderkatalog / Radio-API-Sammlung“ wurde aus dem Bereich **Mehr** entfernt. Ebenso entfernt wurden sichtbare Radio-Hinweise in manueller Liedauswahl, Diagnose und Versionsanzeige.

## Weiterhin enthalten

Die importierten Lied- und Tanzzuordnungsdaten bleiben als rein lokaler Hintergrundkatalog eingebunden. Sie erweitern die Liedsuche und feste Tanzzuordnungen, ohne eine eigene Senderoberfläche anzuzeigen. Jingles und Promos bleiben ausgeschlossen.

## Onlineverhalten

Der frühere Live-Titelabruf, seine Bedienelemente und die zugehörige Fetch-Funktion wurden aus dem aktiven App-Code entfernt. Die Fassung v4.7.1 stellt daher im normalen App-Betrieb keine Verbindung zur laut.fm-API her.

## Prüfstatus

JavaScript-Syntax, Build-Validierung, Radio-Datentest, Audio-Fingerprint-Test, Get-in-Line-Parser, Video-Schrittmuster, Originalgrafiken und ursprüngliche CSS-Basis wurden erfolgreich geprüft. Die Mehr-Ansicht wurde bei 390 Pixel Breite kontrolliert; es besteht kein horizontales Überlaufen und kein Senderkatalog ist sichtbar.
