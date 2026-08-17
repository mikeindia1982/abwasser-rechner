import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {getTenantConfig,listTenantConfigs} from '../js/platform/tenant-config.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const [index,preboot,database,worker,vtaManifest,platformManifest]=await Promise.all([
  readFile(resolve(root,'index.html'),'utf8'),
  readFile(resolve(root,'js/platform/tenant-preboot.js'),'utf8'),
  readFile(resolve(root,'js/db/database.js'),'utf8'),
  readFile(resolve(root,'service-worker.js'),'utf8'),
  readFile(resolve(root,'manifest-vta.webmanifest'),'utf8'),
  readFile(resolve(root,'manifest-platform.webmanifest'),'utf8')
]);

const tenants=listTenantConfigs();
assert.deepEqual(tenants.map(x=>x.id).sort(),['platform','vta']);
assert.equal(getTenantConfig('vta').features.firebaseAuth,false,'Preview must not authenticate against production Firebase');
assert.equal(getTenantConfig('vta').features.cloudSync,false,'Preview must not sync production cloud data');
assert.equal(getTenantConfig('platform').defaultProfile.company,'','Neutral edition must not default to VTA');
assert.ok(preboot.includes("PREVIEW_PREFIX = 'abwasser-preview-alpha47'"),'Preview localStorage namespace missing');
assert.ok(preboot.includes("tenantId === 'vta'"),'VTA clone isolation missing');
assert.ok(database.includes('preview-alpha47-${tenantId}'),'Preview IndexedDB isolation missing');
assert.ok(index.includes('js/platform/tenant-preboot.js'),'Tenant preboot missing');
assert.ok(index.indexOf('tenant-preboot.js')<index.indexOf('js/app.js'),'Tenant preboot must load before app');
assert.ok(!index.includes('src="js/firebase-auth.js'),'Firebase auth must not execute in preview');
assert.ok(!index.includes('src="js/firebase-task-sync.js'),'Firebase task sync must not execute in preview');
assert.ok(worker.includes("CACHE_PREFIX='abwasser-preview-alpha47-'"),'Preview cache prefix missing');
assert.ok(worker.includes('key.startsWith(CACHE_PREFIX)&&key!==CACHE'),'Preview worker must only delete its own caches');
assert.equal(JSON.parse(vtaManifest).start_url,'./?tenant=vta');
assert.equal(JSON.parse(platformManifest).start_url,'./?tenant=platform');
console.log('Tenant preview validation passed.');
