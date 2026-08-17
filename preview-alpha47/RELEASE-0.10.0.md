# Abwasser-Rechner 0.10.0 – Dokumentenzentrale

## Kernfunktionen

- Zentrale, generische Dokumentenbibliothek für technische und kaufmännische PDFs
- Vollständige Offline-Speicherung der Original-PDFs als Blob in IndexedDB
- Offline-Anzeige im integrierten PDF-Bereich
- Statusworkflow: Eingang, In Prüfung, Freigegeben, Archiv
- Dokumenttypen von SDS/Factsheet bis Angebot, Auftragsbestätigung, Lieferschein und Rechnung
- Manuelle Prüfung und Klassifizierung
- Zuordnung zu Kunde, Anlage, Projekt/Auftrag und mehreren Produkten
- Erzeugung eines neuen Produkts aus einem geprüften Dokument
- Verknüpfung ohne physische PDF-Dublette
- Export der unveränderten Originaldatei
- Suche und Filter nach Status, Typ, Kunde, Produkt und Metadaten
- Anzeige der lokalen Speicherbelegung, soweit der Browser sie bereitstellt

## Abnahmetest Offline

1. PDF unter Dokumente hochladen.
2. Dokument öffnen und Anzeige prüfen.
3. App vollständig schließen.
4. Internetverbindung deaktivieren.
5. App erneut öffnen.
6. Dokument unter Dokumente öffnen.
7. PDF muss weiterhin angezeigt werden.
