#!/usr/bin/env bash
set -euo pipefail

VERSION="4.10.38"
TARGET="js/vendor/pdfjs"

mkdir -p "$TARGET"

curl -L --fail --show-error \
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.min.mjs" \
  -o "$TARGET/pdf.min.mjs"

curl -L --fail --show-error \
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs" \
  -o "$TARGET/pdf.worker.min.mjs"

curl -L --fail --show-error \
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/LICENSE" \
  -o "$TARGET/LICENSE"

echo "PDF.js ${VERSION} wurde nach ${TARGET} geladen."
