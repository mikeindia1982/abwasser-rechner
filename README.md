# VTA Copilot – Abwasser-Rechner

Offline-first Vertriebs- und Anlagenanwendung für Kläranlagen mit PWA- und Capacitor-iOS-Ausgabe.

Die Web-Oberfläche bleibt der gemeinsame fachliche Kern. Mobile Navigation und Anlagenansicht werden responsiv geteilt; native iOS-spezifische Integrationen liegen zusätzlich in der Capacitor-Schicht.

## Entwicklung

Arbeitsbranch: `develop`

Native iOS-Synchronisation:

```bash
npm ci
npm run ios:sync
npm run native:doctor
npm run ios:open
```

## Mobile Navigation

Auf Smartphones verwendet die PWA und die iOS-App dieselbe Navigation V2:

- Start
- Anlagen
- Besuch / Fortsetzen
- Vorgänge
- Mehr

Desktop und größere Browseransichten behalten die Sidebar-Navigation.

## Daten

Lokale Anlagen-, Besuchs- und Arbeitsdaten bleiben offline-first verfügbar. Firebase ergänzt Synchronisation und Mitarbeiterfunktionen, darf den nativen App-Start aber nicht blockieren.
