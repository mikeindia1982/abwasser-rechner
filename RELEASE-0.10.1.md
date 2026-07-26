# Release 0.10.1 – Dokumentenanzeige & Prüfmodus Fix

- Dokumentmetadaten werden sofort nach Auswahl angelegt und angezeigt.
- PDF-Dateien werden als Blob-Record robust in IndexedDB gespeichert.
- Große PDF-Rohtexte werden nicht mehr in localStorage abgelegt.
- Fehler bei Textextraktion verhindern nicht mehr die Dokumentanlage.
- Detail- und Prüfmodus zeigen verständliche Fehler statt leerer Seiten.
- Abwärtskompatibles Lesen bereits gespeicherter Blob-Einträge.
