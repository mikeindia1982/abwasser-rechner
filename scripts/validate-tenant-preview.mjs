import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {getTenantConfig,listTenantConfigs} from '../js/platform/tenant-config.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const [index,preboot,database,worker,vtaManifest,platformManifest,app,demoWorkspace,demoLoader,demoOrganization,documentRepository]=await Promise.all([
  readFile(resolve(root,'index.html'),'utf8'),
  readFile(resolve(root,'js/platform/tenant-preboot.js'),'utf8'),
  readFile(resolve(root,'js/db/database.js'),'utf8'),
  readFile(resolve(root,'service-worker.js'),'utf8'),
  readFile(resolve(root,'manifest-vta.webmanifest'),'utf8'),
  readFile(resolve(root,'manifest-platform.webmanifest'),'utf8'),
  readFile(resolve(root,'js/app.js'),'utf8'),
  readFile(resolve(root,'js/demo-workspace.js'),'utf8'),
  readFile(resolve(root,'js/demo-organization-loader.js'),'utf8'),
  readFile(resolve(root,'js/demo-organization.js'),'utf8'),
  readFile(resolve(root,'js/repositories/document-repository.js'),'utf8')
]);

const tenants=listTenantConfigs();
const vta=getTenantConfig('vta');
const platform=getTenantConfig('platform');
assert.deepEqual(tenants.map(x=>x.id).sort(),['platform','vta']);
assert.equal(vta.features.firebaseAuth,false,'Preview must not authenticate against production Firebase');
assert.equal(vta.features.cloudSync,false,'Preview must not sync production cloud data');
assert.equal(platform.defaultProfile.company,'','Neutral edition must not default to VTA');
assert.equal(platform.app.demoPlant.enabled,false,'Neutral edition must not force a built-in demo plant');
assert.equal(platform.app.seedProducts.length,0,'Neutral edition must start without vendor product seeds');
assert.equal(vta.app.demoPlant.enabled,true,'VTA edition must retain its configured demo plant');
assert.ok(vta.app.seedProducts.length>=2,'VTA edition must retain its configured seed products');

assert.ok(preboot.includes("PREVIEW_PREFIX = 'abwasser-preview-alpha47'"),'Preview localStorage namespace missing');
assert.ok(preboot.includes("tenantId === 'vta'"),'VTA clone isolation missing');
assert.ok(preboot.includes("cleanupMarkerKey = 'abwasser-platform-demo-cleanup-v01'"),'Neutral demo cleanup migration missing');
assert.ok(preboot.includes("legacyDemoPlantId = 'demo-plant-001'"),'Legacy demo plant id cleanup missing');
assert.ok(preboot.includes("stored.filter(plant => plant?.id !== legacyDemoPlantId)"),'Legacy demo plant removal missing');
assert.ok(database.includes('preview-alpha47-${tenantId}'),'Preview IndexedDB isolation missing');
assert.ok(index.includes('js/platform/tenant-preboot.js'),'Tenant preboot missing');
assert.ok(index.indexOf('tenant-preboot.js')<index.indexOf('js/app.js'),'Tenant preboot must load before app');
assert.ok(!index.includes('src="js/firebase-auth.js'),'Firebase auth must not execute in preview');
assert.ok(!index.includes('src="js/firebase-task-sync.js'),'Firebase task sync must not execute in preview');
assert.ok(worker.includes("CACHE_PREFIX='abwasser-preview-alpha47-'"),'Preview cache prefix missing');
assert.ok(worker.includes("CACHE=`${CACHE_PREFIX}v3`"),'Preview cache version must refresh stale tenant scripts');
assert.ok(worker.includes('tenant-preboot.js?v=preview-alpha47-fix1'),'Neutral cleanup preboot must be cache-busted');
assert.ok(worker.includes('key.startsWith(CACHE_PREFIX)&&key!==CACHE'),'Preview worker must only delete its own caches');
assert.ok(worker.includes('./js/editions/vta/edition-data.js'),'VTA edition data must be available offline');
assert.ok(worker.includes('./js/editions/platform/edition-data.js'),'Platform edition data must be available offline');
assert.equal(JSON.parse(vtaManifest).start_url,'./?tenant=vta');
assert.equal(JSON.parse(platformManifest).start_url,'./?tenant=platform');

for(const forbidden of ['VTA Testanlage Musterstadt','VTA Aquafix','VTA Biokat','Lokale Einstellungen für VTA Copilot.','const vta=hay.match']){
  assert.ok(!app.includes(forbidden),`Neutral app core still contains vendor coupling: ${forbidden}`);
}
assert.ok(app.includes('EDITION_APP.demoPlant?.enabled!==true'),'Demo plant must be edition-gated');
assert.ok(app.includes('structuredClone(EDITION_APP.seedProducts||[])'),'Product seeds must come from edition config');
assert.ok(app.includes('EDITION_APP.productImport?.namePatterns||[]'),'PDF product recognition must come from edition config');
assert.ok(app.includes('PRODUCT_FILE_DB_NAME'),'Product PDF database must be tenant-aware');
assert.ok(demoWorkspace.includes("__ABWASSER_PREVIEW_TENANT__==='platform')return"),'VTA demo workspace must be disabled in neutral preview');
assert.ok(demoLoader.includes("__ABWASSER_PREVIEW_TENANT__==='platform')return"),'VTA demo loader must be disabled in neutral preview');
assert.ok(demoOrganization.includes("__ABWASSER_PREVIEW_TENANT__==='platform')return"),'VTA demo organization must be disabled in neutral preview');
assert.ok(documentRepository.includes("tenantDatabaseName('abwasser-product-documents-v1')"),'Legacy PDF database must be isolated in preview');

console.log('Tenant preview validation passed with neutral core boundaries and stale demo cleanup.');
