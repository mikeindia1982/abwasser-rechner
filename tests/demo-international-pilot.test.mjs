import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEMO_INTERNATIONAL_TERRITORIES,
  internationalTerritoryForFeature,
  internationalTerritoryColorExpression,
} from '../js/sales-territory-config.js';

const regions=JSON.parse(fs.readFileSync(new URL('../assets/data/demo-sales-regions.geojson',import.meta.url),'utf8'));
const i18n=fs.readFileSync(new URL('../js/demo-i18n.js',import.meta.url),'utf8');
const demoWorkspace=fs.readFileSync(new URL('../js/demo-workspace.js',import.meta.url),'utf8');

test('demo map contains the intended 94 first-level regions in six countries',()=>{
  const counts={};
  for(const feature of regions.features)counts[feature.properties.countryCode]=(counts[feature.properties.countryCode]||0)+1;
  assert.equal(regions.features.length,94);
  assert.deepEqual(counts,{AT:9,CH:26,FR:13,CZ:14,PL:16,DE:16});
  assert.equal(new Set(regions.features.map(feature=>feature.properties.regionCode)).size,94);
  for(const feature of regions.features)assert.ok(internationalTerritoryForFeature(feature.properties));
  assert.equal(internationalTerritoryColorExpression()[0],'match');
  assert.equal(DEMO_INTERNATIONAL_TERRITORIES.length,9);
});

test('language switcher is restricted to demo and provides German, English and French',()=>{
  assert.match(i18n,/MODE_KEY='vta-workspace-mode-v01'/);
  assert.match(i18n,/const SUPPORTED=\['de','en','fr'\]/);
  assert.match(i18n,/if\(!isDemo\(\)\)return/);
  assert.match(i18n,/data-demo-language="en"/);
  assert.match(i18n,/data-demo-language="fr"/);
});

test('demo seed is versioned and includes plants in all pilot countries',()=>{
  assert.match(demoWorkspace,/const DEMO_VERSION='3'/);
  for(const country of ['Deutschland','Schweiz','Österreich','Frankreich','Tschechien','Polen'])assert.ok(demoWorkspace.includes(`country:'${country}'`));
  for(let index=1;index<=9;index++)assert.ok(demoWorkspace.includes(`vta-present-plant-00${index}`));
  assert.match(demoWorkspace,/target:78,existing:4/);
  assert.match(demoWorkspace,/target:24,existing:1/);
  assert.match(demoWorkspace,/target:20,existing:1/);
  assert.match(demoWorkspace,/target:30,existing:1/);
  assert.match(demoWorkspace,/target:16,existing:1/);
  assert.match(demoWorkspace,/target:18,existing:1/);
});
