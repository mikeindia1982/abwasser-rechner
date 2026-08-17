export const fixtureFlockungsmittelHigh = {
  id: 'fixture-high-chem-001',
  source: 'DE_BEKANNTMACHUNGSSERVICE',
  sourceNoticeId: 'TEST-NOTICE-001',
  sourceVersionId: '1',
  publicationNumber: '2026-TEST-001',
  title: 'TESTDATEN: Lieferung von Faellmitteln und Flockungsmitteln fuer Klaeranlage Musterstadt',
  description: 'TESTDATEN: Rahmenvertrag fuer Eisenchlorid, Polymer und Dosierhilfen fuer Phosphatfaellung.',
  buyerName: 'Abwasserzweckverband Musterstadt',
  mainCpvCode: '24958200',
  additionalCpvCodes: ['90400000'],
  nutsCodes: ['DE403'],
  federalState: 'Brandenburg',
  city: 'Potsdam',
  publishedAt: '2026-07-20T10:00:00.000Z',
  submissionDeadline: '2026-08-18T10:00:00.000Z'
};

export const fixtureKlaeranlageHigh = {
  id: 'fixture-high-plant-002',
  source: 'DE_BEKANNTMACHUNGSSERVICE',
  sourceNoticeId: 'TEST-NOTICE-002',
  sourceVersionId: '1',
  publicationNumber: '2026-TEST-002',
  title: 'TESTDATEN: Verfahrenstechnische Optimierung der Klaeranlage Nord',
  description: 'TESTDATEN: Umbau Belueftungssystem, Dosiertechnik und Schlammentwaesserung.',
  buyerName: 'Stadtentwaesserung Berlin',
  mainCpvCode: '45252130',
  additionalCpvCodes: ['39350000'],
  nutsCodes: ['DE300'],
  federalState: 'Berlin',
  city: 'Berlin',
  publishedAt: '2026-07-21T10:00:00.000Z',
  submissionDeadline: '2026-08-10T10:00:00.000Z'
};

export const fixturePumpeMedium = {
  id: 'fixture-medium-pump-003',
  source: 'DE_BEKANNTMACHUNGSSERVICE',
  sourceNoticeId: 'TEST-NOTICE-003',
  sourceVersionId: '1',
  publicationNumber: '2026-TEST-003',
  title: 'TESTDATEN: Ersatzbeschaffung Pumpentechnik fuer Prozesswasser',
  description: 'TESTDATEN: Austausch bestehender Pumpen in Industriepark, ohne Chemiekomponente.',
  buyerName: 'Industriepark Nord GmbH',
  mainCpvCode: '39350000',
  additionalCpvCodes: [],
  nutsCodes: ['DE805'],
  federalState: 'Mecklenburg-Vorpommern',
  city: 'Rostock',
  publishedAt: '2026-07-22T10:00:00.000Z',
  submissionDeadline: '2026-08-05T10:00:00.000Z'
};

export const fixtureIrrelevant = {
  id: 'fixture-irrelevant-004',
  source: 'DE_BEKANNTMACHUNGSSERVICE',
  sourceNoticeId: 'TEST-NOTICE-004',
  sourceVersionId: '1',
  publicationNumber: '2026-TEST-004',
  title: 'TESTDATEN: Beschaffung IT-Hardware fuer Schulgebaeude',
  description: 'TESTDATEN: Laptops und Softwarelizenzen fuer Kindertagesstaette.',
  buyerName: 'Landkreis Sued',
  mainCpvCode: '30200000',
  additionalCpvCodes: [],
  nutsCodes: ['DE600'],
  federalState: 'Sachsen',
  city: 'Dresden',
  publishedAt: '2026-07-23T10:00:00.000Z',
  submissionDeadline: '2026-08-01T10:00:00.000Z'
};

export const fixtureUnknownExecutionRegion = {
  id: 'fixture-unknown-region-005',
  source: 'DE_BEKANNTMACHUNGSSERVICE',
  sourceNoticeId: 'TEST-NOTICE-005',
  sourceVersionId: '1',
  publicationNumber: '2026-TEST-005',
  title: 'TESTDATEN: Dosierstation fuer Abwasserbehandlung',
  description: 'TESTDATEN: Lieferung und Montage einer Dosierstation.',
  buyerName: 'Eigenbetrieb Wasserwirtschaft',
  mainCpvCode: '45232420',
  additionalCpvCodes: [],
  nutsCodes: [],
  federalState: '',
  city: '',
  publishedAt: '2026-07-24T10:00:00.000Z',
  submissionDeadline: '2026-08-21T10:00:00.000Z'
};

export const fixtureVersion2 = {
  ...fixtureFlockungsmittelHigh,
  sourceVersionId: '2',
  description: 'TESTDATEN: Aktualisierte Version mit erweitertem Lieferumfang inklusive Polymer und Entschaeumer.'
};
