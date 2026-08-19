#!/bin/bash
set -euo pipefail

REPO_ROOT="${SRCROOT}/../.."
DESTINATION="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/WebApp"

rm -rf "${DESTINATION}"
mkdir -p "${DESTINATION}"

FILES=(
  "index.html"
  "styles.css"
  "navigation-v2.css"
  "service-worker.js"
  "manifest.webmanifest"
  "icon-192.png"
  "icon-512.png"
  "plant-hero-base.png"
  "plant-schema-photorealistic.webp"
)

for file in "${FILES[@]}"; do
  if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
    echo "error: Required web asset missing: ${file}"
    exit 1
  fi
  cp "${REPO_ROOT}/${file}" "${DESTINATION}/${file}"
done

if [[ ! -d "${REPO_ROOT}/js" ]]; then
  echo "error: Required web asset directory missing: js"
  exit 1
fi

cp -R "${REPO_ROOT}/js" "${DESTINATION}/js"

if [[ -d "${REPO_ROOT}/branding" ]]; then
  cp -R "${REPO_ROOT}/branding" "${DESTINATION}/branding"
fi

echo "Bundled Abwasser-Rechner web app to ${DESTINATION}"
