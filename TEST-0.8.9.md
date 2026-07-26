# Prüfliste Version 0.8.9

- JavaScript-Syntax mit `node --check` geprüft.
- Service-Worker-Cache auf 0.8.9 angehoben.
- Migration bestehender Anlagen auf Schema 6 eingebaut.
- Bestehende Besuchsdaten bleiben kompatibel.
- Neue Aufgaben werden anlagenbezogen gespeichert.
- Besuchseinträge vom Typ „Aufgabe“ erzeugen automatisch eine offene Anlagenaktion.
- Erledigte Aktionen erscheinen in der Zeitleiste.

## Praxistest nach Deployment

1. Bestehende Anlage öffnen und Datenbestand kontrollieren.
2. Neue Aufgabe anlegen, App schließen und erneut öffnen.
3. Aufgabe erledigen und Zeitleiste prüfen.
4. Besuch starten und eine Auffälligkeit als „Aufgabe“ erfassen.
5. Besuch verlassen und prüfen, ob die Aufgabe im Aktionssystem vorhanden ist.
6. Tankprüfung und Dosiertechnik-Daten prüfen; Hinweise im Einsatzcockpit kontrollieren.
