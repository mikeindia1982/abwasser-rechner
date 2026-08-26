export const SALES_TERRITORIES = Object.freeze([
  Object.freeze({ id: 'north', label: 'Region Nord', ownerLabel: 'Vertrieb Nord', color: '#19a7ce', stateCodes: Object.freeze(['01', '02', '03', '04', '13']) }),
  Object.freeze({ id: 'west', label: 'Region West', ownerLabel: 'Vertrieb West', color: '#f59e0b', stateCodes: Object.freeze(['05', '06', '07', '10']) }),
  Object.freeze({ id: 'east', label: 'Region Ost', ownerLabel: 'Vertrieb Ost', color: '#a855f7', stateCodes: Object.freeze(['11', '12', '14', '15', '16']) }),
  Object.freeze({ id: 'south', label: 'Region Süd', ownerLabel: 'Vertrieb Süd', color: '#22c55e', stateCodes: Object.freeze(['08', '09']) }),
]);

export const DEMO_INTERNATIONAL_TERRITORIES = Object.freeze([
  ...SALES_TERRITORIES,
  Object.freeze({ id: 'demo-at', label: 'Österreich', ownerLabel: 'Demo-Vertrieb Österreich', color: '#e11d48' }),
  Object.freeze({ id: 'demo-ch', label: 'Schweiz', ownerLabel: 'Demo-Vertrieb Schweiz', color: '#ef4444' }),
  Object.freeze({ id: 'demo-fr', label: 'Frankreich', ownerLabel: 'Demo-Vertrieb Frankreich', color: '#2563eb' }),
  Object.freeze({ id: 'demo-cz', label: 'Tschechien', ownerLabel: 'Demo-Vertrieb Tschechien', color: '#0d9488' }),
  Object.freeze({ id: 'demo-pl', label: 'Polen', ownerLabel: 'Demo-Vertrieb Polen', color: '#db2777' }),
]);

export function territoryForStateCode(stateCode) {
  const normalized = String(stateCode || '').padStart(2, '0');
  return SALES_TERRITORIES.find(territory => territory.stateCodes.includes(normalized)) || null;
}

export function territoryColorExpression() {
  const pairs = SALES_TERRITORIES.flatMap(territory => territory.stateCodes.flatMap(code => [code, territory.color]));
  return ['match', ['get', 'ags'], ...pairs, '#64748b'];
}

export function internationalTerritoryForFeature(properties = {}) {
  if (properties.countryCode === 'DE') {
    return territoryForStateCode(String(properties.regionCode || '').replace(/^DE-/, ''));
  }
  return DEMO_INTERNATIONAL_TERRITORIES.find(territory => territory.id === properties.territoryId) || null;
}

export function internationalTerritoryColorExpression() {
  const pairs = DEMO_INTERNATIONAL_TERRITORIES.flatMap(territory => [territory.id, territory.color]);
  return ['match', ['get', 'territoryId'], ...pairs, '#64748b'];
}
