import { TENDER_RADAR_CONFIG, TENDER_RELEVANCE_LEVELS, TENDER_SCAN_RUN_STATUSES, TENDER_SOURCES, TENDER_STATUSES } from '../config.js';
import { tenderRepository } from '../repositories/tender-repository.js';
import { GermanPublicProcurementDataSource, tenderContentHash } from '../sources/german-public-procurement-data-source.js';
import { detectExpiredNotice, evaluateTenderNotice } from './tender-relevance-service.js';

const STORAGE_TENDER_IMPORT_LOCK = 'abwasser-tender-radar-import-lock-v01';
const STORAGE_TENDER_LAST_SYNC_AT = 'abwasser-tender-radar-last-sync-at-v01';
const IMPORT_LOCK_TTL_MS = 2 * 60 * 1000;
const IMPORT_LOCK_HEARTBEAT_MS = 5 * 1000;
const IMPORT_LOCK_STALE_AFTER_MS = 20 * 1000;
const IMPORT_RUN_TIMEOUT_MS = 45 * 1000;
const IMPORT_RUN_WATCHDOG_MS = 120 * 1000;
const IMPORT_RUN_RECOVERY_AFTER_MS = 45 * 1000;

const memoryStorage = new Map();
function storageGet(key) {
  if (globalThis.localStorage?.getItem) return globalThis.localStorage.getItem(key);
  return memoryStorage.get(key) || '';
}
function storageSet(key, value) {
  if (globalThis.localStorage?.setItem) {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  memoryStorage.set(key, value);
}
function storageRemove(key) {
  if (globalThis.localStorage?.removeItem) {
    globalThis.localStorage.removeItem(key);
    return;
  }
  memoryStorage.delete(key);
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function latestAllowedPublicationDay() {
  return addDays(todayDateOnly(), -1);
}

function dateOnly(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function addDays(dateIso, days) {
  const d = new Date(`${dateOnly(dateIso)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const a = new Date(`${dateOnly(from)}T00:00:00Z`);
  const b = new Date(`${dateOnly(to)}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function readEmployeeProfile() {
  try {
    return JSON.parse(storageGet('abwasser-employee-profile-v087') || '{}');
  } catch {
    return {};
  }
}

function resolveAssignee(federalState) {
  const profile = readEmployeeProfile();
  const fullName = String([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim());
  const configured = TENDER_RADAR_CONFIG.assignments.find(item => String(item.federalState).toLowerCase() === String(federalState || '').toLowerCase());
  if (!configured) return { assignedUserId: '', assignedUserName: '' };

  if (fullName && fullName.toLowerCase() === String(configured.assigneeName).toLowerCase()) {
    return { assignedUserId: fullName.toLowerCase().replace(/\s+/g, '-'), assignedUserName: fullName };
  }

  return { assignedUserId: '', assignedUserName: '' };
}

function lockNow() {
  const now = Date.now();
  const lockValue = {
    startedAt: new Date().toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + IMPORT_LOCK_TTL_MS).toISOString()
  };
  storageSet(STORAGE_TENDER_IMPORT_LOCK, JSON.stringify(lockValue));
  return lockValue;
}

function touchLock() {
  const lock = readLock();
  if (!lock) return;
  const now = Date.now();
  const next = {
    ...lock,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + IMPORT_LOCK_TTL_MS).toISOString()
  };
  storageSet(STORAGE_TENDER_IMPORT_LOCK, JSON.stringify(next));
}

function readLock() {
  try {
    return JSON.parse(storageGet(STORAGE_TENDER_IMPORT_LOCK) || 'null');
  } catch {
    return null;
  }
}

function clearLock() {
  storageRemove(STORAGE_TENDER_IMPORT_LOCK);
}

function isLockActive() {
  const lock = readLock();
  if (!lock?.expiresAt) return false;
  const now = Date.now();
  const expiresAt = new Date(lock.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    clearLock();
    return false;
  }
  const freshnessIso = lock.updatedAt || lock.startedAt || '';
  const freshness = new Date(freshnessIso).getTime();
  if (Number.isFinite(freshness) && now - freshness > IMPORT_LOCK_STALE_AFTER_MS) {
    clearLock();
    return false;
  }
  return true;
}

function isRelevantLevel(level) {
  return level === TENDER_RELEVANCE_LEVELS.HIGH || level === TENDER_RELEVANCE_LEVELS.MEDIUM || level === TENDER_RELEVANCE_LEVELS.LOW;
}

function withTimeout(promise, timeoutMs, message = 'Timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
  ]);
}

export class TenderScanService {
  constructor({
    repository = tenderRepository,
    source = new GermanPublicProcurementDataSource()
  } = {}) {
    this.repository = repository;
    this.source = source;
    this.isRunning = false;
    this.lockHeartbeatHandle = null;
  }

  startLockHeartbeat() {
    this.stopLockHeartbeat();
    this.lockHeartbeatHandle = setInterval(() => {
      if (!this.isRunning) return;
      touchLock();
    }, IMPORT_LOCK_HEARTBEAT_MS);
  }

  stopLockHeartbeat() {
    if (this.lockHeartbeatHandle) {
      clearInterval(this.lockHeartbeatHandle);
      this.lockHeartbeatHandle = null;
    }
  }

  isImportRunning() {
    return this.isRunning || isLockActive();
  }

  async recoverStaleRunningScans() {
    const runs = await this.repository.listScanRuns(50);
    const now = Date.now();
    const staleRuns = runs.filter(run =>
      run.status === TENDER_SCAN_RUN_STATUSES.RUNNING &&
      run.startedAt &&
      Number.isFinite(new Date(run.startedAt).getTime()) &&
      (now - new Date(run.startedAt).getTime()) > IMPORT_RUN_RECOVERY_AFTER_MS
    );

    for (const run of staleRuns) {
      await this.repository.saveScanRun({
        ...run,
        status: TENDER_SCAN_RUN_STATUSES.FAILED,
        finishedAt: new Date().toISOString(),
        errorSummary: (run.errorSummary || '').trim() || 'Import wurde nach Ablauf als haengend markiert und beendet.'
      });
    }
  }

  async runInitialImport() {
    const to = latestAllowedPublicationDay();
    const from = addDays(to, -Math.max(1, TENDER_RADAR_CONFIG.initialImportDays) + 1);
    return this.runImportRange({ from, to, trigger: 'manual-initial' });
  }

  async runCatchUpImport() {
    const lastRun = await this.repository.getLastSuccessfulRun();
    if (!lastRun?.requestedTo) return this.runInitialImport();

    const start = addDays(lastRun.requestedTo, 1);
    const end = latestAllowedPublicationDay();
    if (!start || start > end) {
      return { skipped: true, reason: 'Kein Nachholbedarf' };
    }

    let from = start;
    let to = end;
    let warning = '';
    const backlogDays = daysBetween(start, end) + 1;
    if (backlogDays > TENDER_RADAR_CONFIG.maxBackfillDaysPerRun) {
      to = addDays(from, TENDER_RADAR_CONFIG.maxBackfillDaysPerRun - 1);
      warning = `Nachholzeitraum auf ${TENDER_RADAR_CONFIG.maxBackfillDaysPerRun} Tage begrenzt. Vollimport ggf. manuell starten.`;
    }

    const result = await this.runImportRange({ from, to, trigger: 'auto-catchup' });
    result.warning = warning;
    return result;
  }

  async runAutoSyncIfDue() {
    await this.recoverStaleRunningScans();
    const lastSync = storageGet(STORAGE_TENDER_LAST_SYNC_AT) || '';
    const dueMs = TENDER_RADAR_CONFIG.autoSyncIntervalHours * 60 * 60 * 1000;
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      if (elapsed < dueMs) {
        return { skipped: true, reason: 'Sync-Intervall noch nicht erreicht' };
      }
    }
    return this.runCatchUpImport();
  }

  async runImportRange({ from, to, trigger = 'manual' } = {}) {
    await this.recoverStaleRunningScans();
    if (this.isImportRunning()) {
      return { skipped: true, reason: 'Import laeuft bereits' };
    }

    const normalizedFrom = dateOnly(from);
    const normalizedTo = dateOnly(to);
    if (!normalizedFrom || !normalizedTo || normalizedFrom > normalizedTo) {
      throw new Error('Ungueltiger Importzeitraum');
    }

    this.isRunning = true;
    lockNow();
    this.startLockHeartbeat();

    const scanRun = await this.repository.saveScanRun({
      source: TENDER_SOURCES.germanPublicProcurement,
      status: TENDER_SCAN_RUN_STATUSES.RUNNING,
      startedAt: new Date().toISOString(),
      requestedFrom: normalizedFrom,
      requestedTo: normalizedTo,
      errorSummary: ''
    });

    const counters = {
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      failedCount: 0,
      newMatchCount: 0,
      changedMatchCount: 0
    };

    const errorLines = [];
    let finishedByWatchdog = false;
    const watchdogStartedAt = Date.now();
    const watchdogHandle = setTimeout(() => {
      finishedByWatchdog = true;
      this.isRunning = false;
      this.stopLockHeartbeat();
      clearLock();

      void this.repository.saveScanRun({
        ...scanRun,
        ...counters,
        trigger,
        status: TENDER_SCAN_RUN_STATUSES.FAILED,
        finishedAt: new Date().toISOString(),
        errorSummary: `Import wurde nach ${Math.round((Date.now() - watchdogStartedAt) / 1000)}s Watchdog-Zeit beendet.`
      }).catch(() => {
        // Best effort watchdog cleanup.
      });
    }, IMPORT_RUN_WATCHDOG_MS);

    try {
      const fetchResult = await withTimeout(
        this.source.fetchNoticesByPublicationRange(normalizedFrom, normalizedTo),
        IMPORT_RUN_TIMEOUT_MS,
        'Importlauf wurde wegen Zeitlimit abgebrochen'
      );
      counters.fetchedCount = (fetchResult.rawNotices || []).length;

      for (const rawNotice of fetchResult.rawNotices || []) {
        try {
          const normalized = this.source.normalizeNotice(rawNotice);
          const contentHash = tenderContentHash(JSON.stringify(normalized));
          const upsert = await this.repository.upsertNotice({ sourceNotice: normalized, rawNotice, contentHash });

          if (upsert.changeType === 'inserted') counters.insertedCount += 1;
          if (upsert.changeType === 'updated') counters.updatedCount += 1;
          if (upsert.changeType === 'unchanged') counters.unchangedCount += 1;

          const relevance = evaluateTenderNotice(upsert.notice);
          const status = detectExpiredNotice(upsert.notice) ? TENDER_STATUSES.EXPIRED : TENDER_STATUSES.NEW;
          const assignee = resolveAssignee(upsert.notice.federalState);
          const matchPayload = {
            tenderNoticeId: upsert.notice.id,
            score: relevance.score,
            relevanceLevel: relevance.relevanceLevel,
            matchReasons: relevance.matchReasons,
            matchedKeywords: relevance.matchedKeywords,
            matchedCpvCodes: relevance.matchedCpvCodes,
            regionMatched: relevance.regionMatched,
            status,
            assignedUserId: assignee.assignedUserId,
            assignedUserName: assignee.assignedUserName
          };

          const matchUpdate = await this.repository.upsertMatch(matchPayload, { markChanged: upsert.changeType === 'updated' });
          if (matchUpdate.changeType === 'inserted') counters.newMatchCount += 1;
          if (matchUpdate.changeType === 'updated' && upsert.changeType === 'updated') counters.changedMatchCount += 1;

          if (isRelevantLevel(relevance.relevanceLevel) &&
            (relevance.relevanceLevel === TENDER_RELEVANCE_LEVELS.HIGH || relevance.relevanceLevel === TENDER_RELEVANCE_LEVELS.MEDIUM) &&
            matchUpdate.changeType === 'inserted') {
            await this.repository.saveNotification({
              type: 'tender',
              level: relevance.relevanceLevel.toLowerCase(),
              tenderNoticeId: upsert.notice.id,
              tenderMatchId: matchUpdate.match.id,
              title: 'Neue relevante Ausschreibung',
              message: `${upsert.notice.title}\n\nRelevanz: ${relevance.score} %\nFrist: ${upsert.notice.submissionDeadline ? upsert.notice.submissionDeadline.slice(0, 10) : 'k.A.'}\nGebiet: ${upsert.notice.federalState || 'unbekannt'}`
            });
          }
        } catch (noticeError) {
          counters.failedCount += 1;
          errorLines.push(`Notice-Fehler: ${noticeError.message || String(noticeError)}`);
        }
      }

      (fetchResult.failures || []).forEach(failure => {
        counters.failedCount += 1;
        errorLines.push(`${failure.publicationDay || 'Tag unbekannt'}: ${failure.type} ${failure.message}`);
      });

      const status = counters.failedCount > 0 ? TENDER_SCAN_RUN_STATUSES.PARTIAL_SUCCESS : TENDER_SCAN_RUN_STATUSES.SUCCESS;
      const finished = {
        ...scanRun,
        ...counters,
        trigger,
        status,
        finishedAt: new Date().toISOString(),
        errorSummary: errorLines.slice(0, 12).join('\n')
      };
      if (finishedByWatchdog) return finished;
      await withTimeout(this.repository.saveScanRun(finished), 8000, 'Scan-Status konnte nicht gespeichert werden');
      storageSet(STORAGE_TENDER_LAST_SYNC_AT, new Date().toISOString());
      return finished;
    } catch (runError) {
      const failed = {
        ...scanRun,
        ...counters,
        trigger,
        status: TENDER_SCAN_RUN_STATUSES.FAILED,
        finishedAt: new Date().toISOString(),
        errorSummary: runError.message || String(runError)
      };
      if (finishedByWatchdog) return failed;
      await withTimeout(this.repository.saveScanRun(failed), 8000, 'Fehlerstatus konnte nicht gespeichert werden');
      return failed;
    } finally {
      clearTimeout(watchdogHandle);
      this.isRunning = false;
      this.stopLockHeartbeat();
      clearLock();
    }
  }
}

export const tenderScanService = new TenderScanService();
