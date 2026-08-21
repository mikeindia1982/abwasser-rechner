import { STORES, getAll, getOne, putOne, transaction } from '../db/database.js';
import { audit } from '../services/audit-service.js';

const nowIso = () => new Date().toISOString();
const uid = (prefix = 'kb') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeEntry(entry = {}) {
  const now = nowIso();
  return {
    id: entry.id || uid('knowledge'),
    organizationId: entry.organizationId || 'local',
    title: String(entry.title || '').trim(),
    summary: String(entry.summary || '').trim(),
    content: String(entry.content || '').trim(),
    knowledgeType: entry.knowledgeType || 'technical_knowledge',
    status: entry.status || 'draft',
    knowledgeLevel: entry.knowledgeLevel || 'unverified',
    visibility: entry.visibility || 'company',
    authorId: entry.authorId || null,
    ownerId: entry.ownerId || null,
    reviewerId: entry.reviewerId || null,
    validFrom: entry.validFrom || null,
    reviewDueAt: entry.reviewDueAt || null,
    fields: entry.fields && typeof entry.fields === 'object' ? entry.fields : {},
    createdAt: entry.createdAt || now,
    updatedAt: now,
    archivedAt: entry.archivedAt || null,
  };
}

export const knowledgeRepository = {
  async list() {
    return (await getAll(STORES.knowledgeEntries))
      .filter((entry) => !entry.deletedAt)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  },

  async get(id) {
    return getOne(STORES.knowledgeEntries, id);
  },

  async save(entry, { tags = [], links = [], sources = [] } = {}) {
    const normalized = normalizeEntry(entry);
    if (!normalized.title) throw new Error('Ein Titel ist erforderlich.');

    const [existingEntryTags, existingLinks, existingSources] = await Promise.all([
      getAll(STORES.knowledgeEntryTags),
      getAll(STORES.knowledgeLinks),
      getAll(STORES.knowledgeSources),
    ]);

    await transaction(
      [STORES.knowledgeEntries, STORES.knowledgeTags, STORES.knowledgeEntryTags, STORES.knowledgeLinks, STORES.knowledgeSources],
      'readwrite',
      (stores) => {
        stores[STORES.knowledgeEntries].put(normalized);

        for (const row of existingEntryTags) {
          if (row.knowledgeEntryId === normalized.id) stores[STORES.knowledgeEntryTags].delete(row.id);
        }
        for (const row of existingLinks) {
          if (row.knowledgeEntryId === normalized.id) stores[STORES.knowledgeLinks].delete(row.id);
        }
        for (const row of existingSources) {
          if (row.knowledgeEntryId === normalized.id) stores[STORES.knowledgeSources].delete(row.id);
        }

        for (const tagName of normalizeArray(tags).map((tag) => String(tag).trim()).filter(Boolean)) {
          const slug = tagName.toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-|-$/g, '');
          const tagId = `tag-${slug || uid('tag')}`;
          stores[STORES.knowledgeTags].put({ id: tagId, organizationId: normalized.organizationId, name: tagName, category: null, updatedAt: nowIso() });
          stores[STORES.knowledgeEntryTags].put({ id: `${normalized.id}::${tagId}`, knowledgeEntryId: normalized.id, tagId });
        }

        for (const link of normalizeArray(links)) {
          if (!link?.entityType || !link?.entityId) continue;
          stores[STORES.knowledgeLinks].put({
            id: link.id || uid('knowledge-link'),
            knowledgeEntryId: normalized.id,
            entityType: link.entityType,
            entityId: link.entityId,
            entityLabel: link.entityLabel || '',
            relationType: link.relationType || 'related_to',
            createdAt: link.createdAt || nowIso(),
          });
        }

        for (const source of normalizeArray(sources)) {
          if (!source?.sourceTitle && !source?.sourceEntityId) continue;
          stores[STORES.knowledgeSources].put({
            id: source.id || uid('knowledge-source'),
            knowledgeEntryId: normalized.id,
            sourceType: source.sourceType || 'manual',
            sourceEntityType: source.sourceEntityType || null,
            sourceEntityId: source.sourceEntityId || null,
            sourceTitle: source.sourceTitle || '',
            sourceUrl: source.sourceUrl || '',
            accessedAt: source.accessedAt || null,
            pageNumber: source.pageNumber || null,
            createdAt: source.createdAt || nowIso(),
          });
        }
      },
    );

    await audit('knowledge.saved', 'knowledge', normalized.id, {
      type: normalized.knowledgeType,
      status: normalized.status,
      level: normalized.knowledgeLevel,
    });
    return normalized;
  },

  async archive(id) {
    const entry = await this.get(id);
    if (!entry) return null;
    const updated = { ...entry, status: 'archived', archivedAt: nowIso(), updatedAt: nowIso() };
    await putOne(STORES.knowledgeEntries, updated);
    await audit('knowledge.archived', 'knowledge', id);
    return updated;
  },

  async remove(id) {
    const [entryTags, links, sources] = await Promise.all([
      getAll(STORES.knowledgeEntryTags),
      getAll(STORES.knowledgeLinks),
      getAll(STORES.knowledgeSources),
    ]);
    await transaction(
      [STORES.knowledgeEntries, STORES.knowledgeEntryTags, STORES.knowledgeLinks, STORES.knowledgeSources],
      'readwrite',
      (stores) => {
        stores[STORES.knowledgeEntries].delete(id);
        for (const row of entryTags) if (row.knowledgeEntryId === id) stores[STORES.knowledgeEntryTags].delete(row.id);
        for (const row of links) if (row.knowledgeEntryId === id) stores[STORES.knowledgeLinks].delete(row.id);
        for (const row of sources) if (row.knowledgeEntryId === id) stores[STORES.knowledgeSources].delete(row.id);
      },
    );
    await audit('knowledge.deleted', 'knowledge', id);
  },

  async detailsFor(entries = null) {
    const list = entries || (await this.list());
    const [tags, entryTags, links, sources] = await Promise.all([
      getAll(STORES.knowledgeTags),
      getAll(STORES.knowledgeEntryTags),
      getAll(STORES.knowledgeLinks),
      getAll(STORES.knowledgeSources),
    ]);
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    return list.map((entry) => ({
      ...entry,
      tags: entryTags
        .filter((row) => row.knowledgeEntryId === entry.id)
        .map((row) => tagById.get(row.tagId)?.name)
        .filter(Boolean),
      links: links.filter((row) => row.knowledgeEntryId === entry.id),
      sources: sources.filter((row) => row.knowledgeEntryId === entry.id),
    }));
  },
};
