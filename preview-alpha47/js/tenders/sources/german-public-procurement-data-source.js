import { TenderDataSource } from './tender-data-source.js';
import { TENDER_RADAR_CONFIG, TENDER_SOURCES } from '../config.js';

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickFirst(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') continue;
    return normalized;
  }
  return '';
}

function findAllByKey(obj, key, output = []) {
  if (!obj || typeof obj !== 'object') return output;
  if (Array.isArray(obj)) {
    obj.forEach(item => findAllByKey(item, key, output));
    return output;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === key.toLowerCase()) output.push(v);
    findAllByKey(v, key, output);
  }
  return output;
}

function toIsoDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function toDateOnly(value) {
  const iso = toIsoDate(value);
  return iso ? iso.slice(0, 10) : '';
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function extractCpvCodes(rawNotice) {
  const all = [
    ...findAllByKey(rawNotice, 'cpv'),
    ...findAllByKey(rawNotice, 'cpvCode'),
    ...findAllByKey(rawNotice, 'mainCpv'),
    ...findAllByKey(rawNotice, 'mainCpvCode'),
    ...findAllByKey(rawNotice, 'additionalCpv'),
    ...findAllByKey(rawNotice, 'classification')
  ];
  const flattened = [];
  all.forEach(entry => {
    if (Array.isArray(entry)) {
      entry.forEach(item => flattened.push(item));
      return;
    }
    flattened.push(entry);
  });
  const extracted = flattened.flatMap(item => {
    if (!item) return [];
    if (typeof item === 'string' || typeof item === 'number') return [String(item)];
    if (typeof item === 'object') {
      return [
        item.code,
        item.cpv,
        item.cpvCode,
        item.mainCode,
        item.value,
        item.id
      ].filter(Boolean).map(String);
    }
    return [];
  });
  const normalized = [...new Set(extracted.map(x => normalizeCode(x).replace(/[^0-9]/g, '')).filter(Boolean))];
  return normalized;
}

function extractNutsCodes(rawNotice) {
  const values = [
    ...findAllByKey(rawNotice, 'nuts'),
    ...findAllByKey(rawNotice, 'nutsCode'),
    ...findAllByKey(rawNotice, 'nutsCodes')
  ];
  const list = [];
  values.forEach(v => {
    if (Array.isArray(v)) {
      v.forEach(item => list.push(item));
    } else {
      list.push(v);
    }
  });
  const extracted = list.flatMap(item => {
    if (!item) return [];
    if (typeof item === 'string') return [item];
    if (typeof item === 'object') return [item.code, item.value, item.nutsCode].filter(Boolean);
    return [];
  });
  return [...new Set(extracted.map(x => normalizeCode(x)).filter(Boolean))];
}

function classifyError(error) {
  if (!error) return { type: 'UNKNOWN', message: 'Unbekannter Fehler' };
  const message = String(error.message || error);
  if (/cors|access-control-allow-origin|failed to fetch|err_failed/i.test(message)) return { type: 'CORS', message };
  if (/timeout|aborted|timed out/i.test(message)) return { type: 'NETWORK', message };
  if (/parse|json/i.test(message)) return { type: 'PARSING', message };
  if (/http|status|api/i.test(message)) return { type: 'API', message };
  return { type: 'UNKNOWN', message };
}

function isLikelyCorsError(error) {
  const message = String(error?.message || error || '');
  return /cors|access-control-allow-origin|failed to fetch|err_failed/i.test(message);
}

function isBrowserRuntime() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function parseJsonBodyOrThrow(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(trimmed.slice(0, 220));
  }
  return JSON.parse(trimmed);
}

function requestHeaders(userAgent) {
  const headers = { Accept: 'application/json' };
  if (!isBrowserRuntime() && userAgent) {
    headers['User-Agent'] = userAgent;
  }
  return headers;
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, message = 'Timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
  ]);
}

export class GermanPublicProcurementDataSource extends TenderDataSource {
  constructor({
    fetchImpl = globalThis.fetch,
    sourceConfig = TENDER_RADAR_CONFIG.source,
    httpConfig = TENDER_RADAR_CONFIG.http
  } = {}) {
    super();
    this.fetchImpl = fetchImpl;
    this.sourceConfig = sourceConfig;
    this.httpConfig = httpConfig;
    this.name = TENDER_SOURCES.germanPublicProcurement;
  }

