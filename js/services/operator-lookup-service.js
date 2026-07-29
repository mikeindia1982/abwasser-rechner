import { operatorRepository } from '../repositories/operator-repository.js';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_TIMEOUT = 15000;

function parseCoordinate(value) {
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatCoordinates(latitude, longitude) {
  const lat = parseCoordinate(latitude);
  const lon = parseCoordinate(longitude);
  if (lat === null || lon === null) throw new Error('Ungültige Koordinaten');
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function normalizeLookupStatus(status) {
  if (status === 'AUTO' || status === 'MANUAL' || status === 'NOT_FOUND') return status;
  return 'NOT_FOUND';
}

function normalizeLookupResult(result = {}) {
  return {
    operator: String(result.operator || '').trim(),
    association: String(result.association || '').trim(),
    owner: String(result.owner || '').trim(),
    operatingCompany: String(result.operatingCompany || '').trim(),
    municipality: String(result.municipality || '').trim(),
    district: String(result.district || '').trim(),
    state: String(result.state || '').trim(),
    municipalityKey: String(result.municipalityKey || '').trim(),
    website: String(result.website || '').trim(),
    phone: String(result.phone || '').trim(),
    email: String(result.email || '').trim(),
    lookupSource: String(result.lookupSource || '').trim(),
    lookupDate: String(result.lookupDate || '').trim(),
    lookupStatus: normalizeLookupStatus(result.lookupStatus),
    matches: Array.isArray(result.matches) ? result.matches : []
  };
}

function municipalityKeyFromNominatim(data = {}) {
  const extras = data.extratags || {};
  return String(
    extras['de:amtlicher_gemeindeschluessel'] ||
    extras.ags ||
    extras.gemeindeschluessel ||
    ''
  ).trim();
}

function parseFromNominatim(data = {}) {
  const address = data.address || {};
  const extras = data.extratags || {};
  const operatorName = String(
    extras.operator ||
    extras['operator:name'] ||
    data.name ||
    data.namedetails?.name ||
    ''
  ).trim();

  const municipality = String(
    address.city || address.town || address.village || address.municipality || address.hamlet || ''
  ).trim();

  const district = String(address.county || '').trim();
  const state = String(address.state || '').trim();

  const website = String(extras.website || extras.url || '').trim();
  const phone = String(extras['contact:phone'] || extras.phone || extras.telephone || '').trim();
  const email = String(extras['contact:email'] || extras.email || '').trim();

  const result = normalizeLookupResult({
    operator: operatorName,
    association: String(extras.association || extras['operator:association'] || '').trim(),
    owner: String(extras.owner || '').trim(),
    operatingCompany: String(extras['operator:company'] || '').trim(),
    municipality,
    district,
    state,
    municipalityKey: municipalityKeyFromNominatim(data),
    website,
    phone,
    email,
    lookupSource: 'osm-nominatim',
    lookupDate: new Date().toISOString(),
    lookupStatus: operatorName ? 'AUTO' : 'NOT_FOUND',
    matches: operatorName ? [
      {
        operator: operatorName,
        association: String(extras.association || extras['operator:association'] || '').trim(),
        owner: String(extras.owner || '').trim(),
        operatingCompany: String(extras['operator:company'] || '').trim(),
        municipality,
        district,
        state,
        municipalityKey: municipalityKeyFromNominatim(data),
        website,
        phone,
        email,
        lookupSource: 'osm-nominatim',
        lookupDate: new Date().toISOString(),
        lookupStatus: 'AUTO'
      }
    ] : []
  });

  return result;
}

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Die Betreiber-Suche hat zu lange gedauert.')), ms);
  });
}

function mapCachedEntry(entry) {
  if (!entry) return null;
  const mapped = normalizeLookupResult({
    operator: entry.operator?.name || entry.operator,
    association: entry.association,
    owner: entry.owner,
    operatingCompany: entry.operatingCompany,
    municipality: entry.municipality,
    district: entry.district,
    state: entry.state,
    municipalityKey: entry.municipalityKey,
    website: entry.operator?.website || entry.website,
    phone: entry.operator?.phone || entry.phone,
    email: entry.operator?.email || entry.email,
    lookupSource: entry.provider || entry.lookupSource || 'cache',
    lookupDate: entry.checkedAt || entry.lookupDate || '',
    lookupStatus: entry.status === 'found' ? 'AUTO' : entry.lookupStatus || 'NOT_FOUND',
    matches: entry.matches || []
  });
  return mapped;
}

async function loadOnlineLookup(latitude, longitude, fetchImpl) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
    zoom: '18',
    'accept-language': 'de',
    lat: String(latitude),
    lon: String(longitude)
  });

  const response = await Promise.race([
    fetchImpl(`${NOMINATIM_ENDPOINT}?${params.toString()}`, { headers: { Accept: 'application/json' } }),
    timeoutPromise(NOMINATIM_TIMEOUT)
  ]);

  if (!response.ok) {
    throw new Error(`Adressdienst antwortet mit Status ${response.status}`);
  }

  const data = await response.json();
  return parseFromNominatim(data);
}

class OperatorLookupService {
  constructor({ repository = operatorRepository, fetchImpl = globalThis.fetch } = {}) {
    this.repository = repository;
    this.fetchImpl = fetchImpl;
  }

  async lookupByCoordinates(latitude, longitude) {
    const coordinates = formatCoordinates(latitude, longitude);
    const cached = await this.repository.getByCoordinates(latitude, longitude);
    const cachedMapped = mapCachedEntry(cached);
    if (cachedMapped && (cachedMapped.lookupStatus === 'AUTO' || cachedMapped.lookupStatus === 'NOT_FOUND')) {
      return { ...cachedMapped, coordinates };
    }

    const result = await loadOnlineLookup(latitude, longitude, this.fetchImpl);
    const cachePayload = {
      coordinates,
      provider: result.lookupSource,
      checkedAt: result.lookupDate,
      status: result.lookupStatus === 'AUTO' ? 'found' : 'not-found',
      found: result.lookupStatus === 'AUTO',
      error: '',
      operator: {
        name: result.operator,
        phone: result.phone,
        email: result.email,
        website: result.website
      },
      association: result.association,
      owner: result.owner,
      operatingCompany: result.operatingCompany,
      municipality: result.municipality,
      district: result.district,
      state: result.state,
      municipalityKey: result.municipalityKey,
      lookupSource: result.lookupSource,
      lookupDate: result.lookupDate,
      lookupStatus: result.lookupStatus,
      matches: result.matches
    };

    await this.repository.saveByCoordinates(latitude, longitude, cachePayload);
    return { ...result, coordinates };
  }
}

const operatorLookupService = new OperatorLookupService();

export { OperatorLookupService, operatorLookupService, normalizeLookupResult };
