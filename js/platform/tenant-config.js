export const DEFAULT_TENANT_ID = "vta";

const sharedFeatures = Object.freeze({
  plants: true,
  visits: true,
  reports: true,
  documents: true,
  products: true,
  calculators: true,
  wastewater: true,
  dewatering: true,
  dosing: true,
  processSchema: true,
  tenderRadar: false,
  cloudSync: false,
  aiAssistant: false,
});

export const TENANT_CONFIGS = Object.freeze({
  vta: Object.freeze({
    id: "vta",
    editionName: "VTA Edition",
    appName: "VTA Wastewater Suite",
    shortName: "VTA",
    brandMark: "VTA",
    companyName: "VTA Austria GmbH",
    organization: Object.freeze({
      id: "org-vta-austria",
      name: "VTA Austria GmbH",
      type: "company",
      editionId: "vta",
    }),
    slogan: "Digitale Anlagen- und Vertriebsunterstützung für die Abwassertechnik",
    footer:
      "Orientierende Berechnungshilfe. Anlagen-, genehmigungs- und produktspezifische Randbedingungen sowie aktuelle Produktdatenblätter sind separat zu prüfen.",
    colors: Object.freeze({
      primary: "#0f4c5c",
      primaryDark: "#0a3945",
      accent: "#2c7a7b",
      background: "#eef4f4",
    }),
    features: sharedFeatures,
    storage: Object.freeze({
      preserveLegacyDatabase: true,
      seedProducts: "app-seeded",
    }),
    defaultProfile: Object.freeze({
      schemaVersion: 1,
      firstName: "",
      lastName: "",
      jobTitle: "Vertriebsingenieur",
      company: "VTA",
      department: "Außendienst",
      employeeNumber: "",
      region: "",
      branch: "",
      email: "",
      mobile: "",
      phone: "",
      website: "",
      street: "",
      postalCode: "",
      city: "",
      country: "Deutschland",
      notes: "",
    }),
  }),

  platform: Object.freeze({
    id: "platform",
    editionName: "Platform Edition",
    appName: "Abwasser Plattform",
    shortName: "Abwasser",
    brandMark: "AP",
    companyName: "",
    organization: Object.freeze({
      id: "org-platform-demo",
      name: "Demo-Organisation",
      type: "demo",
      editionId: "platform",
    }),
    slogan: "Herstellerneutrale Plattform für Wasser- und Abwassertechnik",
    footer:
      "Herstellerneutrale Fachanwendung. Anlagen-, genehmigungs- und produktspezifische Randbedingungen sind separat zu prüfen.",
    colors: Object.freeze({
      primary: "#0f4c5c",
      primaryDark: "#0a3945",
      accent: "#2c7a7b",
      background: "#eef4f4",
    }),
    features: sharedFeatures,
    storage: Object.freeze({
      preserveLegacyDatabase: false,
      seedProducts: "empty",
    }),
    defaultProfile: Object.freeze({
      schemaVersion: 1,
      firstName: "",
      lastName: "",
      jobTitle: "Vertriebsingenieur",
      company: "",
      department: "Außendienst",
      employeeNumber: "",
      region: "",
      branch: "",
      email: "",
      mobile: "",
      phone: "",
      website: "",
      street: "",
      postalCode: "",
      city: "",
      country: "Deutschland",
      notes: "",
    }),
  }),
});

export function getTenantConfig(id) {
  return TENANT_CONFIGS[id] || TENANT_CONFIGS[DEFAULT_TENANT_ID];
}

export function listTenantConfigs() {
  return Object.values(TENANT_CONFIGS);
}
