# Abwasser Rechner – Version 0.5

## Neue Anlagenakte

Version 0.5 ergänzt die Rechner um eine zentrale Anlagenverwaltung.

### Enthalten

- Anlagenübersicht für mehrere Kläranlagen
- kommunale, industrielle und gemischte Anlagen
- Anlagenname, interne Nummer, Ausbaugröße, Belastung und Verfahren
- vollständige Anlagenadresse
- getrennte Betreiberanschrift
- mehrere Ansprechpartner mit Funktion und Kontaktdaten
- zentrale Betriebsparameter
- Anlagenstartseite mit Kennzahlen
- frei konfigurierbare Grenz- und Zielwerte
- Ampelübersicht in Grün, Gelb, Rot und Grau
- Export einer Anlagenakte als JSON
- Import einer Anlagenakte aus JSON
- lokale Speicherung im Browser

## Ampellogik

Die mitgelieferten Schwellen sind ausschließlich Start- beziehungsweise Orientierungswerte.
Sie müssen an Genehmigungsbescheid, Betriebsziele, Verfahren, Messstelle und örtliche Randbedingungen angepasst werden.

## Rechnerverknüpfung

Die zentrale Datenbasis ist jetzt vorhanden. In Version 0.5 wird die aktive Anlage bereits bei jedem Rechner angezeigt.
Die automatische Feldzuordnung und Rückspeicherung zwischen Anlagenprofil und einzelnen Rechnern wird in den folgenden Versionen rechnerweise ergänzt.

## GitHub

1. ZIP entpacken.
2. Alle Dateien und den Ordner `js` in das Repository hochladen.
3. Vorhandene Dateien ersetzen.
4. Commit-Nachricht:

   `Version 0.5 - Anlagenakte und Ampelsystem`

5. Nach der Veröffentlichung muss oben links `Version 0.5` stehen.
