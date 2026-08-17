import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_TENANT_ID,
  getTenantConfig,
  listTenantConfigs,
} from "../js/platform/tenant-config.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const tenants = listTenantConfigs();
assert.equal(DEFAULT_TENANT_ID, "vta", "VTA must stay the safe migration default");
assert.ok(tenants.length >= 2, "At least VTA and neutral platform editions are required");
assert.equal(new Set(tenants.map((x) => x.id)).size, tenants.length, "Tenant ids must be unique");
assert.equal(
  new Set(tenants.map((x) => x.organization?.id)).size,
  tenants.length,
  "Organization ids must be unique",
);

const vta = getTenantConfig("vta");
const platform = getTenantConfig("platform");
assert.equal(vta.storage.preserveLegacyDatabase, true, "VTA must preserve the legacy database");
assert.equal(platform.storage.preserveLegacyDatabase, false, "Neutral platform must use its own database");
assert.equal(platform.storage.seedProducts, "empty", "Neutral platform must not seed VTA products");
assert.equal(platform.defaultProfile.company, "", "Neutral platform must not default to VTA");
assert.ok(vta.organization.id && platform.organization.id, "Every edition needs an organization identity");

const [
  index,
  database,
  serviceWorker,
  legacyBranding,
  vtaManifest,
  platformManifest,
  vtaEntry,
  platformEntry,
] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "js/db/database.js"), "utf8"),
  readFile(resolve(root, "service-worker.js"), "utf8"),
  readFile(resolve(root, "branding/branding.js"), "utf8"),
  readFile(resolve(root, "manifest-vta.webmanifest"), "utf8"),
  readFile(resolve(root, "manifest-platform.webmanifest"), "utf8"),
  readFile(resolve(root, "vta.html"), "utf8"),
  readFile(resolve(root, "platform.html"), "utf8"),
]);

assert.ok(index.includes("js/platform/tenant-runtime.js"), "Tenant runtime must load before the legacy app");
assert.ok(index.includes("js/platform/organization-bootstrap.js"), "Organization bootstrap must be loaded");
assert.ok(
  index.indexOf("js/platform/tenant-runtime.js") < index.indexOf("js/app.js"),
  "Tenant runtime must precede app.js",
);
assert.ok(index.includes("manifest-vta.webmanifest"), "VTA manifest selection is missing");
assert.ok(index.includes("manifest-platform.webmanifest"), "Platform manifest selection is missing");
assert.ok(database.includes("DB_VERSION = 2"), "Database schema must contain the organization upgrade");
assert.ok(database.includes("organizations:'organizations'"), "Organizations store is missing");
assert.ok(serviceWorker.includes("organization-bootstrap.js"), "Organization bootstrap must be cached for offline use");
assert.ok(serviceWorker.includes("organization-repository.js"), "Organization repository must be cached for offline use");
assert.ok(serviceWorker.includes("cachedNavigation"), "Offline navigation must prefer cached edition entry points");
assert.ok(serviceWorker.includes("isAppShell"), "Navigation responses must not overwrite the app shell indiscriminately");
assert.ok(JSON.parse(vtaManifest).start_url.includes("tenant=vta"), "VTA manifest must open the VTA edition");
assert.ok(JSON.parse(platformManifest).start_url.includes("tenant=platform"), "Platform manifest must open the neutral edition");
assert.ok(vtaEntry.includes('set("tenant", "vta")'), "VTA entry point is not pinned to the VTA edition");
assert.ok(platformEntry.includes('set("tenant", "platform")'), "Platform entry point is not pinned to the neutral edition");
assert.ok(!legacyBranding.includes('company: "Krause"'), "Legacy company hardcoding must stay removed");

console.log(`Platform validation passed for ${tenants.length} editions.`);
