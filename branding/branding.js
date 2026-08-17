/**
 * Kompatibilitätsschicht für bestehende Branding-Aufrufe.
 *
 * Die führende Konfiguration liegt in js/platform/tenant-config.js.
 * Dieses Modul liest den aktiven Mandanten aus der Runtime, damit ältere
 * Komponenten nicht wieder Unternehmensdaten hart verdrahten.
 */

const tenant = globalThis.AbwasserPlatform?.tenant;

export const BRANDING = {
  appName: tenant?.appName || "Abwasser Plattform",
  shortName: tenant?.shortName || "Abwasser",
  company: tenant?.companyName || "",
  slogan:
    tenant?.slogan ||
    "Herstellerneutrale Plattform für Wasser- und Abwassertechnik",
  logo: "./icon-192.png",
  colors: {
    primary: tenant?.colors?.primary || "#0f4c5c",
    primaryDark: tenant?.colors?.primaryDark || "#0a3945",
    accent: tenant?.colors?.accent || "#2c7a7b",
    background: tenant?.colors?.background || "#eef4f4",
    surface: "#FFFFFF",
    text: "#17353c",
  },
  documents: {
    reportTitle: "Technischer Berechnungsbericht",
    footer: tenant?.companyName
      ? `Erstellt mit ${tenant.appName} · ${tenant.companyName}`
      : `Erstellt mit ${tenant?.appName || "Abwasser Plattform"}`,
  },
};
