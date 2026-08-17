export const TENDER_RADAR_FEATURE_FLAG = true;

export const TENDER_SOURCES = Object.freeze({
  germanPublicProcurement: 'DE_BEKANNTMACHUNGSSERVICE'
});

export const TENDER_RELEVANCE_LEVELS = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  IRRELEVANT: 'IRRELEVANT'
});

export const TENDER_STATUSES = Object.freeze({
  NEW: 'NEW',
  IN_REVIEW: 'IN_REVIEW',
  INTERESTING: 'INTERESTING',
  NOT_RELEVANT: 'NOT_RELEVANT',
  OFFER_PLANNED: 'OFFER_PLANNED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED'
});

export const TENDER_SCAN_RUN_STATUSES = Object.freeze({
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  FAILED: 'FAILED',
  RUNNING: 'RUNNING'
});

export const TENDER_TIMEZONE = 'Europe/Berlin';

export const TENDER_RADAR_CONFIG = Object.freeze({
  timezone: TENDER_TIMEZONE,
  initialImportDays: 7,
  autoSyncIntervalHours: 2,
  maxBackfillDaysPerRun: 31,
  http: {
    timeoutMs: 15000,
    maxRetries: 3,
    baseBackoffMs: 450,
    userAgent: 'AbwasserRechner/0.11 TenderRadar (+local-pwa)'
  },
  source: {
    baseUrl: 'https://www.datenservice-oeffentlicher-einkauf.de',
    // Official open-data export endpoint.
    noticeExportPath: '/api/notice-exports',
    corsProxy: {
      enabled: true,
      template: 'https://api.allorigins.win/raw?url={url}'
    }
  },
  regions: {
    preferredFederalStates: [
      'Baden-Wuerttemberg',
      'Bayern',
      'Berlin',
      'Brandenburg',
      'Bremen',
      'Hamburg',
      'Hessen',
      'Mecklenburg-Vorpommern',
      'Niedersachsen',
      'Nordrhein-Westfalen',
      'Rheinland-Pfalz',
      'Saarland',
      'Sachsen',
      'Sachsen-Anhalt',
      'Schleswig-Holstein',
      'Thueringen'
    ],
    preferredNutsPrefixes: ['DE3', 'DE4', 'DE8']
  },
  scoreThresholds: {
    high: 75,
    medium: 50,
    low: 25
  },
  scoreWeights: {
    cpvMax: 30,
    titleMax: 30,
    descriptionMax: 20,
    buyerMax: 10,
    regionMax: 10,
    negativeMax: -50
  },
  assignments: [
    { federalState: 'Baden-Wuerttemberg', assigneeName: 'Mirco Krause' },
    { federalState: 'Bayern', assigneeName: 'Mirco Krause' },
    { federalState: 'Berlin', assigneeName: 'Mirco Krause' },
    { federalState: 'Brandenburg', assigneeName: 'Mirco Krause' },
    { federalState: 'Bremen', assigneeName: 'Mirco Krause' },
    { federalState: 'Hamburg', assigneeName: 'Mirco Krause' },
    { federalState: 'Hessen', assigneeName: 'Mirco Krause' },
    { federalState: 'Mecklenburg-Vorpommern', assigneeName: 'Mirco Krause' },
    { federalState: 'Niedersachsen', assigneeName: 'Mirco Krause' },
    { federalState: 'Nordrhein-Westfalen', assigneeName: 'Mirco Krause' },
    { federalState: 'Rheinland-Pfalz', assigneeName: 'Mirco Krause' },
    { federalState: 'Saarland', assigneeName: 'Mirco Krause' },
    { federalState: 'Sachsen', assigneeName: 'Mirco Krause' },
    { federalState: 'Sachsen-Anhalt', assigneeName: 'Mirco Krause' },
    { federalState: 'Schleswig-Holstein', assigneeName: 'Mirco Krause' },
    { federalState: 'Thueringen', assigneeName: 'Mirco Krause' }
  ]
});

export const TENDER_RULES = Object.freeze({
  positiveKeywords: [
    'klaeranlage','klaerwerk','abwasseranlage','abwasserbehandlung','abwasserreinigung','prozesswasser','prozesswasserbehandlung',
    'industrieabwasser','abwasserchemie','betriebschemikalien','faellmittel','faellung','flockungsmittel','flockung','polymer',
    'polymere','polyelektrolyt','eisenchlorid','eisen iii chlorid','eisensalz','aluminiumsalz','phosphorelimination','phosphatfaellung',
    'schlammbehandlung','klaerschlamm','ueberschussschlamm','schlammentwaesserung','schlammeindickung','schlammtrocknung','zentrifuge',
    'dekanter','zentrat','truebwasser','filtration','dosiertechnik','dosieranlage','dosierstation','dosierpumpe','pumpentechnik',
    'abwasserpumpe','belueftung','belueftungssystem','geblaese','faulturm','faulung','faulturmoptimierung','entschaeumer',
    'geruchsbehandlung','schwefelwasserstoff','h2s','naehrstoffdosierung','spurenstoffelimination','vierte reinigungsstufe',
    'mikroschadstoffe','betriebsoptimierung','verfahrenstechnische optimierung'
  ],
  buyerKeywords: [
    'abwasserzweckverband','zweckverband','wasserverband','wasser und abwasserverband','stadtentwaesserung','entwaesserungsbetrieb',
    'abwasserbetrieb','eigenbetrieb','kommunalbetrieb','klaeranlage','klaerwerk','wasserwirtschaft','industriepark','industrieklaeranlage'
  ],
  negativeKeywords: [
    'reine trinkwasserversorgung','trinkwasserbrunnen','schulgebaeude','kindertagesstaette','strassenbeleuchtung','bueromoebel',
    'it hardware','softwarelizenz','reinigungsdienstleistung','winterdienst','gruenflaechenpflege','spielplatz','feuerwehrfahrzeug',
    'kanalreinigung ohne anlagenbezug','strassenbau ohne abwasserbezug'
  ],
  cpv: {
    exact: [
      '45252000','45252100','45252130','45232420','45232422','90400000','90410000','90420000','90430000','90481000',
      '24958200','39350000','90513600','90513700','90513800','90513900'
    ],
    broadPrefixes: ['904','45252','2495','3935','90513']
  }
});
