# Abwasser-Rechner 0.8.6.2

Offline-fähige PWA für Abwassertechnik und anlagenbezogene Außendienstdaten.

## Architektur

Für VTA Copilot gilt verbindlich: **Produktivsystem und Demo-Organisation sind strikt getrennte Datenräume.** Beide verwenden denselben Anwendungscode und dieselben Funktionen, dürfen aber niemals Benutzer-, Anlagen-, Besuchs-, Berichts-, Dokument- oder sonstige Geschäftsdaten miteinander vermischen.

Die vollständigen Architektur- und Abnahmeregeln stehen in [ARCHITECTURE.md](ARCHITECTURE.md).

## Neu in 0.8.6.2

- Schlammentwässerung als eigener Bereich der Anlagenakte
- Verfahren, Hersteller, Typ, Baujahr, Leistung, Betriebsdaten und Peripherie
- beliebig viele Dosieranlagen pro Kläranlage
- Tankanlage mit Volumen, Material, Baujahr, Überwachung und Prüfterminen
- Dosierstation mit Pumpentechnik, Leistung, Betriebsweise und Armaturen
- Medium, Verbrauch, Gefahrstoffangaben sowie Mess-, Steuer- und Regeltechnik
- kompakte Technikübersicht auf der Anlagenstartseite
- automatische Einbindung der Entwässerung und Fällmitteldosierung in das Verfahrensschema
- bestehende Anlagen werden ohne Datenverlust um die neuen Bereiche ergänzt

## Installation

Alle Dateien gemeinsam auf einen HTTPS-Webspace oder GitHub Pages hochladen. Nach einem Update die installierte PWA einmal vollständig schließen und neu öffnen.

## Version 0.9.0

Der digitale Anlagenpass zeigt den Bearbeitungs- und Vollständigkeitsgrad jeder Anlagenakte. Die Bewertung dient der Arbeitsvorbereitung und Dokumentationsqualität, nicht der technischen Leistungsbewertung.
