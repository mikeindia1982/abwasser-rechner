# Offline-PDF.js-Patch für Abwasser-Rechner

Basis: `develop`  
Zielbranch: `feature/pdfjs-offline`

## Enthalten

- lokaler PDF.js-Import statt CDN
- lokaler Worker
- Service-Worker-Precache für PDF.js
- verbessertes Viewer-Cleanup
- Installationsskripte für Windows und Linux/macOS

## Anwendung

```bash
git checkout develop
git pull origin develop
git checkout -b feature/pdfjs-offline
```

Den Inhalt dieses ZIP-Pakets in das Stammverzeichnis des Repositories kopieren.

### PDF.js herunterladen

Linux/macOS/Git Bash:

```bash
bash scripts/download-pdfjs.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-pdfjs.ps1
```

Danach müssen vorhanden sein:

```text
js/vendor/pdfjs/pdf.min.mjs
js/vendor/pdfjs/pdf.worker.min.mjs
js/vendor/pdfjs/LICENSE
```

### Testen

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

Prüfen:

1. PDF importieren.
2. Dokumentdetail und Dokumentprüfung öffnen.
3. Seitenwechsel, Zoom, Drehung, Vollbild und Download testen.
4. DevTools auf Offline stellen.
5. Seite neu laden.
6. PDF erneut öffnen.
7. Sicherstellen, dass keine Anfrage an `cdn.jsdelivr.net` erfolgt.

### Commit

```bash
git add js/components/pdf-viewer.js service-worker.js js/vendor/pdfjs scripts
git commit -m "feat: bundle PDF.js for offline document viewer"
git push -u origin feature/pdfjs-offline
```
