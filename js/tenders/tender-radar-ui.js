import { tenderRepository } from './repositories/tender-repository.js';
import { tenderScanService } from './services/tender-scan-service.js';
import { TENDER_RADAR_FEATURE_FLAG, TENDER_RELEVANCE_LEVELS, TENDER_STATUSES } from './config.js';

const STORAGE_TENDER_FILTERS = 'abwasser-tender-radar-filters-v01';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function safeDate(value) {
  const d = new Date(value || '');
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = safeDate(value);
  return d ? d.toLocaleDateString('de-DE') : '–';
}

function loadFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_TENDER_FILTERS) || '{}');
    return {
      relevance: raw.relevance || '',
      status: raw.status || '',
      federalState: raw.federalState || '',
      buyer: raw.buyer || '',
      cpv: raw.cpv || '',
      fulltext: raw.fulltext || '',
      unreadOnly: Boolean(raw.unreadOnly),
      assignedToMeOnly: Boolean(raw.assignedToMeOnly)
    };
  } catch {
    return {
      relevance: '', status: '', federalState: '', buyer: '', cpv: '', fulltext: '', unreadOnly: false, assignedToMeOnly: false
    };
  }
}

function saveFilters(filters) {
  localStorage.setItem(STORAGE_TENDER_FILTERS, JSON.stringify(filters));
}

function relevanceBadge(level) {
  if (level === TENDER_RELEVANCE_LEVELS.HIGH) return 'red';
  if (level === TENDER_RELEVANCE_LEVELS.MEDIUM) return 'yellow';
  if (level === TENDER_RELEVANCE_LEVELS.LOW) return 'blue';
  return 'gray';
}

function normalizeStatus(status) {
  return Object.values(TENDER_STATUSES).includes(status) ? status : TENDER_STATUSES.NEW;
}

function statusLabel(status) {
  return {
    NEW: 'Neu',
    IN_REVIEW: 'In Pruefung',
    INTERESTING: 'Interessant',
    NOT_RELEVANT: 'Nicht relevant',
    OFFER_PLANNED: 'Angebot geplant',
    DECLINED: 'Abgelehnt',
    EXPIRED: 'Abgelaufen'
  }[status] || status;
}

function applyFilters(records, filters, currentUserName = '') {
  return records.filter(item => {
    const notice = item.notice;
    const match = item.match;
    if (filters.relevance && match.relevanceLevel !== filters.relevance) return false;
    if (filters.status && match.status !== filters.status) return false;
    if (filters.federalState && !String(notice.federalState || '').toLowerCase().includes(filters.federalState.toLowerCase())) return false;
    if (filters.buyer && !String(notice.buyerName || '').toLowerCase().includes(filters.buyer.toLowerCase())) return false;
    if (filters.cpv) {
      const cpvList = [notice.mainCpvCode, ...(notice.additionalCpvCodes || [])].join(' ');
      if (!cpvList.toLowerCase().includes(filters.cpv.toLowerCase())) return false;
    }
    if (filters.unreadOnly && match.isRead) return false;
    if (filters.assignedToMeOnly) {
      const assigned = String(match.assignedUserName || '').toLowerCase();
      if (!currentUserName || assigned !== currentUserName.toLowerCase()) return false;
    }
    if (filters.fulltext) {
      const haystack = [notice.title, notice.description, notice.buyerName, ...(match.matchReasons || [])].join(' ').toLowerCase();
      if (!haystack.includes(filters.fulltext.toLowerCase())) return false;
    }
    return true;
  });
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const unread = Number(a.match.isRead) - Number(b.match.isRead);
    if (unread !== 0) return unread;
    const byScore = (b.match.score || 0) - (a.match.score || 0);
    if (byScore !== 0) return byScore;
    const aDeadline = safeDate(a.notice.submissionDeadline)?.getTime() || Number.POSITIVE_INFINITY;
    const bDeadline = safeDate(b.notice.submissionDeadline)?.getTime() || Number.POSITIVE_INFINITY;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    const aPublished = safeDate(a.notice.publishedAt)?.getTime() || 0;
    const bPublished = safeDate(b.notice.publishedAt)?.getTime() || 0;
    return bPublished - aPublished;
  });
}

