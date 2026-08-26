# Bundeslandgrenzen für die Anlagenübersicht

`bundeslaender-vg250.geojson` enthält die 16 deutschen Bundesländer aus dem
Datensatz **Verwaltungsgebiete 1:250 000 (VG250)** des Bundesamts für
Kartographie und Geodäsie (BKG).

- Quelle: `https://sgx.geodatenzentrum.de/wfs_vg250`
- Abruf: 26. August 2026
- Filter: Bundesländer (`vg250:vg250_lan`, `gf=4`)
- Verarbeitung: auf 3 % vereinfacht, Formen erhalten, Koordinaten auf vier
  Nachkommastellen gerundet; Attribute auf `ags`, `gen` und `bez` reduziert
- Lizenz: Datenlizenz Deutschland – Namensnennung – Version 2.0
- Namensnennung: `© BKG (2025) dl-de/by-2-0`

Die Vereinfachung dient ausschließlich einer schnellen Darstellung im Browser.
Die Datei ist nicht für Vermessung oder rechtlich verbindliche Grenzauskünfte
geeignet.

## Internationale Demo-Gebiete

`demo-sales-regions.geojson` ergänzt die deutsche Datengrundlage ausschließlich
für den Demo-Modus um die erste Verwaltungsebene von Österreich, der Schweiz,
Frankreich (europäisches Festland), Tschechien und Polen.

- Quelle: geoBoundaries `gbOpen`, ADM1, aktueller API-Stand vom 26. August 2026
- Länder: AUT, CHE, FRA, CZE und POL
- Lizenz der zusätzlichen Grenzen: Creative Commons Attribution 4.0
- Verarbeitung: auf 8 % vereinfacht, Formen erhalten, Koordinaten auf vier
  Nachkommastellen gerundet und mit stabilen Länder-/Regionscodes versehen
- Umfang: 94 Regionen in sechs Ländern einschließlich Deutschland

Quelle und Lizenz: `https://www.geoboundaries.org/`
