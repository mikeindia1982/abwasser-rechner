import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE_SEED_ENTRIES, KNOWLEDGE_SEED_VERSION } from '../js/knowledge/knowledge-seed-data.js';
import { VTA_GRUNDWISSEN_V1_ENTRIES } from '../js/knowledge/knowledge-seed-vta-v1.js';

test('VTA Grundwissen V1 exposes stable, source-backed draft entries', () => {
  assert.equal(KNOWLEDGE_SEED_VERSION, 2);
  assert.equal(VTA_GRUNDWISSEN_V1_ENTRIES.length, 45);

  const ids = VTA_GRUNDWISSEN_V1_ENTRIES.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const entry of VTA_GRUNDWISSEN_V1_ENTRIES) {
    assert.match(entry.id, /^vta-grundwissen-v1-[a-z0-9-]+$/);
    assert.equal(entry.organizationId, 'local');
    assert.equal(entry.status, 'draft');
    assert.equal(entry.visibility, 'company');
    assert.equal(entry.knowledgeLevel, 'unverified');
    assert.match(entry.fields.origin, /VTA Grundwissen V1/);
    assert.match(entry.fields.quality, /Ungeprüfter Entwurf/);
    assert.ok(entry.sources[0].pageNumber);
    assert.equal(entry.sources[0].sourceTitle, 'Grundwissen für Betreiber von Kläranlagen');
  }
});

test('VTA entries are additive to the existing seed library', () => {
  const vtaIds = new Set(VTA_GRUNDWISSEN_V1_ENTRIES.map((entry) => entry.id));
  assert.equal(KNOWLEDGE_SEED_ENTRIES.length, 75);
  assert.equal(KNOWLEDGE_SEED_ENTRIES.filter((entry) => vtaIds.has(entry.id)).length, 45);
  assert.equal(KNOWLEDGE_SEED_ENTRIES.filter((entry) => !vtaIds.has(entry.id)).length, 30);
});

test('requested knowledge categories are represented', () => {
  const categories = new Set(VTA_GRUNDWISSEN_V1_ENTRIES.map((entry) => entry.knowledgeType));
  for (const category of ['technical_knowledge', 'problem_solution', 'faq', 'best_practice', 'issue_pattern']) {
    assert.ok(categories.has(category), `missing category ${category}`);
  }
});
