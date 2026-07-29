# Ausschreibungsradar

Dieses Modul erweitert den Abwasser-Rechner um einen produktionsnahen Radar fuer oeffentliche Ausschreibungen.

## Ziele

- Relevante Ausschreibungen aus offiziellen Open-Data-Quellen importieren.
- Fachlich begruendete Relevanzbewertung fuer Anlagen-/Leistungsprofil.
- Deduplizierung und Versionsbehandlung pro Bekanntmachung.
- Arbeitsfaehige UI mit Filtern, Statusworkflow und Ungelesen-Zaehler.
- Manuelle Synchronisierung im Frontend und scheduler-faehiger Einstieg.
- Persistente Rueckmeldungen/Statusaenderungen fuer Lern- und Auditspuren.

## Architekturueberblick

### Module

- `js/tenders/config.js`
  - Zentrale Konfiguration (Feature-Flag, Schwellwerte, Gewichte, Regionen, Zuweisung).
- `js/tenders/sources/tender-data-source.js`
  - Adaptervertrag fuer Datenquellen.
- `js/tenders/sources/german-public-procurement-data-source.js`
  - Konkreter Adapter fuer deutsche Vergabe-Open-Data (`notice-exports`).
- `js/tenders/services/tender-relevance-service.js`
  - Regelbasierte Scoring-Engine.
- `js/tenders/services/tender-scan-service.js`
  - Import-Orchestrierung inkl. Retry/Fehlerisolierung/Run-Tracking.
- `js/tenders/repositories/tender-repository.js`
  - Persistenzzugriff fuer Notices, Matches, Runs, Notifications, Feedback.
- `js/tenders/tender-radar-ui.js`
  - UI fuer Radar-Seite (Filter, Karten, Statusaktionen, Details, Sync-Button).
- `js/tenders/services/tender-cron-interface.js`
  - Externer Einstieg fuer geplante Imports.

### Datenfluss

1. Scan-Service startet `runInitialImport` oder `runCatchUpImport`.
2. Datenquelle liefert Rohdaten fuer Zeitraum/Tag.
3. Adapter normalisiert auf internes Notice-Schema.
4. Repository fuehrt Notice-Upsert mit stabiler Dedupe-Identitaet aus.
5. Relevance-Service berechnet Score, Relevanzstufe und Gruende.
6. Repository speichert/aktualisiert Match inkl. Status/Read-Flags.
7. Scan-Run-Metriken werden als Laufhistorie persistiert.
8. UI liest Matches+Notices, bietet Filter und Statusworkflow.

## Datenmodell und Migration

### IndexedDB-Version

- `js/db/database.js`
  - DB-Version von `1` auf `2` erhoeht.

### Neue Object Stores

- `tenderNotices`
- `tenderMatches`
- `tenderScanRuns`
- `tenderRawNotices`
- `tenderFeedback`
- `tenderNotifications`

### Wichtige Indizes

- `tenderNotices.by_uniqueKey`
- `tenderNotices.by_source`
- `tenderNotices.by_publishedAt`
- `tenderMatches.by_tenderNoticeId`
- `tenderMatches.by_relevanceLevel`
- `tenderMatches.by_status`
- `tenderMatches.by_isRead`
- `tenderScanRuns.by_startedAt`
- `tenderScanRuns.by_status`
- `tenderFeedback.by_tenderMatchId`
- `tenderFeedback.by_changedAt`

## Dedupe- und Versionsstrategie

- Stabiler Notice-Key basiert auf Quelle + fachlicher Notice-Identitaet.
- `version` ist absichtlich nicht Teil des Dedupe-Keys.
- Inhaltliche Aenderungen werden ueber einen Inhalts-Hash erkannt.
- Bei Hash-Aenderung wird Match als neue Version markiert (`isNewVersion`).

## Relevanzlogik

### Bewertungsquellen

- CPV-Haupt- und Zusatzcodes
- Titelbegriffe
- Beschreibungstexte
- Auftraggeberhinweise
- Region/NUTS/Bundesland
- Negative Begriffe (Abwertung)

### Ergebnis

- Prozent-Score
- Relevanzstufe (`HIGH`, `MEDIUM`, `LOW`, `IRRELEVANT`)
- Begruendungsbausteine (`matchReasons`)

### Besonderheiten

- Daempfung schwacher Einzeltreffer, damit kein Overfitting durch ein einzelnes Signal entsteht.
- Ablaufpruefung (`EXPIRED`) auf Fristbasis.

## Synchronisierung und Scheduler

### Manuell

- Global-Ansicht `Ausschreibungsradar` bietet Button `Jetzt synchronisieren`.
- Lauf ist per Lock gegen parallele manuelle Starts abgesichert.

### Automatisch

- App-Bootstrap triggert `runAutoSyncIfDue()` nicht-blockierend.
- Standardintervall: alle 2 Stunden (konfigurierbar).

### Extern

- `runTenderSyncJob({ from, to })` als scheduler-faehiger Einstieg.

## Fehlerbehandlung und Robustheit

- Netzwerk-Timeout und Retry mit exponentiellem Backoff im Quellenadapter.
- Fehlerklassifikation (Netzwerk/Parsing/API-aehnlich).
- Fehlerisolierung pro Notice: Einzelne fehlerhafte Datensaetze stoppen keinen gesamten Lauf.
- Scan-Runs enthalten Fehlerzaehler und Zusammenfassung.

## UI-Funktionen

- Global-Navigationseintrag `Ausschreibungsradar`.
- Ungelesen-Badge in der Navigation.
- Filter:
  - Relevanz
  - Status
  - Bundesland
  - Auftraggeber
  - CPV
  - Volltext
  - nur ungelesen
  - nur mir zugewiesen
- Sortierung priorisiert:
  - ungelesen
  - hoher Score
  - naehere Frist
  - aktuelle Veroeffentlichung
- Aktionen je Treffer:
  - als gelesen
  - Statuswechsel (Pruefung, Interessant, Nicht relevant, Angebot geplant, Abgelehnt)
  - Details ein-/ausblenden
  - Originalbekanntmachung oeffnen

## Feature-Flag

- Aktivierung ueber `TENDER_RADAR_FEATURE_FLAG` in `js/tenders/config.js`.
- Bei deaktiviertem Flag wird die Seite als deaktiviert angezeigt und Zaehler liefert `0`.

## Tests

- `tests/tender-relevance-service.test.js`
  - Bewertung, Schwellwerte, Ablaufpruefung.
- `tests/tender-scan-service.test.js`
  - Importlauf, Fehlerisolierung, Persistenz-Interaktion.
- `tests/fixtures/tender-notice-fixtures.js`
  - Realistische Beispieldatensaetze fuer reproduzierbare Testfaelle.

## Erweiterbarkeit

- Neue Datenquellen koennen ueber den Adaptervertrag integriert werden.
- Scoring-Gewichte und Schluesselwoerter sind in `config.js` zentral steuerbar.
- Workflow-Status und interne Zuordnungen sind konfigurierbar.
- Persistenz ist gekapselt im Repository und kann auf weitere Speicherebenen erweitert werden.
