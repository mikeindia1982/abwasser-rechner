import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(join(root,path),'utf8');

test('demo management dashboard is strictly gated to demo workspace',async()=>{
  const js=await read('js/demo-management-dashboard.js');
  assert.match(js,/MODE_KEY='vta-workspace-mode-v01'/);
  assert.match(js,/const isDemo=\(\)=>localStorage\.getItem\(MODE_KEY\)==='demo'/);
  assert.match(js,/if\(!isDemo\(\)\)return/);
  assert.match(js,/demoManagementLauncher/);
});

test('management cockpit covers the agreed executive KPI domains',async()=>{
  const js=await read('js/demo-management-dashboard.js');
  for(const term of ['Umsatz','Auftragseingang','Forecast Jahresende','Gewichtete Pipeline','Rohertrag / DB','Kunden mit Risiko','Bestellungen ≤30 Tage','Management Attention','Cross-Selling','Marktabdeckung & Conversion']){
    assert.ok(js.includes(term),`missing executive KPI/domain: ${term}`);
  }
  assert.match(js,/PIPELINE/);
  assert.match(js,/REGIONS/);
  assert.match(js,/PRODUCTS/);
  assert.match(js,/ORDER_FORECAST/);
});

test('management cockpit provides management drill-down filters',async()=>{
  const js=await read('js/demo-management-dashboard.js');
  for(const filter of ['period','region','employee','segment'])assert.match(js,new RegExp(`data-mgmt-filter=\\"${filter}\\"`));
  assert.match(js,/data-region-jump/);
  assert.match(js,/data-segment-jump/);
  assert.match(js,/data-open-plant/);
});

test('management presentation remains responsive down to iPhone width',async()=>{
  const css=await read('demo-management-dashboard.css');
  assert.match(css,/\.demo-mgmt-kpis/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(max-width:430px\)/);
  assert.match(css,/\.demo-mgmt-attention-list/);
});

test('index loads the demo management assets',async()=>{
  const html=await read('index.html');
  assert.match(html,/demo-management-dashboard\.css/);
  assert.match(html,/js\/demo-management-dashboard\.js/);
});
