import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SALES_TERRITORIES, territoryForStateCode, territoryColorExpression } from '../js/sales-territory-config.js';

const geojson = JSON.parse(fs.readFileSync(new URL('../assets/data/bundeslaender-vg250.geojson', import.meta.url), 'utf8'));

test('all 16 federal states have exactly one sales territory', () => {
  const configuredCodes = SALES_TERRITORIES.flatMap(territory => territory.stateCodes);
  const geojsonCodes = geojson.features.map(feature => feature.properties.ags);
  assert.equal(geojson.features.length, 16);
  assert.equal(new Set(configuredCodes).size, 16);
  assert.deepEqual([...configuredCodes].sort(), [...geojsonCodes].sort());
  for (const code of geojsonCodes) assert.ok(territoryForStateCode(code));
});

test('territories have distinct colors and usable labels', () => {
  assert.equal(new Set(SALES_TERRITORIES.map(territory => territory.color)).size, SALES_TERRITORIES.length);
  for (const territory of SALES_TERRITORIES) {
    assert.match(territory.color, /^#[0-9a-f]{6}$/i);
    assert.ok(territory.label);
    assert.ok(territory.ownerLabel);
  }
  assert.equal(territoryColorExpression()[0], 'match');
});