  buildOriginalNoticeUrl(notice) {
    const sourceUrl = pickFirst(notice.originalUrl, notice.url, notice.noticeUrl);
    if (sourceUrl) return String(sourceUrl);
    const publicationNumber = pickFirst(notice.publicationNumber, notice.publicationId);
    if (publicationNumber) {
      return `https://oeffentlichevergabe.de/ui/de/suche?suchbegriff=${encodeURIComponent(publicationNumber)}`;
    }
    return 'https://oeffentlichevergabe.de/ui/de/suche';
  }

  async healthCheck() {
    const day = toDateOnly(new Date());
    const result = await this.fetchNoticesByPublicationDay(day);
    return {
      ok: true,
      fetchedCount: Array.isArray(result.rawNotices) ? result.rawNotices.length : 0,
      source: this.name,
      checkedAt: new Date().toISOString()
    };
  }

  async fetchNoticesByPublicationDay(date) {
    const day = toDateOnly(date);
    if (!day) throw new Error('Ungueltiges Datum fuer fetchNoticesByPublicationDay');
    return this.#fetchNoticeExports({ publicationDay: day });
  }

  async fetchNoticesByPublicationRange(from, to) {
    const start = new Date(`${toDateOnly(from)}T00:00:00Z`);
    const end = new Date(`${toDateOnly(to)}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new Error('Ungueltiger Zeitraum fuer fetchNoticesByPublicationRange');
    }

    const notices = [];
    const failures = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const day = d.toISOString().slice(0, 10);
      try {
        const res = await withTimeout(
          this.fetchNoticesByPublicationDay(day),
          Math.max(8000, (this.httpConfig?.timeoutMs || 15000) + 2000),
          `Day fetch timeout (${day})`
        );
        notices.push(...res.rawNotices);
      } catch (error) {
        failures.push({ publicationDay: day, ...classifyError(error) });
      }
    }

    return {
      source: this.name,
      rawNotices: notices,
      failures
    };
  }

  normalizeNotice(rawNotice = {}) {
    const partialReasons = [];
    const title = stripHtml(pickFirst(rawNotice.title, rawNotice.noticeTitle, rawNotice['BT-21-notice']));
    const description = stripHtml(pickFirst(rawNotice.description, rawNotice.summary, rawNotice.noticeDescription, rawNotice['BT-24-notice']));

    if (!title) partialReasons.push('Titel fehlt');

    const cpvCodes = extractCpvCodes(rawNotice);
    const nutsCodes = extractNutsCodes(rawNotice);
    const location = pickFirst(rawNotice.city, rawNotice.town, rawNotice.place, rawNotice.address?.city, rawNotice.buyer?.address?.city);
    const federalState = pickFirst(rawNotice.federalState, rawNotice.state, rawNotice.address?.state, rawNotice.buyer?.address?.state);

    const publishedAt = toIsoDate(pickFirst(
      rawNotice.publishedAt,
      rawNotice.publicationDate,
      rawNotice.publicationDay,
      rawNotice.published
    ));
    if (!publishedAt) partialReasons.push('Veroeffentlichungsdatum fehlt/ungueltig');

    const submissionDeadline = toIsoDate(pickFirst(
      rawNotice.submissionDeadline,
      rawNotice.deadline,
      rawNotice.tenderDeadline,
      rawNotice.receiptDeadline
    ));

    const notice = {
      source: this.name,
      sourceNoticeId: String(pickFirst(rawNotice.noticeId, rawNotice.id, rawNotice.identifier, rawNotice['BT-701-notice']) || '').trim(),
      sourceVersionId: String(pickFirst(rawNotice.versionId, rawNotice.noticeVersionId, rawNotice['BT-757-notice']) || '').trim(),
      publicationNumber: String(pickFirst(rawNotice.publicationNumber, rawNotice.noticeNumber, rawNotice['BT-05-notice']) || '').trim(),
      title,
      description,
      noticeType: String(pickFirst(rawNotice.noticeType, rawNotice.type, rawNotice.formType) || '').trim(),
      procedureType: String(pickFirst(rawNotice.procedureType, rawNotice.procedure, rawNotice.procedureCode) || '').trim(),
      contractNature: String(pickFirst(rawNotice.contractNature, rawNotice.contractType, rawNotice.nature) || '').trim(),
      buyerName: String(pickFirst(rawNotice.buyerName, rawNotice.contractingAuthority, rawNotice.buyer?.name) || '').trim(),
      buyerType: String(pickFirst(rawNotice.buyerType, rawNotice.authorityType) || '').trim(),
      buyerIdentifier: String(pickFirst(rawNotice.buyerIdentifier, rawNotice.buyerId, rawNotice.buyer?.id) || '').trim(),
      mainCpvCode: cpvCodes[0] || '',
      additionalCpvCodes: cpvCodes.slice(1),
      nutsCodes,
      countryCode: String(pickFirst(rawNotice.countryCode, rawNotice.country, 'DE') || '').trim(),
      federalState: String(federalState || '').trim(),
      city: String(location || '').trim(),
      postalCode: String(pickFirst(rawNotice.postalCode, rawNotice.address?.postalCode, rawNotice.buyer?.address?.postalCode) || '').trim(),
      publishedAt,
      submissionDeadline,
      estimatedValue: String(pickFirst(rawNotice.estimatedValue, rawNotice.value?.amount, rawNotice.contractValue?.amount) || '').trim(),
      estimatedValueCurrency: String(pickFirst(rawNotice.estimatedValueCurrency, rawNotice.value?.currency, rawNotice.contractValue?.currency, 'EUR') || '').trim(),
      originalUrl: this.buildOriginalNoticeUrl(rawNotice),
      partialReasons
    };

    if (!notice.sourceNoticeId) partialReasons.push('sourceNoticeId fehlt');

    return notice;
  }

  async #fetchNoticeExports(params = {}) {
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('fetch API nicht verfuegbar');
    }

    const { timeoutMs, maxRetries, baseBackoffMs, userAgent } = this.httpConfig;
    const query = new URLSearchParams();

    // Support multiple API variants for publication day / month from official notice-exports family.
    if (params.publicationDay) query.set('pubDay', params.publicationDay);
    if (params.publicationMonth) query.set('pubMonth', params.publicationMonth);

    const endpoint = `${this.sourceConfig.baseUrl}${this.sourceConfig.noticeExportPath}?${query.toString()}`;
    const proxyTemplate = String(this.sourceConfig?.corsProxy?.template || '').trim();
    const proxyEnabled = Boolean(this.sourceConfig?.corsProxy?.enabled && proxyTemplate);
    const proxyEndpoint = proxyEnabled ? proxyTemplate.replace('{url}', encodeURIComponent(endpoint)) : '';

    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(this.fetchImpl, endpoint, {
          headers: requestHeaders(userAgent)
        }, timeoutMs);

        if (!response.ok) {
          throw new Error(`API HTTP Status ${response.status}`);
        }

        const text = await response.text();
        const data = parseJsonBodyOrThrow(text);
        const rawNotices = safeArray(data?.notices || data?.items || data?.content || data);
        return {
          source: this.name,
          endpoint,
          rawNotices,
          failures: []
        };
      } catch (error) {
        lastError = error;
        const msg = String(error?.message || error || '');
        if (isLikelyCorsError(error) || /exceeds the allowed range|neither 'pubmonth' nor 'pubday' is present|not found/i.test(msg)) {
          break;
        }
        if (attempt >= maxRetries) break;
        const pause = baseBackoffMs * Math.pow(2, attempt - 1);
        await delay(pause);
      }
    }

    // Browser fallback via CORS proxy, used when direct endpoint is blocked by CORS.
    if (proxyEndpoint && isLikelyCorsError(lastError)) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetchWithTimeout(this.fetchImpl, proxyEndpoint, {
            headers: requestHeaders('')
          }, timeoutMs);

          if (!response.ok) {
            throw new Error(`Proxy HTTP Status ${response.status}`);
          }

          const text = await response.text();
          const data = parseJsonBodyOrThrow(text);
          const rawNotices = safeArray(data?.notices || data?.items || data?.content || data);
          return {
            source: this.name,
            endpoint: proxyEndpoint,
            rawNotices,
            failures: []
          };
        } catch (error) {
          lastError = error;
          const msg = String(error?.message || error || '');
          if (isLikelyCorsError(error) || /exceeds the allowed range|neither 'pubmonth' nor 'pubday' is present|not found/i.test(msg)) {
            break;
          }
          if (attempt >= maxRetries) break;
          const pause = baseBackoffMs * Math.pow(2, attempt - 1);
          await delay(pause);
        }
      }
    }

    const classified = classifyError(lastError);
    const err = new Error(classified.message);
    err.type = classified.type;
    throw err;
  }
}

export function tenderContentHash(value) {
  const input = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
