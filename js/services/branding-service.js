import { BRANDING } from "../../branding/branding.js";

/**
 * Initialisiert das komplette Branding der Anwendung.
 */
export function initializeBranding() {
  applyDocumentTitle();
  applyThemeColor();
  applyBrandName();
  applyCompanyName();
  applySlogan();
  applyLogo();
}

/**
 * Browser-Titel
 */
function applyDocumentTitle() {
  document.title = BRANDING.appName;
}

/**
 * Theme-Color für Browser/PWA
 */
function applyThemeColor() {
  const themeColor = document.querySelector('meta[name="theme-color"]');

  if (themeColor) {
    themeColor.setAttribute("content", BRANDING.colors.primary);
  }
}

/**
 * App-Name ersetzen
 */
function applyBrandName() {
  document.querySelectorAll("[data-brand='app-name']").forEach((element) => {
    element.textContent = BRANDING.appName;
  });
}

/**
 * Firmenname ersetzen
 */
function applyCompanyName() {
  document.querySelectorAll("[data-brand='company']").forEach((element) => {
    element.textContent = BRANDING.company;
  });
}

/**
 * Slogan ersetzen
 */
function applySlogan() {
  document.querySelectorAll("[data-brand='slogan']").forEach((element) => {
    element.textContent = BRANDING.slogan;
  });
}

/**
 * Logo ersetzen
 */
function applyLogo() {
  document.querySelectorAll("[data-brand-logo]").forEach((element) => {
    element.src = BRANDING.logo;
    element.alt = BRANDING.appName;
  });
}
