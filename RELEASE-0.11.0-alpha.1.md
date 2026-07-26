# Abwasser-Rechner 0.11.0-alpha.1

## Änderung

- Browser-PDF-`iframe` in Dokumentdetail und Prüfmodus entfernt.
- Eigener Canvas-Viewer auf Basis von PDF.js ergänzt.
- Seitenwechsel, Seiteneingabe, Zoom, Breitenanpassung, Drehung, Vollbild und Originalexport ergänzt.
- Viewer als eigenständige Komponente unter `js/components/pdf-viewer.js` angelegt.
- Service-Worker- und Asset-Version auf `0.11.0-alpha.1` erhöht.

## Test

1. GitHub-Pages-Deployment aktualisieren.
2. Alte Websitedaten bzw. den Service-Worker-Cache löschen oder hart neu laden.
3. PDF unter **Dokumente** hochladen.
4. Dokument über **Anzeigen** und **Prüfen** öffnen.
5. Seite neu laden und PDF erneut öffnen.

## Hinweis

PDF.js ist in dieser Alpha auf Version 4.10.38 festgesetzt und wird beim ersten Online-Aufruf vom CDN geladen. Der Viewer selbst ist Teil der App. Für einen vollständig autarken Erststart werden die beiden PDF.js-Builddateien in einem folgenden Schritt lokal unter `js/vendor/pdfjs/` aufgenommen.
