# Abwasser-Rechner 0.11.0-alpha.1

## Eigener PDF-Viewer

Der browserabhängige PDF-`iframe` wurde in Dokumentdetail und Prüfmodus durch einen integrierten PDF.js-Canvas-Viewer ersetzt.

Enthalten:

- Seiten vor/zurück und direkte Seiteneingabe
- Zoom und „An Breite anpassen“
- Drehen
- Vollbild
- Export des unveränderten Originals
- hochauflösendes Canvas-Rendering mit begrenztem Device-Pixel-Ratio
- verständlicher Fehlerstatus bei fehlendem Blob oder Ladefehler
- responsive Bedienung für Desktop, Tablet und Smartphone

## Technischer Hinweis

PDF.js wird beim ersten Online-Aufruf von jsDelivr geladen und anschließend durch den Service Worker im Browser-Cache gehalten. Für einen vollständig autarken Build ohne externen Erstbezug sollen die beiden PDF.js-Builddateien im nächsten Packaging-Schritt direkt in `js/vendor/` eingecheckt werden.
