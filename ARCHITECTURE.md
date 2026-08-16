# VTA Copilot – Architekturregeln

## Verbindliche Grundregel: Produktivsystem und Demo-Organisation strikt trennen

Diese Regel ist eine feste Architekturentscheidung und darf bei zukünftigen Änderungen nicht aufgeweicht werden.

> **Produktivsystem und Demo-Organisation sind getrennte Datenräume.**
>
> Sie verwenden denselben Anwendungscode, dieselben UI-Komponenten und dieselbe Fachlogik. Benutzer-, Rollen-, Anlagen-, Termin-, Aufgaben-, Besuchs-, Berichts-, Dokument- und sonstige Geschäftsdaten dürfen jedoch niemals zwischen beiden Datenräumen vermischt werden.

## Was gemeinsam ist

Folgende Bestandteile werden nur einmal entwickelt und von Produktiv- und Demo-Arbeitsbereich gemeinsam verwendet:

- Anwendungscode
- UI-Komponenten und Navigation
- Fachlogik und Berechnungen
- Besuchsleitfaden und Besuchsbericht-Logik
- Anlagenakte und Technikmodule
- Aufgaben-, Termin- und Berichtsfunktionen
- Admin-, Rollen- und Dashboard-Komponenten
- zukünftige Features und Fehlerbehebungen

**Es darf keine separate Kopie oder Fork der App nur für die Demo entstehen.** Neue Funktionen sollen dadurch automatisch auch in der Demo-Organisation verfügbar sein.

## Was strikt getrennt ist

Folgende Daten gehören immer genau zu einem Arbeitsbereich und dürfen nicht über dessen Grenze gelesen, geschrieben, exportiert oder angezeigt werden:

- Mitarbeiterprofile und Benutzerkonten
- Rollen und Berechtigungen
- Teams, Regionen und Anlagenzuweisungen
- Anlagen und Stammdaten
- Ansprechpartner und Betreiber
- Termine und Besuche
- Aufgaben und Wiedervorlagen
- Besuchsberichte
- Dokumente, PDFs, Bilder und Anhänge
- Aktivitäten und Audit-Daten
- organisationsbezogene Kennzahlen und Dashboards
- sonstige fachliche Geschäftsdaten

## Demo-Organisation

Die Demo-Organisation ist eine lokale Präsentations- und Testumgebung mit ausschließlich fiktiven Daten.

Sie muss folgende Eigenschaften behalten:

1. **Eigener Datenbestand:** Demo-Daten werden getrennt von Produktivdaten gehalten.
2. **Klare Kennzeichnung:** Im Demo-Modus ist dauerhaft sichtbar, dass fiktive Präsentationsdaten aktiv sind.
3. **Sicherer Profilwechsel:** Beim Wechsel in die Demo wird der Produktiv-Arbeitsbereich gesichert; beim Verlassen wird er unverändert wiederhergestellt.
4. **Reset nur für Demo:** „Demo zurücksetzen“ darf ausschließlich Demo-Daten verändern oder löschen.
5. **Keine Produktivdokumente in der Demo:** Solange Dokumente/IndexedDB nicht mandantenfähig getrennt sind, bleiben sie im Demo-Modus ausgeblendet.
6. **Offline-Fähigkeit:** Die Demo soll für Präsentationen ohne Internet nutzbar bleiben.

## Versionierung und zukünftige Änderungen

Der Demo-Grundbestand wird versioniert. Neue App-Funktionen werden automatisch durch den gemeinsamen Anwendungscode verfügbar. Wenn sich Datenmodelle ändern oder neue Demo-Beispieldaten erforderlich sind, wird der Demo-Seed migriert bzw. auf eine neue Version angehoben.

Dabei gilt:

- Ein App-Update darf keine laufenden Produktivdaten mit Demo-Daten überschreiben.
- Änderungen des Demo-Seeds dürfen nicht ungefragt den Produktivbereich verändern.
- Ein Demo-Reset stellt immer den aktuellen, versionierten Demo-Ausgangszustand her.
- Datenmigrationen müssen für Produktiv- und Demo-Datenräume getrennt betrachtet und getestet werden.

## Aktueller lokaler Übergangsstand

Der derzeitige lokale Demo-Arbeitsbereich verwendet einen Workspace-Umschalter und getrennte Snapshots. Relevante Schlüssel sind unter anderem:

- `vta-workspace-mode-v01`
- `vta-production-workspace-snapshot-v01`
- `vta-demo-workspace-snapshot-v01`
- `vta-demo-workspace-version-v01`

Dieser Snapshot-Ansatz ist eine Übergangslösung für die lokale PWA. Er ändert nichts an der Architekturregel der logischen Datentrennung.

## Zielarchitektur für Mehrbenutzerbetrieb

Bei Einführung eines Backends (z. B. Firebase) muss die Trennung technisch serverseitig erzwungen werden. Jeder fachliche Datensatz erhält eine eindeutige Organisations-/Workspace-Zuordnung. Lese- und Schreibrechte werden über Authentifizierung, Rollen und Security Rules geprüft.

Beispiel:

```text
VTA Copilot
├── gemeinsamer Anwendungscode
├── Produktiv-Organisation
│   ├── Benutzer
│   ├── Rollen
│   ├── Anlagen
│   ├── Besuche
│   ├── Berichte
│   └── Dokumente
└── Demo-Organisation
    ├── Demo-Benutzer
    ├── Demo-Rollen
    ├── Demo-Anlagen
    ├── Demo-Besuche
    ├── Demo-Berichte
    └── Demo-Dokumente
```

Clientseitiges Ausblenden allein ist **keine** Zugriffssicherheit. Im Mehrbenutzerbetrieb müssen Berechtigungen zusätzlich im Backend durchgesetzt werden.

## Regeln für zukünftige Entwicklung

Bei jeder neuen Funktion ist zu prüfen:

- Nutzt die Funktion denselben Code in Produktiv- und Demo-Modus?
- Sind alle fachlichen Daten eindeutig einem Workspace/ einer Organisation zugeordnet?
- Kann ein Demo-Benutzer versehentlich Produktivdaten sehen oder verändern?
- Kann ein Produktivbenutzer versehentlich Demo-Daten übernehmen?
- Beeinflusst „Demo zurücksetzen“ ausschließlich die Demo?
- Funktionieren Migration und Offline-Cache in beiden Datenräumen?

Wenn eine Änderung diese Fragen nicht eindeutig sicher beantworten kann, darf sie nicht als abgeschlossen gelten.

## Abnahmekriterium

Eine Änderung an Arbeitsbereichen, Benutzerverwaltung, Speicherung, Synchronisation, Dokumenten oder Backups ist nur dann akzeptiert, wenn nachgewiesen ist:

**Produktiv → Demo → Änderung in Demo → Demo verlassen → Produktivdaten unverändert.**

Zusätzlich muss nach einem Demo-Reset gelten:

**Produktivdaten unverändert, Demo-Daten auf aktuellem Seed-Stand.**
