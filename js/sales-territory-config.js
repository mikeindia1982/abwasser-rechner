export const SALES_TERRITORIES = Object.freeze([
  Object.freeze({ id: 'north', label: 'Region Nord', ownerLabel: 'Vertrieb Nord', color: '#19a7ce', stateCodes: Object.freeze(['01', '02', '03', '04', '13']) }),
  Object.freeze({ id: 'west', label: 'Region West', ownerLabel: 'Vertrieb West', color: '#f59e0b', stateCodes: Object.freeze(['05', '06', '07', '10']) }),
  Object.freeze({ id: 'east', label: 'Region Ost', ownerLabel: 'Vertrieb Ost', color: '#a855f7', stateCodes: Object.freeze(['11', '12', '14', '15', '16']) }),
  Object.freeze({ id: 'south', label: 'Region Süd', ownerLabel: 'Vertrieb Süd', color: '#22c55e', stateCodes: Object.freeze(['08', '09']) }),
]);

export function territoryForStateCode(stateCode) {
  const normalized = String(stateCode || '').padStart(2, '0');
  return SALES_TERRITORIES.find(territory => territory.stateCodes.includes(normalized)) || null;
}

export function territoryColorExpression() {
  const pairs = SALES_TERRITORIES.flatMap(territory => territory.stateCodes.flatMap(code => [code, territory.color]));
  return ['match', ['get', 'ags'], ...pairs, '#64748b'];
}
