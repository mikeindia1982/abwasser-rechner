import { STORES, getAll, putOne } from '../../db/database.js';

function makeId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${prefix}-${randomId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function sortByCreatedDesc(list) {
  return [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function normalizeMatch(value = {}) {
  return {
    id: value.id || makeId('match'),
    tenderNoticeId: String(value.tenderNoticeId || '').trim(),
    score: Number(value.score) || 0,
    relevanceLevel: value.relevanceLevel || 'IRRELEVANT',
    matchReasons: Array.isArray(value.matchReasons) ? value.matchReasons : [],
    matchedKeywords: Array.isArray(value.matchedKeywords) ? value.matchedKeywords : [],
    matchedCpvCodes: Array.isArray(value.matchedCpvCodes) ? value.matchedCpvCodes : [],
    regionMatched: value.regionMatched === true ? true : value.regionMatched === false ? false : null,
    status: value.status || 'NEW',
    assignedUserId: value.assignedUserId || '',
    assignedUserName: value.assignedUserName || '',
    isRead: Boolean(value.isRead),
    readAt: value.readAt || '',
    changedSinceRead: Boolean(value.changedSinceRead),
    isNewVersion: Boolean(value.isNewVersion),
    createdAt: value.createdAt || nowIso(),
    updatedAt: value.updatedAt || nowIso()
  };
}

function normalizeNotice(value = {}) {
  return {
    id: value.id || makeId('notice'),
    source: String(value.source || '').trim(),
    sourceNoticeId: String(value.sourceNoticeId || '').trim(),
    sourceVersionId: String(value.sourceVersionId || '').trim(),
    publicationNumber: String(value.publicationNumber || '').trim(),
    title: String(value.title || '').trim(),
    description: String(value.description || '').trim(),
    noticeType: String(value.noticeType || '').trim(),
    procedureType: String(value.procedureType || '').trim(),
    contractNature: String(value.contractNature || '').trim(),
    buyerName: String(value.buyerName || '').trim(),
    buyerType: String(value.buyerType || '').trim(),
    buyerIdentifier: String(value.buyerIdentifier || '').trim(),
    mainCpvCode: String(value.mainCpvCode || '').trim(),
    additionalCpvCodes: Array.isArray(value.additionalCpvCodes) ? value.additionalCpvCodes : [],
    nutsCodes: Array.isArray(value.nutsCodes) ? value.nutsCodes : [],
    countryCode: String(value.countryCode || 'DE').trim(),
    federalState: String(value.federalState || '').trim(),
    city: String(value.city || '').trim(),
    postalCode: String(value.postalCode || '').trim(),
    publishedAt: String(value.publishedAt || '').trim(),
    submissionDeadline: String(value.submissionDeadline || '').trim(),
    estimatedValue: String(value.estimatedValue || '').trim(),
    estimatedValueCurrency: String(value.estimatedValueCurrency || '').trim(),
    originalUrl: String(value.originalUrl || '').trim(),
    rawDataReference: String(value.rawDataReference || '').trim(),
    contentHash: String(value.contentHash || '').trim(),
    partialReasons: Array.isArray(value.partialReasons) ? value.partialReasons : [],
    uniqueKey: String(value.uniqueKey || '').trim(),
    updatedAt: value.updatedAt || nowIso(),
    createdAt: value.createdAt || nowIso()
  };
}

function normalizeScanRun(value = {}) {
  return {
    id: value.id || makeId('scan'),
    source: value.source || '',
    startedAt: value.startedAt || nowIso(),
    finishedAt: value.finishedAt || '',
    status: value.status || 'RUNNING',
    requestedFrom: value.requestedFrom || '',
    requestedTo: value.requestedTo || '',
    fetchedCount: Number(value.fetchedCount) || 0,
    insertedCount: Number(value.insertedCount) || 0,
    updatedCount: Number(value.updatedCount) || 0,
    unchangedCount: Number(value.unchangedCount) || 0,
    failedCount: Number(value.failedCount) || 0,
    newMatchCount: Number(value.newMatchCount) || 0,
    changedMatchCount: Number(value.changedMatchCount) || 0,
    errorSummary: value.errorSummary || '',
    createdAt: value.createdAt || nowIso()
  };
}

export const tenderRepository = {
  async listNotices() {
    return sortByCreatedDesc(await getAll(STORES.tenderNotices));
  },

  async listMatches() {
    return sortByCreatedDesc(await getAll(STORES.tenderMatches)).map(normalizeMatch);
  },

  async listScanRuns(limit = 20) {
    return sortByCreatedDesc(await getAll(STORES.tenderScanRuns)).slice(0, limit).map(normalizeScanRun);
  },

  async listFeedback(limit = 200) {
    return sortByCreatedDesc(await getAll(STORES.tenderFeedback)).slice(0, limit);
  },

  async unreadRelevantCount() {
    const matches = await this.listMatches();
    return matches.filter(m => !m.isRead && (m.relevanceLevel === 'HIGH' || m.relevanceLevel === 'MEDIUM' || m.relevanceLevel === 'LOW')).length;
  },

  async getLastSuccessfulRun() {
    const runs = await this.listScanRuns(100);
    return runs.find(run => run.status === 'SUCCESS' || run.status === 'PARTIAL_SUCCESS') || null;
  },

  async saveScanRun(scanRun) {
    const normalized = normalizeScanRun(scanRun);
    await putOne(STORES.tenderScanRuns, normalized);
    return normalized;
  },

  async upsertNotice({ sourceNotice, rawNotice, contentHash }) {
    const normalized = normalizeNotice({
      ...sourceNotice,
      contentHash,
      uniqueKey: [sourceNotice.source, sourceNotice.sourceNoticeId, sourceNotice.publicationNumber || '-'].join('|')
    });

    const notices = await this.listNotices();
    const found = notices.find(item => item.uniqueKey === normalized.uniqueKey) || null;
    const exactHashMatch = found && found.contentHash === normalized.contentHash;

    if (!found) {
      const created = {
        ...normalized,
        id: normalized.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        rawDataReference: `${normalized.id}:raw`
      };
      await putOne(STORES.tenderNotices, created);
      await putOne(STORES.tenderRawNotices, { id: created.rawDataReference, noticeId: created.id, source: created.source, raw: rawNotice, createdAt: nowIso() });
      return { notice: created, changeType: 'inserted' };
    }

    if (exactHashMatch) {
      return { notice: found, changeType: 'unchanged' };
    }

    const updated = {
      ...found,
      ...normalized,
      id: found.id,
      createdAt: found.createdAt,
      updatedAt: nowIso(),
      rawDataReference: `${found.id}:raw:${Date.now()}`
    };
    await putOne(STORES.tenderNotices, updated);
    await putOne(STORES.tenderRawNotices, { id: updated.rawDataReference, noticeId: updated.id, source: updated.source, raw: rawNotice, createdAt: nowIso() });
    return { notice: updated, changeType: 'updated' };
  },

  async upsertMatch(nextMatch, { markChanged = false } = {}) {
    const matches = await this.listMatches();
    const existing = matches.find(m => m.tenderNoticeId === nextMatch.tenderNoticeId) || null;

    if (!existing) {
      const created = normalizeMatch({ ...nextMatch, createdAt: nowIso(), updatedAt: nowIso() });
      await putOne(STORES.tenderMatches, created);
      return { match: created, changeType: 'inserted' };
    }

    const updated = normalizeMatch({
      ...existing,
      ...nextMatch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
      isRead: markChanged ? false : existing.isRead,
      changedSinceRead: markChanged ? true : existing.changedSinceRead,
      isNewVersion: markChanged ? true : existing.isNewVersion
    });

    await putOne(STORES.tenderMatches, updated);
    return { match: updated, changeType: 'updated' };
  },

  async updateMatchStatus(matchId, { status, isRead, comment = '', userName = '' } = {}) {
    const matches = await this.listMatches();
    const existing = matches.find(item => item.id === matchId);
    if (!existing) return null;

    const previousStatus = existing.status;
    const next = {
      ...existing,
      status: status || existing.status,
      isRead: typeof isRead === 'boolean' ? isRead : existing.isRead,
      readAt: typeof isRead === 'boolean' && isRead ? nowIso() : existing.readAt,
      changedSinceRead: typeof isRead === 'boolean' && isRead ? false : existing.changedSinceRead,
      isNewVersion: typeof isRead === 'boolean' && isRead ? false : existing.isNewVersion,
      updatedAt: nowIso()
    };
    await putOne(STORES.tenderMatches, next);

    await putOne(STORES.tenderFeedback, {
      id: makeId('feedback'),
      tenderMatchId: next.id,
      tenderNoticeId: next.tenderNoticeId,
      userName: String(userName || '').trim(),
      changedAt: nowIso(),
      previousStatus,
      newStatus: next.status,
      comment: String(comment || '').trim()
    });

    return next;
  },

  async saveNotification(notification) {
    const payload = {
      id: notification.id || makeId('notif'),
      type: notification.type || 'tender',
      title: notification.title || 'Neue relevante Ausschreibung',
      message: notification.message || '',
      level: notification.level || 'info',
      tenderNoticeId: notification.tenderNoticeId || '',
      tenderMatchId: notification.tenderMatchId || '',
      createdAt: notification.createdAt || nowIso(),
      isRead: Boolean(notification.isRead)
    };
    await putOne(STORES.tenderNotifications, payload);
    return payload;
  },

  async listNotifications(limit = 100) {
    return sortByCreatedDesc(await getAll(STORES.tenderNotifications)).slice(0, limit);
  }
};
