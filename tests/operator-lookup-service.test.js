import test from 'node:test';
import assert from 'node:assert/strict';
import { OperatorLookupService } from '../js/services/operator-lookup-service.js';

function makeRepositoryMock() {
  const store = new Map();
  return {
    async getByCoordinates(latitude, longitude) {
      return store.get(`${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`) || null;
    },
    async saveByCoordinates(latitude, longitude, entry) {
      store.set(`${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`, entry);
      return entry;
    }
  };
}

test('returns cached lookup result when present', async () => {
  const repository = makeRepositoryMock();
  await repository.saveByCoordinates(52.5, 13.4, {
    status: 'found',
    provider: 'osm-nominatim',
    checkedAt: '2026-07-29T00:00:00.000Z',
    operator: { name: 'Zweckverband Berlin', phone: '', email: '', website: '' },
    municipality: 'Berlin',
    district: 'Berlin',
    state: 'Berlin',
    municipalityKey: '11000000',
    lookupStatus: 'AUTO',
    matches: []
  });

  let fetched = false;
  const service = new OperatorLookupService({
    repository,
    fetchImpl: async () => {
      fetched = true;
      throw new Error('must not be called');
    }
  });

  const result = await service.lookupByCoordinates(52.5, 13.4);
  assert.equal(result.lookupStatus, 'AUTO');
  assert.equal(result.operator, 'Zweckverband Berlin');
  assert.equal(fetched, false);
});

test('loads online and maps not found status when no operator available', async () => {
  const repository = makeRepositoryMock();
  const service = new OperatorLookupService({
    repository,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          lat: '52.500000',
          lon: '13.400000',
          address: {
            city: 'Berlin',
            county: 'Berlin',
            state: 'Berlin'
          },
          extratags: {}
        };
      }
    })
  });

  const result = await service.lookupByCoordinates(52.5, 13.4);
  assert.equal(result.lookupStatus, 'NOT_FOUND');
  assert.equal(result.municipality, 'Berlin');
});

test('loads online and maps auto result with municipality key', async () => {
  const repository = makeRepositoryMock();
  const service = new OperatorLookupService({
    repository,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          lat: '52.500000',
          lon: '13.400000',
          name: 'Kläranlage Musterstadt',
          address: {
            city: 'Musterstadt',
            county: 'Musterkreis',
            state: 'Brandenburg'
          },
          extratags: {
            operator: 'Zweckverband Muster',
            website: 'https://example.org',
            phone: '+49 30 123456',
            email: 'info@example.org',
            ags: '12054000'
          }
        };
      }
    })
  });

  const result = await service.lookupByCoordinates(52.5, 13.4);
  assert.equal(result.lookupStatus, 'AUTO');
  assert.equal(result.operator, 'Zweckverband Muster');
  assert.equal(result.municipalityKey, '12054000');
  assert.equal(result.website, 'https://example.org');
  assert.equal(Array.isArray(result.matches), true);
  assert.equal(result.matches.length, 1);
});
