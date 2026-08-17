# Plattformarchitektur: neutraler Core + VTA Edition

## Ziel

Der Abwasser-Rechner wird als eine Codebasis weiterentwickelt. Unternehmensspezifische Ausprägungen werden als Editionen bzw. Mandantenkonfigurationen aufgesetzt und nicht als separate Forks gepflegt.

## Implementierte Editionen

- `vta` – VTA Edition; Standard und rückwärtskompatibel zur bisherigen lokalen Datenbasis
- `platform` – herstellerneutrale Platform Edition

Die aktive Edition kann über den Editionsumschalter in der Seitenleiste oder über den URL-Parameter gewählt werden:

- `?tenant=vta`
- `?tenant=platform`

## Konfiguration

`js/platform/tenant-config.js` definiert je Edition:

- App- und Editionsname
- Firmenname
- Branding-Grundwerte
- Standard-Mitarbeiterprofil
- Feature Flags
- Speicherstrategie

## Runtime

`js/platform/tenant-runtime.js` wird vor `js/app.js` geladen und übernimmt:

- Auflösung der aktiven Edition
- Branding der App-Shell
- Editionsumschalter
- Sicherung und Wiederherstellung editionsbezogener LocalStorage-Daten
- neutrale Initialisierung der Platform Edition ohne VTA-Produktseed

## Datentrennung

Für die VTA Edition bleiben die bisherigen LocalStorage-Schlüssel und die bestehende IndexedDB erhalten. Dadurch bleiben lokale Bestandsdaten rückwärtskompatibel.

Für weitere Editionen werden die verwalteten LocalStorage-Daten beim Wechsel in einem editionsbezogenen Snapshot abgelegt. Die zentrale IndexedDB erhält für die Platform Edition einen eigenen Datenbanknamen.

## Noch zu entkoppeln

Im Legacy-Modul `js/app.js` existieren weiterhin VTA-spezifische Stellen, insbesondere:

- VTA als Fallback im Mitarbeiterprofil
- VTA-Startprodukte
- VTA-spezifische Produkterkennung beim PDF-Import
- separate IndexedDB für Produkt-PDFs

Die Platform Runtime verhindert bereits, dass VTA-Startprodukte und das VTA-Unternehmen in einer neu gestarteten neutralen Edition automatisch sichtbar werden. Die verbleibende Logik wird in den folgenden Refactoring-Schritten vollständig aus `app.js` herausgelöst.

## Zielstruktur

```text
js/
├── platform/
│   ├── tenant-config.js
│   └── tenant-runtime.js
├── core/
│   ├── organizations/
│   ├── users/
│   ├── customers/
│   ├── plants/
│   ├── visits/
│   ├── documents/
│   └── workflows/
├── modules/
│   └── wastewater/
│       ├── calculators/
│       ├── process/
│       ├── dewatering/
│       ├── dosing/
│       └── products/
└── editions/
    ├── vta/
    └── platform/
```

## Refactoring-Regeln

1. Keine neue Fachfunktion prüft direkt auf `VTA`.
2. Unternehmensnamen, Branding, Empfänger, Produktkataloge und Vorlagen kommen aus der Edition-/Organisationskonfiguration.
3. Fachlogik der Abwassertechnik bleibt herstellerneutral.
4. Neue persistierte Geschäftsdaten werden für die spätere Cloud-Migration mit einer Organisationszuordnung vorbereitet.
5. VTA-spezifische Erweiterungen werden als Konfiguration oder separates Editionsmodul umgesetzt, nicht im Core.
6. Die VTA Edition bleibt während des Umbaus funktionsfähig und rückwärtskompatibel.

## Nächste technische Schritte

1. Produktkatalog aus `app.js` in ein Product Repository und Editionsseed auslagern.
2. Mitarbeiterprofil-Fallback aus der Tenant-Konfiguration beziehen.
3. PDF-Produkterkennung von Herstellername `VTA` auf konfigurierbare Herstellerregeln umstellen.
4. Anlagen-, Besuchs- und Kundendaten in Repositories aufteilen.
5. `organizationId` als fachliche Organisationszuordnung in neue Datenmodelle aufnehmen.
6. Danach Cloud-Synchronisation auf die Mandantenarchitektur setzen.
