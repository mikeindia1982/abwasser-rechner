$ErrorActionPreference = "Stop"

$Version = "4.10.38"
$Target = "js/vendor/pdfjs"

New-Item -ItemType Directory -Force -Path $Target | Out-Null

Invoke-WebRequest `
  -Uri "https://cdn.jsdelivr.net/npm/pdfjs-dist@$Version/build/pdf.min.mjs" `
  -OutFile "$Target/pdf.min.mjs"

Invoke-WebRequest `
  -Uri "https://cdn.jsdelivr.net/npm/pdfjs-dist@$Version/build/pdf.worker.min.mjs" `
  -OutFile "$Target/pdf.worker.min.mjs"

Invoke-WebRequest `
  -Uri "https://cdn.jsdelivr.net/npm/pdfjs-dist@$Version/LICENSE" `
  -OutFile "$Target/LICENSE"

Write-Host "PDF.js $Version wurde nach $Target geladen."
