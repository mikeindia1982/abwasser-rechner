import { TENDER_RADAR_CONFIG, TENDER_RELEVANCE_LEVELS, TENDER_RULES } from '../config.js';

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function containsTerm(text, term) {
  if (!text || !term) return false;
  const t = normalizeText(term);
  if (!t) return false;
  return text.includes(t);
}

function cpvMatchScore(notice, rules) {
  const cpvs = unique([notice.mainCpvCode, ...asArray(notice.additionalCpvCodes)].map(x => String(x || '').trim()));
  let score = 0;
  const matched = [];

  cpvs.forEach(code => {
    if (!code) return;
    if (rules.cpv.exact.includes(code)) {
      score = Math.max(score, 30);
      matched.push(code);
      return;
    }
    if (rules.cpv.broadPrefixes.some(prefix => code.startsWith(prefix))) {
      score = Math.max(score, 12);
      matched.push(code);
    }
  });

  return { score: Math.min(score, TENDER_RADAR_CONFIG.scoreWeights.cpvMax), matchedCodes: unique(matched) };
}

function weightedKeywordScore(text, keywords, maxScore, step) {
  const matched = keywords.filter(keyword => containsTerm(text, keyword));
  const score = Math.min(maxScore, matched.length * step);
  return { score, matched };
}

function regionDetection(notice) {
  const preferred = TENDER_RADAR_CONFIG.regions.preferredFederalStates.map(normalizeText);
  const state = normalizeText(notice.federalState || '');
  const city = normalizeText(notice.city || '');
  const nuts = asArray(notice.nutsCodes).map(x => String(x || '').toUpperCase());

  const stateMatch = preferred.includes(state);
  const cityHint = ['berlin', 'potsdam', 'rostock', 'schwerin', 'cottbus', 'frankfurt oder', 'oranienburg'].some(keyword => city.includes(keyword));
  const nutsMatch = nuts.some(code => TENDER_RADAR_CONFIG.regions.preferredNutsPrefixes.some(prefix => code.startsWith(prefix)));

  if (stateMatch || cityHint || nutsMatch) {
    return { matched: true, score: 10, reason: 'Zielregion erkannt' };
  }

  if (!state && !city && !nuts.length) {
    return { matched: null, score: 0, reason: 'Ausfuehrungsort unbekannt' };
  }

  return { matched: false, score: 0, reason: 'Nicht in Zielregion' };
}

function relevanceFromScore(score, thresholds = TENDER_RADAR_CONFIG.scoreThresholds) {
  if (score >= thresholds.high) return TENDER_RELEVANCE_LEVELS.HIGH;
  if (score >= thresholds.medium) return TENDER_RELEVANCE_LEVELS.MEDIUM;
  if (score >= thresholds.low) return TENDER_RELEVANCE_LEVELS.LOW;
  return TENDER_RELEVANCE_LEVELS.IRRELEVANT;
}

export function evaluateTenderNotice(notice, { rules = TENDER_RULES } = {}) {
  const title = normalizeText(notice.title || '');
  const description = normalizeText(notice.description || '');
  const buyer = normalizeText(notice.buyerName || '');

  const cpv = cpvMatchScore(notice, rules);
  const titleMatch = weightedKeywordScore(title, rules.positiveKeywords, TENDER_RADAR_CONFIG.scoreWeights.titleMax, 8);
  const descriptionMatch = weightedKeywordScore(description, rules.positiveKeywords, TENDER_RADAR_CONFIG.scoreWeights.descriptionMax, 4);
  const buyerMatch = weightedKeywordScore(buyer, rules.buyerKeywords, TENDER_RADAR_CONFIG.scoreWeights.buyerMax, 5);
  const negatives = weightedKeywordScore(`${title} ${description}`, rules.negativeKeywords, Math.abs(TENDER_RADAR_CONFIG.scoreWeights.negativeMax), 10);
  const region = regionDetection(notice);

  let score = cpv.score + titleMatch.score + descriptionMatch.score + buyerMatch.score + region.score - negatives.score;

  // Dampening for overly generic single hit without CPV support.
  const totalPositiveTerms = unique([...titleMatch.matched, ...descriptionMatch.matched]).length;
  if (cpv.score < 12 && totalPositiveTerms <= 1) {
    score = Math.min(score, 35);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const matchReasons = [];
  if (cpv.matchedCodes.length) matchReasons.push(`CPV Treffer: ${cpv.matchedCodes.join(', ')}`);
  if (titleMatch.matched.length) matchReasons.push(`Titelbezug: ${titleMatch.matched.slice(0, 6).join(', ')}`);
  if (descriptionMatch.matched.length) matchReasons.push(`Beschreibung: ${descriptionMatch.matched.slice(0, 6).join(', ')}`);
  if (buyerMatch.matched.length) matchReasons.push(`Auftraggeber: ${buyerMatch.matched.slice(0, 4).join(', ')}`);
  matchReasons.push(region.reason);
  if (negatives.matched.length) matchReasons.push(`Abschwaechung: ${negatives.matched.slice(0, 4).join(', ')}`);

  return {
    score,
    relevanceLevel: relevanceFromScore(score),
    matchReasons,
    matchedKeywords: unique([...titleMatch.matched, ...descriptionMatch.matched]),
    matchedCpvCodes: cpv.matchedCodes,
    regionMatched: region.matched
  };
}

export function detectExpiredNotice(notice) {
  const deadline = new Date(notice.submissionDeadline || '');
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}
