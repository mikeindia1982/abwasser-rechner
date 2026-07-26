# Version 0.8.8 – Besuchsmodus

## Neu
- Besuch direkt aus der Anlagenakte starten
- geführte Checkliste für den Rundgang
- Vor-Ort-Messwerte erfassen
- Auffälligkeiten, Hinweise und Aufgaben dokumentieren
- lokale Fotodokumentation (maximal 6 Bilder je Besuch, 1,5 MB je Bild)
- Besuchsnotiz und Abschlussstatus
- bestehende Termine können als Besuch geöffnet und fortgesetzt werden
- Fortschrittsanzeige in der Anlagenhistorie

## Datenmodell
Das Anlagenschema wurde auf Version 5 erweitert. Bestehende Termine werden beim Laden automatisch um die Besuchsdokumentation ergänzt.

## Hinweis
Fotos werden lokal im Browser gespeichert. Für umfangreiche Fotodokumentationen ist später IndexedDB statt localStorage vorgesehen.
