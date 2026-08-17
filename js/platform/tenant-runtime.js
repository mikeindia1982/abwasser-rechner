import {
  DEFAULT_TENANT_ID,
  getTenantConfig,
  listTenantConfigs,
} from "./tenant-config.js";

const ACTIVE_TENANT_KEY = "abwasser-active-tenant-v1";
const TENANT_SNAPSHOT_PREFIX = "abwasser-tenant-snapshot-v1:";

const APP_LOCAL_STORAGE_KEYS = Object.freeze([
  "abwasser-favorites-v07",
  "abwasser-menu-v07",
  "abwasser-plants-v07",
  "abwasser-active-plant-v07",
  "abwasser-recent-v082",
  "abwasser-employee-profile-v087",
  "abwasser-plants-backup-v087",
  "abwasser-plant-page-v091a",
  "abwasser-global-page-v091b",
  "abwasser-products-v092",
  "abwasser-documents-v010",
]);

function safeParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function snapshotKey(tenantId) {
  return `${TENANT_SNAPSHOT_PREFIX}${tenantId}`;
}

function captureManagedStorage() {
  return Object.fromEntries(
    APP_LOCAL_STORAGE_KEYS.flatMap((key) => {
      const value = localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );
}

export function snapshotTenantStorage(tenantId) {
  if (!tenantId) return;
  const snapshot = {
    tenantId,
    savedAt: new Date().toISOString(),
    values: captureManagedStorage(),
  };
  localStorage.setItem(snapshotKey(tenantId), JSON.stringify(snapshot));
}

function clearManagedStorage() {
  APP_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function initializeTenantDefaults(config) {
  const profileKey = "abwasser-employee-profile-v087";
  const productKey = "abwasser-products-v092";

  if (!localStorage.getItem(profileKey)) {
    localStorage.setItem(profileKey, JSON.stringify(config.defaultProfile));
  }

  if (
    config.storage?.seedProducts === "empty" &&
    localStorage.getItem(productKey) === null
  ) {
    localStorage.setItem(productKey, "[]");
  }
}

function restoreTenantStorage(config) {
  clearManagedStorage();

  const saved = safeParse(localStorage.getItem(snapshotKey(config.id)) || "");
  if (saved?.values && typeof saved.values === "object") {
    Object.entries(saved.values).forEach(([key, value]) => {
      if (APP_LOCAL_STORAGE_KEYS.includes(key) && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    });
  }

  initializeTenantDefaults(config);
}

function resolveRequestedTenantId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("tenant");
  const known = listTenantConfigs().some((tenant) => tenant.id === fromUrl);
  if (known) return fromUrl;

  const stored = localStorage.getItem(ACTIVE_TENANT_KEY);
  const storedKnown = listTenantConfigs().some((tenant) => tenant.id === stored);
  return storedKnown ? stored : DEFAULT_TENANT_ID;
}

function prepareTenantContext() {
  const requestedId = resolveRequestedTenantId();
  const currentId = localStorage.getItem(ACTIVE_TENANT_KEY) || DEFAULT_TENANT_ID;

  if (requestedId !== currentId) {
    snapshotTenantStorage(currentId);
    restoreTenantStorage(getTenantConfig(requestedId));
  } else {
    initializeTenantDefaults(getTenantConfig(requestedId));
  }

  localStorage.setItem(ACTIVE_TENANT_KEY, requestedId);
  return getTenantConfig(requestedId);
}

const activeTenant = prepareTenantContext();

function ensureRuntimeStyles() {
  if (document.querySelector("#tenant-runtime-styles")) return;
  const style = document.createElement("style");
  style.id = "tenant-runtime-styles";
  style.textContent = `
    .tenant-edition-switcher{margin:6px 12px 10px;padding:10px 11px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(255,255,255,.07)}
    .tenant-edition-switcher label{display:grid;gap:5px;color:rgba(255,255,255,.72);font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .tenant-edition-switcher select{width:100%;padding:.6rem .7rem;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:rgba(255,255,255,.11);color:#fff;font-weight:800}
    .tenant-edition-switcher option{color:#17353c;background:#fff}
    .tenant-edition-switcher small{display:block;margin-top:6px;color:rgba(255,255,255,.55);line-height:1.35}
  `;
  document.head.appendChild(style);
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value || "";
  });
}

function applyTenantBranding(config = activeTenant) {
  document.documentElement.dataset.tenant = config.id;
  document.title = `${config.appName} · ${config.editionName}`;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", config.colors.primary);

  const appNameMeta = document.querySelector('meta[name="application-name"]');
  if (appNameMeta) appNameMeta.setAttribute("content", config.appName);

  const appleTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]',
  );
  if (appleTitle) appleTitle.setAttribute("content", config.appName);

  document.documentElement.style.setProperty("--primary", config.colors.primary);
  document.documentElement.style.setProperty(
    "--primary-dark",
    config.colors.primaryDark,
  );
  document.documentElement.style.setProperty("--accent", config.colors.accent);
  document.documentElement.style.setProperty("--bg", config.colors.background);

  setText("[data-brand-app-name]", config.appName);
  setText("[data-brand-mark]", config.brandMark);
  setText("[data-brand-edition]", config.editionName);
  setText("[data-brand-company]", config.companyName);
  setText("[data-brand-slogan]", config.slogan);
  setText("[data-brand-footer]", config.footer);
}

function mountEditionSwitcher() {
  const sidebarBottom = document.querySelector(".sidebar-bottom");
  if (!sidebarBottom || document.querySelector("#tenantEditionSwitcher")) return;

  ensureRuntimeStyles();
  const wrapper = document.createElement("div");
  wrapper.id = "tenantEditionSwitcher";
  wrapper.className = "tenant-edition-switcher";
  wrapper.innerHTML = `
    <label>Edition
      <select id="tenantEditionSelect" aria-label="Software-Edition auswählen">
        ${listTenantConfigs()
          .map(
            (tenant) =>
              `<option value="${tenant.id}" ${tenant.id === activeTenant.id ? "selected" : ""}>${tenant.editionName}</option>`,
          )
          .join("")}
      </select>
    </label>
    <small>${activeTenant.id === "vta" ? "VTA-konfigurierte Ansicht" : "Herstellerneutrale Plattformansicht"}</small>
  `;
  sidebarBottom.prepend(wrapper);

  wrapper.querySelector("select")?.addEventListener("change", (event) => {
    switchTenant(event.currentTarget.value);
  });
}

export function switchTenant(tenantId) {
  const target = getTenantConfig(tenantId);
  if (!target || target.id === activeTenant.id) return;

  snapshotTenantStorage(activeTenant.id);

  const url = new URL(window.location.href);
  url.searchParams.set("tenant", target.id);
  window.location.assign(url.toString());
}

export function getActiveTenant() {
  return activeTenant;
}

export function tenantDatabaseName(baseName) {
  if (activeTenant.storage?.preserveLegacyDatabase) return baseName;
  return `${baseName}-${activeTenant.id}`;
}

window.AbwasserPlatform = Object.freeze({
  tenant: activeTenant,
  tenants: listTenantConfigs(),
  getActiveTenant,
  switchTenant,
  snapshotTenantStorage,
  tenantDatabaseName,
  applyTenantBranding,
});

applyTenantBranding(activeTenant);
mountEditionSwitcher();

window.addEventListener("pagehide", () => {
  snapshotTenantStorage(activeTenant.id);
});
