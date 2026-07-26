# Abwasser-Rechner 0.11.0-alpha

## Ziel
Erster Architektur-Release der dokumentenzentrierten Offline-Plattform.

## Enthalten
- Einheitliche IndexedDB-Datenbank `abwasser-rechner-v011`
- Stores für Dokumente, Dateien, Produkte, Anlagen, Kunden, Projekte, Beziehungen, Ereignisse und Einstellungen
- Dokumentmetadaten und Original-PDFs in derselben Datenbank
- Automatische, nicht destruktive Migration der Dokumente aus 0.10.x
- Übernahme vorhandener PDF-Blobs aus der bisherigen Datei-Datenbank
- Ereignisprotokoll für Speicherung und Migration
- Systemdiagnose: Dokumente, PDF-Dateien, fehlende und verwaiste Dateien, Speicherbedarf
- Dokumentenimport legt Metadaten sofort an und speichert anschließend den Original-Blob

## Alpha-Grenzen
Produkte, Anlagen und weitere Geschäftsdaten verwenden in dieser Alpha teilweise noch die bisherigen Speicherpfade. Deren Migration folgt iterativ. Die Dokumentenzentrale nutzt bereits den neuen Datenkern.

## Kritischer Abnahmetest
1. App über einen lokalen Webserver öffnen.
2. PDF unter Dokumente importieren.
3. Dokument öffnen und prüfen.
4. Browser schließen.
5. Netzwerk deaktivieren.
6. App erneut öffnen und PDF anzeigen.
7. Unter Info & System die Integrität prüfen.
