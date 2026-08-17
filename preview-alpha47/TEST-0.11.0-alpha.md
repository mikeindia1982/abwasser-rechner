# Testplan 0.11.0-alpha

## Start
- App startet ohne JavaScript-Fehler.
- Bestehende 0.10.x-Dokumente erscheinen nach einmaliger Migration.

## Import
- PDF wird unmittelbar in der Dokumentenliste angezeigt.
- Status wechselt von „wird gespeichert“ zu „offline gespeichert“.
- Fehler bei Textextraktion entfernt das Dokument nicht.

## Persistenz
- Neuladen erhält Liste und Metadaten.
- Browserneustart erhält Original-PDF.
- Offline-Neustart erlaubt Anzeige und Prüfung.

## Diagnose
- Dokument- und Dateianzahl stimmen überein.
- Fehlende Dateien und verwaiste Dateien werden ausgewiesen.
- PDF-Speicherbedarf wird angezeigt.
