# Version 0.8.9 – Einsatzcockpit und Aktionssystem

## Neu

- Bereich „Heute beim Kunden“ auf jeder Anlagenstartseite
- direkter Zugriff auf Hauptansprechpartner, letzten Besuch, offene Aufgaben und Fotohistorie
- automatische technische Hinweise aus vorhandenen Tank-, Dosier- und Entwässerungsdaten
- zentrale Aufgabenverwaltung je Anlage
- Aufgaben können priorisiert, terminiert, erledigt und gelöscht werden
- im Besuch als „Aufgabe“ erfasste Auffälligkeiten werden automatisch in die Anlagenakte übernommen
- chronologische Anlagenzeitleiste aus Besuchen und erledigten Aufgaben
- kontextbezogene Werkzeuge bleiben direkt an die aktive Anlage gekoppelt

## Datenmodell

Das Anlagenschema wurde auf Version 6 erweitert. Bestehende Anlagen werden automatisch migriert. Neue Aufgaben werden im Feld `actions` der jeweiligen Anlage gespeichert.
