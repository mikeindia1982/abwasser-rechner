import test from 'node:test';
import assert from 'node:assert/strict';
import { TenderScanService } from '../js/tenders/services/tender-scan-service.js';
import { TENDER_RELEVANCE_LEVELS } from '../js/tenders/config.js';
import { evaluateTenderNotice } from '../js/tenders/services/tender-relevance-service.js';
import {
  fixtureFlockungsmittelHigh,
  fixtureVersion2,
  fixtureUnknownExecutionRegion,
  fixtureIrrelevant
} from './fixtures/tender-notice-fixtures.js';

function mkId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function memoryRepository() {
  const notices = [];
  const matches = [];
  const runs = [];
  const feedback = [];
  const notifications = [];

  return {
    async listNotices() { return [...notices]; },
    async listMatches() { return [...matches]; },
    async listScanRuns() { return [...runs]; },
    async listFeedback() { return [...feedback]; },
    async listNotifications() { return [...notifications]; },
    async unreadRelevantCount() { return matches.filter(x => !x.isRead && x.relevanceLevel !== 'IRRELEVANT').length; },
    async getLastSuccessfulRun() {
      return [...runs].reverse().find(r => r.status === 'SUCCESS' || r.status === 'PARTIAL_SUCCESS') || null;
    },
    async saveScanRun(scanRun) {
      const idx = runs.findIndex(x => x.id === scanRun.id);
      if (idx >= 0) runs[idx] = scanRun;
      else runs.push({ id: scanRun.id || mkId('scan'), ...scanRun });
      return runs[runs.length - 1];
    },
    async upsertNotice({ sourceNotice, rawNotice, contentHash }) {
      const uniqueKey = [sourceNotice.source, sourceNotice.sourceNoticeId, sourceNotice.sourceVersionId || '-', sourceNotice.publicationNumber || '-'].join('|');
      const existing = notices.find(n => n.uniqueKey === uniqueKey);
      if (!existing) {
        const created = { id: mkId('notice'), ...sourceNotice, uniqueKey, contentHash, rawDataReference: mkId('raw') };
        notices.push(created);
        return { notice: created, changeType: 'inserted' };
      }
      if (existing.contentHash === contentHash) {
        return { notice: existing, changeType: 'unchanged' };
      }
      Object.assign(existing, sourceNotice, { contentHash });
      return { notice: existing, changeType: 'updated' };
    },
    async upsertMatch(nextMatch, { markChanged = false } = {}) {
      const existing = matches.find(m => m.tenderNoticeId === nextMatch.tenderNoticeId);
      if (!existing) {
        const created = { id: mkId('match'), ...nextMatch, isRead: false };
        matches.push(created);
        return { match: created, changeType: 'inserted' };
      }
      Object.assign(existing, nextMatch);
      if (markChanged) {
        existing.isRead = false;
        existing.isNewVersion = true;
      }
      return { match: existing, changeType: 'updated' };
    },
    async updateMatchStatus(matchId, patch = {}) {
      const item = matches.find(x => x.id === matchId);
      if (!item) return null;
      Object.assign(item, patch);
      feedback.push({ id: mkId('fb'), tenderMatchId: item.id, previousStatus: item.status, newStatus: patch.status || item.status });
      return item;
    },
    async saveNotification(notification) {
      notifications.push({ id: mkId('notif'), ...notification });
      return notifications[notifications.length - 1];
    }
  };
}

function makeSource(rawNotices) {
  return {
    async fetchNoticesByPublicationRange() {
      return { rawNotices, failures: [] };
    },
    normalizeNotice(rawNotice) {
      return rawNotice;
    }
  };
}

test('new notice is imported', async () => {
  const repository = memoryRepository();
  const service = new TenderScanService({ repository, source: makeSource([fixtureFlockungsmittelHigh]) });
  const run = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(run.insertedCount, 1);
  assert.equal((await repository.listNotices()).length, 1);
});

test('same notice is not duplicated', async () => {
  const repository = memoryRepository();
  const service = new TenderScanService({ repository, source: makeSource([fixtureFlockungsmittelHigh]) });
  await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  const run2 = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(run2.unchangedCount, 1);
  assert.equal((await repository.listNotices()).length, 1);
});

test('new version updates existing notice', async () => {
  const repository = memoryRepository();
  const service = new TenderScanService({ repository, source: makeSource([fixtureFlockungsmittelHigh, fixtureVersion2]) });
  const run = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(run.insertedCount, 2);
  assert.equal((await repository.listNotices()).length, 2);
});

test('missing fields do not crash import', async () => {
  const repository = memoryRepository();
  const broken = { ...fixtureUnknownExecutionRegion, title: '', sourceNoticeId: 'TEST-MISSING-1' };
  const service = new TenderScanService({ repository, source: makeSource([broken]) });
  const run = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(run.failedCount, 0);
  assert.equal(run.insertedCount, 1);
});

test('single notice failure does not stop run', async () => {
  const repository = memoryRepository();
  const source = {
    async fetchNoticesByPublicationRange() {
      return { rawNotices: [fixtureFlockungsmittelHigh, fixtureIrrelevant], failures: [] };
    },
    normalizeNotice(rawNotice) {
      if (rawNotice.sourceNoticeId === fixtureIrrelevant.sourceNoticeId) throw new Error('parse failure');
      return rawNotice;
    }
  };
  const service = new TenderScanService({ repository, source });
  const run = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(run.insertedCount, 1);
  assert.equal(run.failedCount, 1);
});

test('parallel manual imports are prevented', async () => {
  const repository = memoryRepository();
  const source = {
    async fetchNoticesByPublicationRange() {
      await new Promise(resolve => setTimeout(resolve, 40));
      return { rawNotices: [fixtureFlockungsmittelHigh], failures: [] };
    },
    normalizeNotice(rawNotice) { return rawNotice; }
  };
  const service = new TenderScanService({ repository, source });
  const first = service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  const second = await service.runImportRange({ from: '2026-07-20', to: '2026-07-20', trigger: 'test' });
  assert.equal(second.skipped, true);
  await first;
});

test('relevance engine keeps unknown region candidate', () => {
  const relevance = evaluateTenderNotice(fixtureUnknownExecutionRegion);
  assert.equal(relevance.regionMatched, null);
  assert.ok(relevance.relevanceLevel !== TENDER_RELEVANCE_LEVELS.IRRELEVANT);
});
