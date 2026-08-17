import {VTA_EDITION_DATA} from '../editions/vta/edition-data.js';
import {PLATFORM_EDITION_DATA} from '../editions/platform/edition-data.js';

export const DEFAULT_TENANT_ID='vta';

const baseFeatures=Object.freeze({
  plants:true,visits:true,reports:true,documents:true,products:true,calculators:true,
  wastewater:true,dewatering:true,dosing:true,processSchema:true,tenderRadar:true,
  aiAssistant:false,firebaseAuth:false,cloudSync:false
});

export const TENANT_CONFIGS=Object.freeze({
  vta:Object.freeze({
    id:'vta',editionName:'VTA Edition',appName:'VTA Copilot',shortName:'VTA',brandMark:'VTA',
    companyName:'VTA Austria GmbH',
    slogan:'Digitale Anlagen- und Vertriebsunterstützung für die Abwassertechnik',
    footer:'Orientierende Berechnungshilfe. Anlagen-, genehmigungs- und produktspezifische Randbedingungen sowie aktuelle Produktdatenblätter sind separat zu prüfen.',
    colors:Object.freeze({primary:'#0f4c5c',primaryDark:'#0a3945',accent:'#2c7a7b',background:'#eef4f4'}),
    features:baseFeatures,
    organization:Object.freeze({id:'org-vta-austria',name:'VTA Austria GmbH',type:'company',editionId:'vta'}),
    storage:Object.freeze({seedProducts:'edition-config'}),
    defaultProfile:VTA_EDITION_DATA.defaultProfile,
    app:VTA_EDITION_DATA
  }),
  platform:Object.freeze({
    id:'platform',editionName:'Platform Edition',appName:'Abwasser Plattform',shortName:'Abwasser',brandMark:'AP',
    companyName:'',
    slogan:'Herstellerneutrale Plattform für Wasser- und Abwassertechnik',
    footer:'Herstellerneutrale Fachanwendung. Anlagen-, genehmigungs- und produktspezifische Randbedingungen sind separat zu prüfen.',
    colors:Object.freeze({primary:'#0f4c5c',primaryDark:'#0a3945',accent:'#2c7a7b',background:'#eef4f4'}),
    features:baseFeatures,
    organization:Object.freeze({id:'org-platform-demo',name:'Demo-Organisation',type:'demo',editionId:'platform'}),
    storage:Object.freeze({seedProducts:'edition-config'}),
    defaultProfile:PLATFORM_EDITION_DATA.defaultProfile,
    app:PLATFORM_EDITION_DATA
  })
});

export function getTenantConfig(id){return TENANT_CONFIGS[id]||TENANT_CONFIGS[DEFAULT_TENANT_ID]}
export function listTenantConfigs(){return Object.values(TENANT_CONFIGS)}
