import { STORES, getOne, putOne } from '../db/database.js';
import { knowledgeRepository } from '../repositories/knowledge-repository.js';
import { audit } from './audit-service.js';
import { KNOWLEDGE_SEED_ENTRIES, KNOWLEDGE_SEED_VERSION } from '../knowledge/knowledge-seed-data.js';

const SETTING_ID = 'knowledge-basiswissen-seed';

export async function ensureKnowledgeSeed() {
  const marker = await getOne(STORES.settings, SETTING_ID);
  const installedVersion = Number(marker?.version || 0);
  if (installedVersion >= KNOWLEDGE_SEED_VERSION) {
    return { imported: 0, skipped: true, version: installedVersion };
  }

  const existing = new Set((await knowledgeRepository.list()).map(entry => entry.id));
  let imported = 0;

  for (const seed of KNOWLEDGE_SEED_ENTRIES) {
    // Stable IDs protect user edits: an existing seeded entry is never overwritten.
    if (existing.has(seed.id)) continue;
    await knowledgeRepository.save(seed, {
      tags: seed.tags || [],
      links: seed.links || [],
      sources: seed.sources || [],
    });
    imported += 1;
  }

  const completedAt = new Date().toISOString();
  await putOne(STORES.settings, {
    id: SETTING_ID,
    version: KNOWLEDGE_SEED_VERSION,
    imported,
    available: KNOWLEDGE_SEED_ENTRIES.length,
    completedAt,
  });
  await audit('knowledge.seed.completed', 'system', SETTING_ID, {
    version: KNOWLEDGE_SEED_VERSION,
    imported,
    available: KNOWLEDGE_SEED_ENTRIES.length,
  });

  return { imported, skipped: false, version: KNOWLEDGE_SEED_VERSION };
}
