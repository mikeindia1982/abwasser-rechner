import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(join(root,path),'utf8');

test('carbon nano appearance is globally scoped to the demo workspace',async()=>{
  const css=await read('demo-carbon-nano.css');
  assert.match(css,/html\.demo-workspace-active\{/);
  assert.match(css,/html\.demo-workspace-active body/);
  assert.match(css,/--nano-grid:/);
  assert.match(css,/\.demo-mgmt-map-layout/);
  assert.doesNotMatch(css,/(^|\n)body\s*\{/);
});

test('management dashboard contains the international executive map',async()=>{
  const dashboard=await read('js/demo-management-dashboard.js');
  const map=await read('js/demo-management-map.js');
  assert.match(dashboard,/demoManagementTerritoryMap/);
  assert.match(dashboard,/94 Regionen · 6 Länder/);
  assert.match(map,/MODE_KEY='vta-workspace-mode-v01'/);
  assert.match(map,/const isDemo=\(\)=>localStorage\.getItem\(MODE_KEY\)==='demo'/);
  assert.match(map,/demo-sales-regions\.geojson/);
  assert.match(map,/internationalTerritoryColorExpression/);
  assert.match(map,/data-demo-map-people-count/);
  for(const country of ['DE','AT','CH','FR','CZ','PL'])assert.match(map,new RegExp(`${country}:\\{name:`));
});

test('global demo portfolio contains 186 plants and 36 fictional employees',async()=>{
  const workspace=await read('js/demo-workspace.js');
  const organization=await read('js/demo-organization.js');
  assert.match(workspace,/const DEMO_VERSION='3'/);
  assert.match(workspace,/target:78,existing:4/);
  assert.match(workspace,/target:24,existing:1/);
  assert.match(workspace,/target:20,existing:1/);
  assert.match(workspace,/target:30,existing:1/);
  assert.match(workspace,/target:16,existing:1/);
  assert.match(workspace,/target:18,existing:1/);
  assert.match(organization,/const ORG_VERSION='2'/);
  for(const count of [5,5,4,6,4,4])assert.ok(organization.includes(`count:${count}`));
  assert.match(organization,/Fiktiver Demo-Benutzer/);
});

test('index and offline cache include all carbon nano assets',async()=>{
  const html=await read('index.html');
  const sw=await read('service-worker.js');
  for(const asset of ['demo-carbon-nano.css','demo-management-dashboard.css','js/demo-management-dashboard.js','js/demo-management-map.js']){
    assert.ok(html.includes(asset),`index missing ${asset}`);
    assert.ok(sw.includes(asset),`service worker missing ${asset}`);
  }
});