function cardActions(matchId, originalUrl) {
  return `<div class="tender-actions">
    <button type="button" data-tender-mark-read="${esc(matchId)}">Als gelesen markieren</button>
    <button type="button" data-tender-status="IN_REVIEW" data-tender-id="${esc(matchId)}">In Pruefung</button>
    <button type="button" data-tender-status="INTERESTING" data-tender-id="${esc(matchId)}">Interessant</button>
    <button type="button" data-tender-status="NOT_RELEVANT" data-tender-id="${esc(matchId)}">Nicht relevant</button>
    <button type="button" data-tender-status="OFFER_PLANNED" data-tender-id="${esc(matchId)}">Angebot geplant</button>
    <button type="button" data-tender-status="DECLINED" data-tender-id="${esc(matchId)}">Ablehnen</button>
    <button type="button" data-tender-detail="${esc(matchId)}">Details</button>
    <a href="${esc(originalUrl)}" target="_blank" rel="noopener">Original oeffnen</a>
  </div>`;
}

function detailBlock(row) {
  const notice = row.notice;
  const match = row.match;
  return `<div class="tender-detail" data-tender-detail-panel="${esc(match.id)}" hidden>
    <p><strong>Volltitel:</strong> ${esc(notice.title || '–')}</p>
    <p><strong>Beschreibung:</strong> ${esc(notice.description || '–')}</p>
    <p><strong>Auftraggeber:</strong> ${esc(notice.buyerName || '–')}</p>
    <p><strong>Verfahren:</strong> ${esc(notice.procedureType || '–')}</p>
    <p><strong>CPV:</strong> ${esc([notice.mainCpvCode, ...(notice.additionalCpvCodes || [])].filter(Boolean).join(', ') || '–')}</p>
    <p><strong>NUTS:</strong> ${esc((notice.nutsCodes || []).join(', ') || '–')}</p>
    <p><strong>Erfuellungsort:</strong> ${esc([notice.postalCode, notice.city, notice.federalState].filter(Boolean).join(' ') || 'unbekannt')}</p>
    <p><strong>Fristen:</strong> Veroeffentlicht ${formatDate(notice.publishedAt)}, Abgabefrist ${formatDate(notice.submissionDeadline)}</p>
    <p><strong>Geschaetzter Wert:</strong> ${esc(notice.estimatedValue || '–')} ${esc(notice.estimatedValueCurrency || '')}</p>
    <p><strong>Relevanz:</strong> ${match.score}% (${esc(match.relevanceLevel)})</p>
    <p><strong>Gruende:</strong> ${esc((match.matchReasons || []).join(' | ') || '–')}</p>
    <p><strong>Versionshinweis:</strong> ${match.isNewVersion ? 'Aktualisiert seit letzter Sichtung' : 'Keine neue Version markiert'}</p>
    <p><strong>Status intern:</strong> ${esc(statusLabel(match.status))}</p>
  </div>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return '<div class="empty-panel"><h2>Keine Treffer</h2><p>Filter anpassen oder synchronisieren.</p></div>';
  }
  return `<div class="tender-list">${rows.map(row => {
    const notice = row.notice;
    const match = row.match;
    const cpvLabel = [notice.mainCpvCode, ...(notice.additionalCpvCodes || [])].filter(Boolean).slice(0, 4).join(', ');
    return `<article class="record-card tender-card ${match.isRead ? 'read' : 'unread'}">
      <div class="tender-head">
        <span class="status-chip ${relevanceBadge(match.relevanceLevel)}">${esc(match.relevanceLevel)} ${match.score}%</span>
        <span class="status-chip ${match.isRead ? 'gray' : 'blue'}">${match.isRead ? 'Gelesen' : 'Ungelesen'}</span>
        <span class="status-chip gray">${esc(statusLabel(match.status))}</span>
      </div>
      <h2>${esc(notice.title || 'Ohne Titel')}</h2>
      <p>${esc(notice.buyerName || 'Unbekannter Auftraggeber')} · ${esc([notice.city, notice.federalState].filter(Boolean).join(', ') || 'Ort unbekannt')}</p>
      <p>Veroeffentlicht: ${formatDate(notice.publishedAt)} · Frist: ${formatDate(notice.submissionDeadline)} · Quelle: ${esc(notice.source)}</p>
      <p><strong>CPV:</strong> ${esc(cpvLabel || '–')}</p>
      <p><strong>Treffergruende:</strong> ${esc((match.matchReasons || []).slice(0, 3).join(' | ') || '–')}</p>
      ${cardActions(match.id, notice.originalUrl)}
      ${detailBlock(row)}
    </article>`;
  }).join('')}</div>`;
}

function renderFilters(filters) {
  return `<section class="document-filter-row tender-filter-row">
    <label>Relevanz
      <select id="tenderFilterRelevance">
        <option value="">Alle</option>
        <option value="HIGH" ${filters.relevance === 'HIGH' ? 'selected' : ''}>HIGH</option>
        <option value="MEDIUM" ${filters.relevance === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
        <option value="LOW" ${filters.relevance === 'LOW' ? 'selected' : ''}>LOW</option>
        <option value="IRRELEVANT" ${filters.relevance === 'IRRELEVANT' ? 'selected' : ''}>IRRELEVANT</option>
      </select>
    </label>
    <label>Status
      <select id="tenderFilterStatus">
        <option value="">Alle</option>
        ${Object.values(TENDER_STATUSES).map(status => `<option value="${status}" ${filters.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}
      </select>
    </label>
    <label>Bundesland<input id="tenderFilterState" type="search" value="${esc(filters.federalState)}" placeholder="z. B. Brandenburg"></label>
    <label>Auftraggeber<input id="tenderFilterBuyer" type="search" value="${esc(filters.buyer)}"></label>
    <label>CPV<input id="tenderFilterCpv" type="search" value="${esc(filters.cpv)}" placeholder="45252130"></label>
    <label class="document-search">Volltext<input id="tenderFilterFulltext" type="search" value="${esc(filters.fulltext)}"></label>
    <label><input id="tenderFilterUnreadOnly" type="checkbox" ${filters.unreadOnly ? 'checked' : ''}> nur ungelesen</label>
    <label><input id="tenderFilterAssignedOnly" type="checkbox" ${filters.assignedToMeOnly ? 'checked' : ''}> nur mir zugewiesen</label>
  </section>`;
}

async function renderImportStats() {
  const runs = await tenderRepository.listScanRuns(1);
  const last = runs[0] || null;
  if (!last) {
    return '<div class="info-box">Noch kein Importlauf vorhanden.</div>';
  }
  return `<div class="tender-sync-meta">
    <article><span>Letzter Abruf</span><strong>${formatDate(last.finishedAt || last.startedAt)}</strong></article>
    <article><span>Status</span><strong>${esc(last.status)}</strong></article>
    <article><span>Importiert</span><strong>${last.fetchedCount}</strong></article>
    <article><span>Neu</span><strong>${last.insertedCount}</strong></article>
    <article><span>Aktualisiert</span><strong>${last.updatedCount}</strong></article>
    <article><span>Fehler</span><strong>${last.failedCount}</strong></article>
  </div>`;
}

async function loadRows() {
  const notices = await tenderRepository.listNotices();
  const matches = await tenderRepository.listMatches();
  return matches.map(match => ({ match, notice: notices.find(item => item.id === match.tenderNoticeId) || {} }));
}

export async function getTenderUnreadCount() {
  if (!TENDER_RADAR_FEATURE_FLAG) return 0;
  return tenderRepository.unreadRelevantCount();
}

export async function renderTenderRadarPage(host, { globalPageHeader = null, currentUserName = '' } = {}) {
  if (!TENDER_RADAR_FEATURE_FLAG) {
    host.innerHTML = '<div class="empty-panel"><h2>Ausschreibungsradar deaktiviert</h2></div>';
    return;
  }

  const filters = loadFilters();
  const rows = sortRecords(applyFilters(await loadRows(), filters, currentUserName));
  const unread = await tenderRepository.unreadRelevantCount();
  const stats = await renderImportStats();

  host.innerHTML = `${typeof globalPageHeader === 'function' ? globalPageHeader('Beschaffung', 'Ausschreibungsradar', 'Relevante Bekanntmachungen erkennen, bewerten und verfolgen.') : ''}
    <section class="document-toolbar tender-sync-toolbar">
      <button class="button primary" id="tenderSyncNow" type="button" ${tenderScanService.isImportRunning() ? 'disabled' : ''}>Jetzt synchronisieren</button>
      <span class="status-chip ${unread ? 'red' : 'gray'}">${unread} ungelesen</span>
      <span class="status-chip blue">Import-Intervall: 2h</span>
    </section>
    ${stats}
    ${renderFilters(filters)}
    <section id="tenderRadarList">${renderRows(rows)}</section>`;

  const collectFilters = () => ({
    relevance: host.querySelector('#tenderFilterRelevance')?.value || '',
    status: host.querySelector('#tenderFilterStatus')?.value || '',
    federalState: host.querySelector('#tenderFilterState')?.value || '',
    buyer: host.querySelector('#tenderFilterBuyer')?.value || '',
    cpv: host.querySelector('#tenderFilterCpv')?.value || '',
    fulltext: host.querySelector('#tenderFilterFulltext')?.value || '',
    unreadOnly: Boolean(host.querySelector('#tenderFilterUnreadOnly')?.checked),
    assignedToMeOnly: Boolean(host.querySelector('#tenderFilterAssignedOnly')?.checked)
  });

  saveFilters(collectFilters());

  ['#tenderFilterRelevance','#tenderFilterStatus','#tenderFilterState','#tenderFilterBuyer','#tenderFilterCpv','#tenderFilterFulltext','#tenderFilterUnreadOnly','#tenderFilterAssignedOnly']
    .forEach(selector => {
      const el = host.querySelector(selector);
      if (!el) return;
      const event = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(event, () => {
        saveFilters(collectFilters());
        renderTenderRadarPage(host, { globalPageHeader, currentUserName });
      });
    });

  host.querySelector('#tenderSyncNow')?.addEventListener('click', async () => {
    if (tenderScanService.isImportRunning()) return;
    const button = host.querySelector('#tenderSyncNow');
    if (button) {
      button.disabled = true;
      button.textContent = 'Synchronisiere...';
    }
    await tenderScanService.runCatchUpImport();
    await renderTenderRadarPage(host, { globalPageHeader, currentUserName });
  });

  host.querySelectorAll('[data-tender-mark-read]').forEach(button => {
    button.addEventListener('click', async () => {
      await tenderRepository.updateMatchStatus(button.dataset.tenderMarkRead, { isRead: true, status: normalizeStatus(TENDER_STATUSES.IN_REVIEW), userName: currentUserName });
      await renderTenderRadarPage(host, { globalPageHeader, currentUserName });
    });
  });

  host.querySelectorAll('[data-tender-status]').forEach(button => {
    button.addEventListener('click', async () => {
      await tenderRepository.updateMatchStatus(button.dataset.tenderId, { status: normalizeStatus(button.dataset.tenderStatus), isRead: true, userName: currentUserName });
      await renderTenderRadarPage(host, { globalPageHeader, currentUserName });
    });
  });

  host.querySelectorAll('[data-tender-detail]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = host.querySelector(`[data-tender-detail-panel="${button.dataset.tenderDetail}"]`);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      button.textContent = panel.hidden ? 'Details' : 'Details ausblenden';
    });
  });
}
