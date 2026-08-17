const STORAGE_OPERATOR_LOOKUP_CACHE = "abwasser-operator-lookup-v01";

function formatCoordinates(latitude, longitude) {
  const lat = Number(String(latitude).replace(",", "."));
  const lon = Number(String(longitude).replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_OPERATOR_LOOKUP_CACHE) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  localStorage.setItem(STORAGE_OPERATOR_LOOKUP_CACHE, JSON.stringify(cache));
  return cache;
}

function normalizeEntry(entry = {}) {
  return {
    coordinates: "",
    latitude: "",
    longitude: "",
    provider: "osm-nominatim",
    status: "not-found",
    found: false,
    error: "",
    checkedAt: "",
    operator: {
      name: "",
      legalForm: "",
      street: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
      website: ""
    },
    association: "",
    owner: "",
    operatingCompany: "",
    municipality: "",
    district: "",
    state: "",
    municipalityKey: "",
    lookupSource: "",
    lookupDate: "",
    lookupStatus: "NOT_FOUND",
    matches: [],
    ...entry
  };
}

export const operatorRepository = {
  async getByCoordinates(latitude, longitude) {
    const key = formatCoordinates(latitude, longitude);
    if (!key) return null;
    const cache = loadCache();
    return cache[key] ? normalizeEntry(cache[key]) : null;
  },
  async saveByCoordinates(latitude, longitude, entry) {
    const key = formatCoordinates(latitude, longitude);
    if (!key) return null;
    const cache = loadCache();
    cache[key] = normalizeEntry(entry);
    saveCache(cache);
    return cache[key];
  },
  async clearCache() {
    localStorage.removeItem(STORAGE_OPERATOR_LOOKUP_CACHE);
  }
};
