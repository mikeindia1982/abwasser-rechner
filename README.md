# Abwasser Rechner – Version 0.7

## Telefonnummern mit europäischen Ländervorwahlen

Telefon- und Mobilnummern werden jetzt aus zwei Feldern zusammengesetzt:

- Dropdown mit europäischen Ländern und Ländervorwahl
- separates Feld für Ortsvorwahl und Rufnummer

Unterstützt werden unter anderem Deutschland, Österreich, Schweiz, alle EU-Staaten sowie weitere europäische Staaten und Kleinstaaten.

## Besuchstermine je Kläranlage

Je Anlage können jetzt Besuchstermine gespeichert werden mit:

- Termintitel
- Beginn und Ende
- Status: geplant, erledigt oder abgesagt
- Anlass beziehungsweise Zweck
- Ansprechpartner
- Notizen

Die Termine werden chronologisch auf der Anlagenstartseite angezeigt.

## Outlook-Anbindung

Für jeden Besuchstermin stehen zwei Wege bereit:

1. **Outlook / ICS**
   - lädt eine standardisierte `.ics`-Kalenderdatei herunter
   - kann in Microsoft Outlook, Apple Kalender und vielen anderen Kalenderprogrammen geöffnet werden

2. **Outlook Web**
   - öffnet einen vorausgefüllten Termin direkt in Outlook im Browser
   - Titel, Zeit, Anlagenadresse, Ansprechpartner und Notizen werden übernommen

Die App erhält keinen direkten Zugriff auf das Outlook-Konto. Der Termin wird erst nach Bestätigung durch den Nutzer gespeichert.

## GitHub aktualisieren

1. ZIP entpacken.
2. Alle Dateien und den Ordner `js` in das Repository hochladen.
3. Vorhandene Dateien ersetzen.
4. Commit-Nachricht:

   `Version 0.7 - Telefonvorwahlen und Besuchstermine`

Nach der Veröffentlichung muss oben links `Version 0.7` stehen.
