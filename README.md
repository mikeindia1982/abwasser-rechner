# Abwasser Rechner v0.8.4

## Standortgestützte Anlagenerfassung

- GPS-Koordinaten direkt über Smartphone oder Tablet erfassen
- Messgenauigkeit und Erfassungszeit anzeigen
- Adresse bei bestehender Internetverbindung automatisch aus den Koordinaten ableiten
- Anlagenname aus dem ermittelten Ort vorschlagen, sofern das Feld noch leer ist
- Standort vor dem Speichern in einer Karte prüfen
- Koordinaten auch offline speichern; Adresse kann später manuell ergänzt werden
- verständliche Hinweise bei verweigerter Berechtigung, fehlendem GPS oder Zeitüberschreitung

Die bestehende lokale Datenhaltung bleibt kompatibel. Neue Standortmetadaten werden ergänzend in der Anlagenadresse gespeichert.


## Version 0.8.4.1 – Fehlerbehebung GPS-Speicherung

- GPS-Koordinaten mit sechs Dezimalstellen können jetzt gespeichert werden.
- Die HTML-Schrittweitenprüfung überschreibt die GPS-Felder nicht mehr.
- Breitengrad und Längengrad besitzen passende Wertebereiche.
- Service-Worker-Cache wurde angehoben, damit die korrigierte JavaScript-Datei geladen wird.
