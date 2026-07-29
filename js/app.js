import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";
import {documentRepository} from "./repositories/document-repository.js";
import {recentAudit} from "./services/audit-service.js";
import {operatorLookupService} from "./services/operator-lookup-service.js";
import {mountPdfViewer} from "./components/pdf-viewer.js";
import {renderProductImage,isChemicalProduct} from "./components/product-image.js";
import {renderProcessSchema3D,bindProcessSchema3D,defaultFlowSchema,normalizeFlowSchema} from "./process/process-schema-3d.js";
import * as requestModule from "./product-requests.js";
import {renderTenderRadarPage,getTenderUnreadCount} from "./tenders/tender-radar-ui.js";
import {tenderScanService} from "./tenders/services/tender-scan-service.js";

const VERSION="0.11.0-alpha.13";
const STORAGE_FAVORITES="abwasser-favorites-v07";
const STORAGE_MENU="abwasser-menu-v07";
const STORAGE_PLANTS="abwasser-plants-v07";
const STORAGE_ACTIVE_PLANT="abwasser-active-plant-v07";
const STORAGE_RECENT="abwasser-recent-v082";
const STORAGE_PROFILE="abwasser-employee-profile-v087";
const STORAGE_BACKUP="abwasser-plants-backup-v087";
const STORAGE_PLANT_PAGE="abwasser-plant-page-v091a";
const STORAGE_GLOBAL_PAGE="abwasser-global-page-v091b";
const STORAGE_PRODUCTS="abwasser-products-v092";
const STORAGE_DOCUMENTS="abwasser-documents-v010";
const STORAGE_REVERSE_GEOCODE_CACHE="abwasser-reverse-geocode-v01";
const STORAGE_SALES_REMINDER_NOTICE="abwasser-sales-reminder-notice-v01";

const categoryMeta={
  "Phosphor":{icon:"P",description:"Fällmittelbedarf, molare Stoffdaten und Handelsprodukte"},
  "Schlammentwässerung":{icon:"TS",description:"Durchsatz, Kuchenmenge, Polymer und Wirtschaftlichkeit"},
  "Grundlagen":{icon:"∑",description:"Frachten, Konzentrationen und grundlegende Umrechnungen"},
  "Biologie":{icon:"BIO",description:"Schlammalter, Schlammbelastung und biologische Kennwerte"},
  "Schlamm":{icon:"SVI",description:"Schlammkennwerte und Absetzverhalten"},
  "Hydraulik":{icon:"Q",description:"Volumen, Durchfluss und Aufenthaltszeiten"},
  "Chemikalien":{icon:"CH",description:"Dosierströme, Bestände und Chemikalienverbrauch"},
  "Wirtschaftlichkeit":{icon:"€",description:"Kosten, Vergleiche und Einsparpotenziale"}
};
const SALES_FUNNEL_STAGES=[
  ["analysis","Analyse"],
  ["trial","Versuch"],
  ["offer","Angebot"],
  ["order","Auftrag"],
  ["aftercare","Nachbetreuung"]
];
const SALES_STAGE_PROBABILITY={analysis:0.2,trial:0.4,offer:0.65,order:1,aftercare:1};
const SALES_REMINDER_WARNING_DAYS=45;
const SALES_REMINDER_CRITICAL_DAYS=70;
const VISIT_FOLLOW_UP_DAYS=2;
const TASK_FOLLOW_UP_DAYS=14;
const TANK_CRITICAL_OVERRUN_YEARS=5;
const TANK_APPROVAL_RULES=[
  {label:"Eisen(III)-chlorid",match:/eisen[-\s]*\(?iii\)?[-\s]*chlorid|ferric\s*chloride|fecl3/i,maxYears:20},
  {label:"PAC (Polyaluminiumchlorid)",match:/\bpac\b|polyaluminium[-\s]*chlorid|aluminium[-\s]*chlorid/i,maxYears:18},
  {label:"Natronlauge",match:/natronlauge|sodium\s*hydroxide|naoh|aetznatron|ätznatron/i,maxYears:22},
  {label:"Schwefelsäure",match:/schwefels(a|ä)ure|sulfuric\s*acid|h2so4/i,maxYears:20},
  {label:"Fällmittel (allgemein)",match:/f(a|ä)llmittel|precipitant/i,maxYears:18}
];


const mainProcessOptions=[
  ["activated-sludge","Belebtschlammverfahren"],
  ["sbr","Sequencing Batch Reactor (SBR)"],
  ["mbr","Membranbelebungsverfahren (MBR)"],
  ["trickling-filter","Tropfkörper"],
  ["rotating-biological-contactor","Scheibentauchkörper"],
  ["mbbr","Moving Bed Biofilm Reactor (MBBR)"],
  ["fixed-bed","Festbettverfahren"],
  ["biofilter","Biofilter"],
  ["constructed-wetland","Pflanzenkläranlage"],
  ["lagoon","Abwasserteich / Lagune"],
  ["anaerobic","Anaerobes Verfahren"],
  ["physico-chemical","Physikalisch-chemisches Verfahren"],
  ["other","Sonstiges"]
];
const processStageOptions=[
  ["screening","Rechenanlage"],
  ["grit-grease","Sand- und Fettfang"],
  ["primary-clarification","Vorklärung"],
  ["pre-denitrification","Vorgeschaltete Denitrifikation"],
  ["simultaneous-denitrification","Simultane Denitrifikation"],
  ["post-denitrification","Nachgeschaltete Denitrifikation"],
  ["intermittent-aeration","Intermittierende Belüftung"],
  ["nitrification","Nitrifikation"],
  ["biological-p-removal","Biologische Phosphorelimination"],
  ["pre-precipitation","Vorfällung"],
  ["simultaneous-precipitation","Simultanfällung"],
  ["post-precipitation","Nachfällung"],
  ["secondary-clarification","Nachklärung"],
  ["sand-filtration","Sandfiltration"],
  ["cloth-filtration","Tuchfiltration"],
  ["disc-filtration","Scheibenfiltration"],
  ["microfiltration","Mikrofiltration"],
  ["ultrafiltration","Ultrafiltration"],
  ["activated-carbon","Aktivkohleadsorption"],
  ["ozonation","Ozonung"],
  ["uv","UV-Desinfektion"],
  ["chlorination","Chemische Desinfektion"],
  ["sludge-digestion","Klärschlammfaulung"],
  ["aerobic-stabilization","Aerobe Schlammstabilisierung"],
  ["sludge-dewatering","Maschinelle Schlammentwässerung"],
  ["thermal-drying","Thermische Trocknung"],
  ["solar-drying","Solare Trocknung"],
  ["other","Sonstige Verfahrensstufe"]
];

const europeanCallingCodes=[
  ["+355","Albanien"],["+376","Andorra"],["+374","Armenien"],["+994","Aserbaidschan"],
  ["+32","Belgien"],["+387","Bosnien und Herzegowina"],["+359","Bulgarien"],["+45","Dänemark"],
  ["+49","Deutschland"],["+372","Estland"],["+298","Färöer"],["+358","Finnland"],
  ["+33","Frankreich"],["+995","Georgien"],["+30","Griechenland"],["+44","Großbritannien"],
  ["+353","Irland"],["+354","Island"],["+39","Italien / Vatikanstadt"],["+383","Kosovo"],
  ["+385","Kroatien"],["+357","Zypern"],["+371","Lettland"],["+423","Liechtenstein"],
  ["+370","Litauen"],["+352","Luxemburg"],["+356","Malta"],["+373","Moldau"],
  ["+377","Monaco"],["+382","Montenegro"],["+31","Niederlande"],["+389","Nordmazedonien"],
  ["+47","Norwegen"],["+43","Österreich"],["+48","Polen"],["+351","Portugal"],
  ["+40","Rumänien"],["+7","Russland"],["+378","San Marino"],["+381","Serbien"],
  ["+421","Slowakei"],["+386","Slowenien"],["+34","Spanien"],["+46","Schweden"],
  ["+41","Schweiz"],["+420","Tschechien"],["+90","Türkei"],["+380","Ukraine"],
  ["+36","Ungarn"],["+375","Belarus"]
];

function phoneParts(value="",defaultCode="+49"){
  const normalized=String(value||"").trim();
  const match=europeanCallingCodes
    .map(([code])=>code)
    .sort((a,b)=>b.length-a.length)
    .find(code=>normalized.startsWith(code));
  return match
    ? {code:match,number:normalized.slice(match.length).trim()}
    : {code:defaultCode,number:normalized};
}
function phoneField(prefix,label,value="",defaultCode="+49"){
  const parts=phoneParts(value,defaultCode);
  return `<label class="field-label phone-field">${label}
    <span class="phone-input-group">
      <select name="${prefix}.code" aria-label="${label} Ländervorwahl">
        ${europeanCallingCodes.map(([code,country])=>`<option value="${code}" ${parts.code===code?"selected":""}>${country} (${code})</option>`).join("")}
      </select>
      <input name="${prefix}.number" type="tel" inputmode="tel" value="${esc(parts.number)}" placeholder="Ortsvorwahl und Rufnummer">
    </span>
  </label>`;
}
function combinePhone(formData,prefix){
  const code=(formData.get(`${prefix}.code`)||"").trim();
  const number=(formData.get(`${prefix}.number`)||"").trim().replace(/\s+/g," ");
  return number?`${code} ${number}`:"";
}
function isoLocalToDate(value){
  if(!value)return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d;
}
function pad2(n){return String(n).padStart(2,"0")}
function icsDate(date){
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth()+1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}
function escapeIcs(value=""){
  return String(value).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
}
function visitOutlookUrl(plant,visit){
  const start=isoLocalToDate(visit.start);
  const end=isoLocalToDate(visit.end);
  const params=new URLSearchParams({
    path:"/calendar/action/compose",
    rru:"addevent",
    subject:visit.title||`Besuch ${plant.master.name||"Kläranlage"}`,
    startdt:start?start.toISOString():"",
    enddt:end?end.toISOString():"",
    location:[plant.address.street,plant.address.postalCode,plant.address.city].filter(Boolean).join(", "),
    body:[visit.purpose,visit.notes,visit.contact?`Ansprechpartner: ${visit.contact}`:""].filter(Boolean).join("\n\n")
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}
function exportVisitIcs(plant,visit){
  const start=isoLocalToDate(visit.start);
  const end=isoLocalToDate(visit.end);
  if(!start||!end)return alert("Bitte Start- und Endzeit vollständig hinterlegen.");
  const uid=`${visit.id}@abwasser-rechner`;
  const location=[plant.address.street,plant.address.postalCode,plant.address.city,plant.address.country].filter(Boolean).join(", ");
  const description=[
    visit.purpose,
    visit.contact?`Ansprechpartner: ${visit.contact}`:"",
    visit.notes,
    plant.operator?.name?`Betreiber: ${plant.operator.name}`:""
  ].filter(Boolean).join("\n");
  const ics=[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abwasser Rechner//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(visit.title||`Besuch ${plant.master.name||"Kläranlage"}`)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const safe=(plant.master.name||"klaeranlage").toLowerCase().replace(/[^a-z0-9äöüß]+/gi,"-").replace(/^-|-$/g,"");
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`${safe||"klaeranlage"}-besuch.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
const defaultLimits=[
  {key:"pOut",label:"Ablauf Pges",unit:"mg/l",direction:"max",target:0.8,warning:1.0,legal:2.0},
  {key:"nh4Out",label:"Ablauf NH₄-N",unit:"mg/l",direction:"max",target:2.0,warning:4.0,legal:10.0},
  {key:"svi",label:"SVI",unit:"ml/g",direction:"range",greenMin:80,greenMax:150,warningMin:60,warningMax:180},
  {key:"sludgeAge",label:"Schlammalter",unit:"d",direction:"min",target:10,warning:8,legal:null},
  {key:"cakeTs",label:"Kuchen-TS",unit:"%",direction:"min",target:25,warning:22,legal:null},
  {key:"retention",label:"Feststoffrückhalt",unit:"%",direction:"min",target:96,warning:94,legal:null},
  {key:"polymer",label:"Polymerverbrauch",unit:"kg WS/t TS",direction:"max",target:8,warning:11,legal:null}
];

function makeId(){
  return globalThis.crypto?.randomUUID?.()||`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

function defaultSalesFunnel(){
  return {
    stage:"analysis",
    potentialValue:"",
    nextStep:"",
    lastContactDate:"",
    targetCloseDate:"",
    notes:"",
    history:[]
  };
}
function normalizeSalesFunnel(value={}){
  const source=value&&typeof value==="object"?value:{};
  const stage=SALES_FUNNEL_STAGES.some(([id])=>id===source.stage)?source.stage:"analysis";
  return {
    ...defaultSalesFunnel(),
    ...source,
    stage,
    history:Array.isArray(source.history)
      ? source.history
          .map(item=>({
            stage:SALES_FUNNEL_STAGES.some(([id])=>id===item.stage)?item.stage:"analysis",
            changedAt:item.changedAt||new Date().toISOString(),
            note:item.note||""
          }))
          .slice(-20)
      :[]
  };
}
function defaultSalesOpportunity(){
  return {
    id:makeId(),
    title:"Neue Chance",
    stage:"analysis",
    potentialValue:"",
    nextStep:"",
    lastContactDate:"",
    lastOrderDate:"",
    lastDeliveryDate:"",
    targetCloseDate:"",
    notes:"",
    history:[],
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}
function normalizeSalesOpportunity(value={}){
  const source=value&&typeof value==="object"?value:{};
  const normalized=normalizeSalesFunnel(source);
  return {
    ...defaultSalesOpportunity(),
    ...normalized,
    id:source.id||makeId(),
    title:String(source.title||"").trim()||"Unbenannte Chance",
    createdAt:source.createdAt||new Date().toISOString(),
    updatedAt:source.updatedAt||new Date().toISOString()
  };
}
function defaultSalesPipeline(){
  const first=defaultSalesOpportunity();
  return {
    activeOpportunityId:first.id,
    opportunities:[first]
  };
}
function normalizeSalesPipeline(value={},legacyFunnel={}){
  const source=value&&typeof value==="object"?value:{};
  let opportunities=Array.isArray(source.opportunities)?source.opportunities.map(normalizeSalesOpportunity):[];
  if(!opportunities.length){
    const migrated=normalizeSalesOpportunity({
      ...normalizeSalesFunnel(legacyFunnel),
      id:makeId(),
      title:"Hauptchance"
    });
    opportunities=[migrated];
  }
  const ids=new Set(opportunities.map(item=>item.id));
  const activeOpportunityId=ids.has(source.activeOpportunityId)?source.activeOpportunityId:opportunities[0].id;
  return {activeOpportunityId,opportunities};
}

const emptyPlant=()=>({
  schemaVersion:7,
  id:makeId(),
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  master:{
    name:"",internalNumber:"",type:"municipal",industry:"",capacityPE:"",actualPE:"",
    mainProcess:"activated-sludge",processStages:[],processOther:"",process:"",notes:""
  },
  address:{street:"",postalCode:"",city:"",state:"Brandenburg",country:"Deutschland",gps:"",latitude:"",longitude:"",accuracy:"",capturedAt:"",geocodedAt:"",deliveryAddress:""},
  access:{parking:"",gate:"",accessCode:"",openingHours:"",registration:"",ppe:"",truckAccess:"",deliveryNotes:"",siteNotes:""},
    operator:{
      name:"",legalForm:"",customerNumber:"",association:"",owner:"",operatingCompany:"",
      street:"",postalCode:"",city:"",municipality:"",district:"",state:"",municipalityKey:"",
      phone:"",email:"",website:"",lookupSource:"",lookupDate:"",lookupStatus:"IDLE"
    },
  operatorLookup:{status:"idle",provider:"",checkedAt:"",coordinates:"",error:"",found:false},
  contacts:[],
  visits:[],
  sludgeDewatering:{
    enabled:false,status:"active",process:"screw-press",manufacturer:"",model:"",year:"",unitCount:"1",operationMode:"batch",
    throughputM3h:"",inletTsPercent:"",outletTsPercent:"",polymerKgPerTds:"",operatingHours:"",sludgeQuantity:"",
    polymerStation:false,feedPump:false,conveyor:false,container:false,filtrateRouting:"",notes:""
  },
  dosingSystems:[],
  tankSystems:[],
  salesFunnel:defaultSalesFunnel(),
  salesPipeline:defaultSalesPipeline(),
  parameters:{
    flow:"",pIn:"",pOut:"",pTarget:"",nh4Out:"",basinVolume:"",mlss:"",svi:"",
    sludgeAge:"",sludgeFlow:"",sludgeTs:"",cakeTs:"",retention:"",polymer:"",
    disposalPrice:"",precipitantPrice:"",operatingDays:"365"
  },
  flowSchema:defaultFlowSchema(),
  limits:structuredClone(defaultLimits)
});

const VISIT_CHECKLIST=[
  ["contact","Ansprechpartner gesprochen"],
  ["walkthrough","Rundgang durchgeführt"],
  ["photos","Fotos aufgenommen"],
  ["samples","Proben genommen"],
  ["measurements","Messwerte erfasst"],
  ["technology","Technik geprüft"],
  ["dosing","Dosierung geprüft"],
  ["dewatering","Schlammentwässerung geprüft"],
  ["tasks","Aufgaben festgehalten"]
];
function normalizeVisit(value={}){
  const source=value&&typeof value==="object"?value:{};
  return {
    id:source.id||makeId(),title:source.title||"Besuch",start:source.start||"",end:source.end||"",purpose:source.purpose||"",contact:source.contact||"",
    visitType:source.visitType||"process-optimization",processArea:source.processArea||"",objective:source.objective||"",
    initialSituation:source.initialSituation||"",workPerformed:source.workPerformed||"",chemistryChanges:source.chemistryChanges||"",settingChanges:source.settingChanges||"",
    result:source.result||"",recommendation:source.recommendation||"",nextSteps:source.nextSteps||"",
    comparison:{beforeProduct:source.comparison?.beforeProduct||"",afterProduct:source.comparison?.afterProduct||"",beforeDose:source.comparison?.beforeDose||"",afterDose:source.comparison?.afterDose||"",beforeCost:source.comparison?.beforeCost||"",afterCost:source.comparison?.afterCost||"",beforeQuality:source.comparison?.beforeQuality||"",afterQuality:source.comparison?.afterQuality||""},
    status:source.status||"planned",notes:source.notes||"",modeStatus:source.modeStatus||"not-started",startedAt:source.startedAt||"",completedAt:source.completedAt||"",
    checklist:{...Object.fromEntries(VISIT_CHECKLIST.map(([key])=>[key,false])),...(source.checklist||{})},
    measurements:{flow:source.measurements?.flow||"",pOut:source.measurements?.pOut||"",nh4Out:source.measurements?.nh4Out||"",cakeTs:source.measurements?.cakeTs||"",polymer:source.measurements?.polymer||"",custom:source.measurements?.custom||""},
    findings:Array.isArray(source.findings)?source.findings.map(f=>({id:f.id||makeId(),severity:f.severity||"info",text:f.text||"",createdAt:f.createdAt||new Date().toISOString(),resolved:Boolean(f.resolved)})):[],photos:Array.isArray(source.photos)?source.photos:[],summary:source.summary||""
  };
}

function normalizePlant(value={}){
  const base=emptyPlant();
  const source=value&&typeof value==="object"?value:{};
  const normalized={
    ...base,
    ...source,
    schemaVersion:7,
    id:source.id||base.id,
    master:{...base.master,...(source.master||{})},
    address:{...base.address,...(source.address||{})},
    access:{...base.access,...(source.access||{})},
    operator:{...base.operator,...(source.operator||{})},
    operatorLookup:{...base.operatorLookup,...(source.operatorLookup||{})},
    parameters:{...base.parameters,...(source.parameters||{})},
    sludgeDewatering:dewateringDefaults(source.sludgeDewatering||{}),
    dosingSystems:Array.isArray(source.dosingSystems)?source.dosingSystems.map(dosingDefaults):[],
    tankSystems:Array.isArray(source.tankSystems)?source.tankSystems.map(tankDefaults):[],
    salesFunnel:normalizeSalesFunnel(source.salesFunnel||{}),
    salesPipeline:normalizeSalesPipeline(source.salesPipeline||{},source.salesFunnel||{}),
    contacts:Array.isArray(source.contacts)?source.contacts:[],
    visits:Array.isArray(source.visits)?source.visits.map(normalizeVisit):[],
    actions:Array.isArray(source.actions)?source.actions.map(a=>({id:a.id||makeId(),title:a.title||"Aufgabe",status:a.status||"open",priority:a.priority||"normal",dueDate:a.dueDate||"",component:a.component||"",sourceVisitId:a.sourceVisitId||"",createdAt:a.createdAt||new Date().toISOString(),completedAt:a.completedAt||"",autoGenerated:Boolean(a.autoGenerated),followUpType:a.followUpType||"",followUpSourceId:a.followUpSourceId||""})):
      [],
    communications:Array.isArray(source.communications)?source.communications.map(c=>({id:c.id||makeId(),type:c.type||"mail",title:c.title||"Kommunikation gestartet",recipient:c.recipient||"",subject:c.subject||"",note:c.note||"",createdAt:c.createdAt||new Date().toISOString(),employee:c.employee||""})):
      [],
    flowSchema:normalizeFlowSchema(source.flowSchema||defaultFlowSchema()),
    limits:Array.isArray(source.limits)&&source.limits.length?source.limits:structuredClone(defaultLimits)
  };
  normalized.master.processStages=Array.isArray(normalized.master.processStages)?normalized.master.processStages:[];
  const legacy=parseLegacyGps(normalized.address.gps||"");
  normalized.address.latitude=normalized.address.latitude||legacy.latitude;
  normalized.address.longitude=normalized.address.longitude||legacy.longitude;
  return normalized;
}


const defaultEmployeeProfile=()=>({
  schemaVersion:1,firstName:"",lastName:"",jobTitle:"Vertriebsingenieur",company:"VTA",department:"Außendienst",
  employeeNumber:"",region:"",branch:"",email:"",mobile:"",phone:"",website:"",street:"",postalCode:"",city:"",country:"Deutschland",notes:""
});
function normalizeEmployeeProfile(value={}){return {...defaultEmployeeProfile(),...(value&&typeof value==="object"?value:{})};}
function loadEmployeeProfile(){try{return normalizeEmployeeProfile(JSON.parse(localStorage.getItem(STORAGE_PROFILE)||"{}"));}catch{return defaultEmployeeProfile();}}
let employeeProfile=loadEmployeeProfile();
function saveEmployeeProfile(){
  try{const payload=JSON.stringify(employeeProfile);localStorage.setItem(STORAGE_PROFILE,payload);if(localStorage.getItem(STORAGE_PROFILE)!==payload)throw new Error("Speicherprüfung fehlgeschlagen");updateProfileButton();return true;}
  catch(error){console.error(error);alert("Das Mitarbeiterprofil konnte nicht gespeichert werden.");return false;}
}
function employeeDisplayName(){return [employeeProfile.firstName,employeeProfile.lastName].filter(Boolean).join(" ")||"Profil";}
function updateProfileButton(){
  const name=document.querySelector("#profileButtonName"),avatar=document.querySelector("#profileAvatar");
  if(name)name.textContent=employeeDisplayName();
  if(avatar)avatar.textContent=(employeeProfile.firstName?.[0]||employeeProfile.lastName?.[0]||"👤").toUpperCase();
}
function escapeVCard(value=""){return String(value).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");}
function employeeVCard(){
  const p=employeeProfile;const full=[p.firstName,p.lastName].filter(Boolean).join(" ");
  return ["BEGIN:VCARD","VERSION:3.0",`N:${escapeVCard(p.lastName)};${escapeVCard(p.firstName)};;;`,`FN:${escapeVCard(full)}`,
    p.company?`ORG:${escapeVCard(p.company)}`:"",p.jobTitle?`TITLE:${escapeVCard(p.jobTitle)}`:"",p.mobile?`TEL;TYPE=CELL:${escapeVCard(p.mobile)}`:"",
    p.phone?`TEL;TYPE=WORK:${escapeVCard(p.phone)}`:"",p.email?`EMAIL;TYPE=INTERNET,WORK:${escapeVCard(p.email)}`:"",p.website?`URL:${escapeVCard(p.website)}`:"",
    (p.street||p.city)?`ADR;TYPE=WORK:;;${escapeVCard(p.street)};${escapeVCard(p.city)};;${escapeVCard(p.postalCode)};${escapeVCard(p.country)}`:"","END:VCARD"].filter(Boolean).join("\r\n");
}
function qrSvg(text,size=220){
  try{const qr=new window.QRCodeGenerator(0,window.QRErrorCorrectLevel.M);qr.addData(text);qr.make();const n=qr.getModuleCount(),quiet=4,cell=size/(n+quiet*2);let rects="";for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))rects+=`<rect x="${((c+quiet)*cell).toFixed(2)}" y="${((r+quiet)*cell).toFixed(2)}" width="${(cell+.15).toFixed(2)}" height="${(cell+.15).toFixed(2)}"/>`;return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="QR-Code mit Kontaktdaten"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects}</g></svg>`;}catch(error){console.error(error);return `<div class="qr-error">QR-Code konnte nicht erzeugt werden.</div>`;}
}
function downloadVCard(){const blob=new Blob([employeeVCard()],{type:"text/vcard;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${employeeDisplayName().replace(/[^a-z0-9äöüß]+/gi,"-").toLowerCase()||"kontakt"}.vcf`;a.click();URL.revokeObjectURL(url);}


const seededProducts=[
  {
    id:"product-aquafix-70-plus",name:"VTA Aquafix® 70 plus",materialNumber:"33",productType:"chemical",category:"Fällungs- und Flockungsmittel",status:"active",isActive:true,
    packageSizes:["25 kg Sack","60 kg Fass","1.000 kg IBC","Tanklastzug"],
    notes:"Flüssiges Fällungs- und Flockungsmittel in wässriger Lösung.",applications:["Fällung","Flockung"],problems:[],benefits:[],
    technical:{state:"flüssig",color:"gelb, grün",ph:"< 2",density:"ca. 1,3 g/cm³",solubility:"vollständig mischbar",storageStability:"12 Monate"},
    safety:{signalWord:"Gefahr",hazardStatements:["H290","H318"],unNumber:"UN1760",transportClass:"8",waterHazardClass:"1"},
    documents:[],createdAt:"2026-07-26T00:00:00.000Z",updatedAt:"2026-07-26T00:00:00.000Z",reviewStatus:"seeded"
  },
  {
    id:"product-biokat",name:"VTA Biokat®",materialNumber:"",productType:"chemical",category:"Biologische Prozessunterstützung",status:"active",isActive:true,
    packageSizes:["25 kg Sack","60 kg Fass","1.000 kg IBC","Tanklastzug"],
    notes:"Maßgeschneiderte Bio-Kost zur Stabilisierung und Aktivierung der biologischen Reinigungsleistung.",
    applications:["Biologische Abwasserreinigung","Belebungsanlage"],
    problems:["Blähschlamm","Schwimmschlamm","starke Fädigkeit","lockere und instabile Flocken","gestörte Reinigungsleistung"],
    benefits:["Verbessert Reinigungsleistung und Schlammeigenschaften","Kompakte und stabile Flocken","Reduziert Energie- und Produktverbrauch","Biologisch verträglich"],
    technical:{state:"",color:"",ph:"",density:"",solubility:"",storageStability:""},safety:{signalWord:"",hazardStatements:[],unNumber:"",transportClass:"",waterHazardClass:""},
    documents:[],createdAt:"2026-07-26T00:00:00.000Z",updatedAt:"2026-07-26T00:00:00.000Z",reviewStatus:"seeded"
  }
];
function normalizeProduct(x={}){
  const category=String(x.category||"").trim();
  const productType=x.productType==="technical"?"technical":x.productType==="chemical"?"chemical":(isChemicalProduct({productType:x.productType,category})?"chemical":"technical");
  return {
    id:x.id||makeId(),
    name:x.name||"",
    materialNumber:x.materialNumber||"",
    productType,
    packageSizes:Array.isArray(x.packageSizes)?x.packageSizes:["25 kg Sack","60 kg Fass","1.000 kg IBC","Tanklastzug"],
    isActive:typeof x.isActive==="boolean"?x.isActive:true,
    category:category||"Sonstiges",
    notes:x.notes||"",
    status:x.status||"active",
    shortDescription:x.shortDescription||"",
    imageUrl:x.imageUrl||"",
    applications:Array.isArray(x.applications)?x.applications:[],
    problems:Array.isArray(x.problems)?x.problems:[],
    benefits:Array.isArray(x.benefits)?x.benefits:[],
    technical:{state:"",color:"",ph:"",density:"",solubility:"",storageStability:"",...(x.technical||{})},
    safety:{signalWord:"",hazardStatements:[],unNumber:"",transportClass:"",waterHazardClass:"",...(x.safety||{})},
    documents:Array.isArray(x.documents)?x.documents:[],
    createdAt:x.createdAt||new Date().toISOString(),
    updatedAt:x.updatedAt||new Date().toISOString(),
    reviewStatus:x.reviewStatus||"draft"
  };
}
function loadProducts(){
  try{const raw=localStorage.getItem(STORAGE_PRODUCTS);if(!raw){localStorage.setItem(STORAGE_PRODUCTS,JSON.stringify(seededProducts));return seededProducts.map(normalizeProduct)}const data=JSON.parse(raw);return Array.isArray(data)?data.map(normalizeProduct):seededProducts.map(normalizeProduct)}catch{return seededProducts.map(normalizeProduct)}
}
let products=loadProducts();
let productRequestState={
  type:"order",
  search:"",
  productTypeFilter:"",
  positions:[],
  selectedProductId:"",
  packageSize:"",
  quantity:1,
  urgency:"Standard",
  desiredDate:"",
  remark:""
};
function saveProducts(){try{localStorage.setItem(STORAGE_PRODUCTS,JSON.stringify(products));return true}catch(error){console.error(error);alert("Produktdaten konnten nicht gespeichert werden.");return false}}
function productById(id){return products.find(x=>x.id===id)||null}
function splitKnowledge(value=""){return String(value).split(/\n|;/).map(x=>x.trim()).filter(Boolean)}
function unique(values){return [...new Set(values.filter(Boolean))]}
function parseCsvText(csvText){
  const rows=[];
  let current="";
  let record=[];
  let inQuotes=false;
  const text=String(csvText).replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(inQuotes){
      if(char==='"'){
        if(text[i+1]==='"'){current+='"';i++;continue;}
        inQuotes=false;
      } else {
        current+=char;
      }
    } else {
      if(char==='"'){
        inQuotes=true;
      } else if(char===","||char===';'){
        record.push(current);current="";
      } else if(char==='\n'){
        record.push(current);rows.push(record);record=[];current="";
      } else {
        current+=char;
      }
    }
  }
  if(inQuotes){
    record.push(current);
  } else if(current!==""||record.length){
    record.push(current);
  }
  if(record.length) rows.push(record);
  return rows;
}
function mapCsvHeaders(headers){
  return headers.map(h=>{const key=String(h||"").trim().toLowerCase();
    if(/^(name|produktname|product|artikelname)$/i.test(key)) return "name";
    if(/^(materialnummer|material number|nr|number)$/i.test(key)) return "materialNumber";
    if(/^(kategorie|category|produktgruppe|category name)$/i.test(key)) return "category";
    if(/^(imageurl|bild-url|bild url|bild|image)$/i.test(key)) return "imageUrl";
    if(/^(kurzbeschreibung|shortdescription|description|beschreibung)$/i.test(key)) return "shortDescription";
    if(/^(anwendungen|applications)$/i.test(key)) return "applications";
    if(/^(probleme|problems)$/i.test(key)) return "problems";
    if(/^(nutzen|benefits|vorteile)$/i.test(key)) return "benefits";
    if(/^(signalwort|signal word)$/i.test(key)) return "signalWord";
    if(/^(unnumber|un nummer|un-number|un nummer|un)$/i.test(key)) return "unNumber";
    if(/^(zustand|state|aggregatzustand|aggregatzustand)$/i.test(key)) return "state";
    if(/^(ph|ph-wert)$/i.test(key)) return "ph";
    if(/^(dichte|density)$/i.test(key)) return "density";
    if(/^(löslichkeit|loeslichkeit|solubility)$/i.test(key)) return "solubility";
    if(/^(lagerstabilität|lagerstabilitaet|storage stability|storagestability)$/i.test(key)) return "storageStability";
    if(/^(produktart|product type|type)$/i.test(key)) return "productType";
    if(/^(gebinde|gebindegrößen|gebinde groessen|package sizes|packagesizes)$/i.test(key)) return "packageSizes";
    return null;
  });
}
function parseProductCsvRecords(text){
  const rows=parseCsvText(text).filter(r=>r.some(cell=>String(cell||"").trim()));
  if(!rows.length) return {records:[],errors:["Leere Datei"]};
  let headers=mapCsvHeaders(rows[0]);
  let dataRows=rows.slice(1);
  if(headers.every(h=>!h) && rows[0].length===1){
    headers=["name"];
    dataRows=rows;
  }
  const records=[];
  const errors=[];
  for(let i=0;i<dataRows.length;i++){
    const row=dataRows[i];
    const record={};
    for(let j=0;j<headers.length;j++){
      const header=headers[j];
      if(!header) continue;
      record[header]=String(row[j]||"").trim();
    }
    if(!record.name){
      errors.push(`Zeile ${i+1 + (dataRows===rows?0:1)}: Produktname fehlt`);
      continue;
    }
    const normalized={
      name:record.name,
      materialNumber:record.materialNumber||"",
      category:record.category||"Sonstiges",
      imageUrl:record.imageUrl||"",
      shortDescription:record.shortDescription||"",
      applications:splitKnowledge(record.applications||""),
      problems:splitKnowledge(record.problems||""),
      benefits:splitKnowledge(record.benefits||""),
      technical:{
        state:record.state||"",
        ph:record.ph||"",
        density:record.density||"",
        solubility:record.solubility||"",
        storageStability:record.storageStability||""
      },
      safety:{
        signalWord:record.signalWord||"",
        unNumber:record.unNumber||"",
        hazardStatements:[]
      },
      productType:record.productType?(/^(technical|technik|technical product|technisch)$/i.test(record.productType)?"technical":"chemical"):"chemical",
      packageSizes:splitKnowledge(record.packageSizes||"")
    };
    if(!normalized.packageSizes.length) normalized.packageSizes=["25 kg Sack","60 kg Fass","1.000 kg IBC","Tanklastzug"];
    records.push(normalized);
  }
  return {records,errors};
}
function importProductsFromCsvFiles(files){
  const csvs=[...files].filter(f=>/\.csv$/i.test(f.name));
  if(!csvs.length) return alert("Bitte mindestens eine CSV-Datei mit Produktdaten auswählen.");
  const imported=[];
  const errors=[];
  return Promise.all(csvs.map(async file=>{
    try{
      const text=await file.text();
      const {records,errors:errs}=parseProductCsvRecords(text);
      errs.forEach(e=>errors.push(`${file.name}: ${e}`));
      for(const raw of records){
        const exists=products.find(p=>p.name.toLowerCase()===raw.name.toLowerCase()&&(raw.materialNumber&&p.materialNumber===raw.materialNumber));
        if(exists) continue;
        const product=normalizeProduct(raw);
        product.createdAt=new Date().toISOString();
        product.updatedAt=product.createdAt;
        products.push(product);
        imported.push(product);
      }
    }catch(error){
      errors.push(`${file.name}: ${error.message||String(error)}`);
    }
  })).then(()=>{
    if(imported.length){
      saveProducts();
      showProducts();
    }
    const summary=[];
    if(imported.length) summary.push(`${imported.length} Produkt${imported.length===1?"":"e"} importiert.`);
    if(errors.length) summary.push(`Fehler: ${errors.join("; ")}`);
    alert(summary.join(" ")||"Keine Produkte importiert.");
  });
}
function handleProductCsvImport(event){
  const files=event.target.files;if(!files?.length) return;
  importProductsFromCsvFiles(files);
  event.target.value="";
}
function detectDocumentType(text,name=""){
  const hay=`${name}\n${text}`.toLowerCase();
  if(hay.includes("sicherheitsdatenblatt")||hay.includes("abschnitt 1:")||hay.includes("verordnung (eg) nr. 1907/2006"))return "sds";
  if(hay.includes("factsheet")||hay.includes("eine bio-innovation")||hay.includes("viele vorteile")||hay.includes("100% effizient"))return "factsheet";
  if(hay.includes("technisches merkblatt")||hay.includes("technische information"))return "technical";
  if(hay.includes("produktdatenblatt"))return "product-sheet";
  return "other";
}
function documentTypeLabel(type){return ({sds:"Sicherheitsdatenblatt",factsheet:"Factsheet","product-sheet":"Produktdatenblatt",technical:"Technisches Merkblatt",other:"Sonstiges Dokument"})[type]||"Sonstiges Dokument"}
function cleanPdfText(value=""){return String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g," ").replace(/\s+/g," ").trim()}
async function extractPdfTextBasic(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  const decoded=new TextDecoder("latin1").decode(bytes);
  const literal=[...decoded.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g)].map(m=>m[1]);
  const arrays=[...decoded.matchAll(/\[(.*?)\]\s*TJ/gs)].flatMap(m=>[...m[1].matchAll(/\((.*?)\)/g)].map(x=>x[1]));
  const text=cleanPdfText([...literal,...arrays].join(" ").replace(/\\[nrt]/g," ").replace(/\\([()\\])/g,"$1"));
  return text.length>80?text:"";
}
function inferProductFromPdf(text,fileName,type){
  const hay=cleanPdfText(`${fileName.replace(/\.pdf$/i,"")} ${text}`);
  let name="";
  const vta=hay.match(/VTA\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9®+\- ]{2,45}/);
  if(vta)name=vta[0].replace(/(?:_D-de|Sicherheitsdatenblatt|Factsheet).*$/i,"").trim();
  if(!name)name=fileName.replace(/\.pdf$/i,"").replace(/[_-](?:D-de|DE)$/i,"").replace(/_/g," ").trim();
  const material=(hay.match(/Materialnummer\s*:?\s*(\d+)/i)||[])[1]||"";
  const date=(hay.match(/(?:Überarbeitet am|Stand|Version)\s*:?\s*(\d{2}\.\d{2}\.\d{4})/i)||[])[1]||"";
  const category=type==="sds"?(hay.match(/Fällungsmittel[^,.;]*,?\s*Flockungsmittel/i)?"Fällungs- und Flockungsmittel":"Chemisches Produkt"):(/mikroorganismen|bio-kost|biologisch/i.test(hay)?"Biologische Prozessunterstützung":"Sonstiges");
  const result={name,materialNumber:material,documentDate:date,category,shortDescription:"",applications:[],problems:[],benefits:[],technical:{},safety:{}};
  if(type==="sds"){
    result.applications=unique([/Fällungsmittel/i.test(hay)?"Fällung":"",/Flockungsmittel/i.test(hay)?"Flockung":""]);
    result.technical.state=(hay.match(/Aggregatzustand\s*:?\s*(flüssig|fest|gasförmig)/i)||[])[1]||"";
    result.technical.ph=(hay.match(/pH-Wert[^:<]{0,30}:?\s*(<\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?)/i)||[])[1]||"";
    result.technical.density=(hay.match(/Dichte\s*:?\s*(?:ca\.\s*)?([\d,.]+\s*g\/cm³)/i)||[])[1]||"";
    result.safety.signalWord=(hay.match(/Signalwort\s*:?\s*(Gefahr|Achtung)/i)||[])[1]||"";
    result.safety.hazardStatements=unique([...hay.matchAll(/\bH(\d{3})\b/g)].map(m=>`H${m[1]}`)).slice(0,12);
    result.safety.unNumber=(hay.match(/\bUN\s?(\d{4})\b/i)||[])[0]?.replace(/\s/g,"")||"";
  }else if(type==="factsheet"){
    const mappings=[["Blähschlamm",/blähschlamm/i],["Schwimmschlamm",/schwimmschlamm/i],["starke Fädigkeit",/starke fädigkeit/i],["lockere und instabile Flocken",/lockere.{0,5}instabile flocken/i]];
    result.problems=mappings.filter(([,re])=>re.test(hay)).map(([v])=>v);
    result.benefits=unique([/verbessert.{0,80}reinigungsleistung/i.test(hay)?"Verbessert die Reinigungsleistung":"",/verbessert.{0,100}schlammeigenschaften/i.test(hay)?"Verbessert die Schlammeigenschaften":"",/reduziert.{0,80}energie/i.test(hay)?"Reduziert Energie- und Produktverbrauch":"",/biologisch verträglich/i.test(hay)?"Biologisch verträglich":""]);
    result.applications=/kläranlage|abwasserreinigung/i.test(hay)?["Biologische Abwasserreinigung"]:[];
  }
  return result;
}

let productImportQueue=[];
let productImportProcessing=false;
function productImportQuality(type,inferred,rawText){
  const checks=[
    ["Produkt erkannt",Boolean(inferred.name)],
    ["Dokumenttyp erkannt",type!=="other"],
    ["Textschicht erkannt",Boolean(rawText)],
    ["Materialnummer erkannt",Boolean(inferred.materialNumber)],
    ["Dokumentstand erkannt",Boolean(inferred.documentDate)]
  ];
  if(type==="sds")checks.push(["Technische Daten erkannt",Boolean(inferred.technical.state||inferred.technical.ph||inferred.technical.density)],["Gefahrendaten erkannt",Boolean(inferred.safety.signalWord||(inferred.safety.hazardStatements||[]).length||inferred.safety.unNumber)]);
  if(type==="factsheet")checks.push(["Anwendungen erkannt",Boolean(inferred.applications.length)],["Probleme erkannt",Boolean(inferred.problems.length)],["Nutzen erkannt",Boolean(inferred.benefits.length)]);
  const score=Math.round(checks.filter(x=>x[1]).length/checks.length*100);
  return {score,checks};
}
function importStatusLabel(status){return ({queued:"Wartet",reading:"PDF wird eingelesen",analyzing:"Wissensanalyse läuft",ready:"Zur Prüfung bereit",saved:"Gespeichert",error:"Fehler"})[status]||status}
function renderProductImportQueueStatus(){
  const host=$("#productImportStatus");if(!host)return;
  const active=productImportQueue.filter(x=>x.status!=="saved");
  if(!productImportQueue.length){host.innerHTML="";return}
  const completed=productImportQueue.filter(x=>["ready","saved","error"].includes(x.status)).length;
  host.innerHTML=`<section class="import-queue"><div class="section-heading"><div><p class="eyebrow">PDF-Import</p><h2>Importwarteschlange</h2></div><strong>${completed}/${productImportQueue.length}</strong></div><div class="import-progress"><span style="width:${Math.round(completed/productImportQueue.length*100)}%"></span></div><div class="import-queue-list">${productImportQueue.map(item=>`<article><div class="import-state ${item.status}">${item.status==="ready"?"✓":item.status==="error"?"!":item.status==="saved"?"✓":"…"}</div><div><strong>${esc(item.file.name)}</strong><small>${importStatusLabel(item.status)}${item.quality?` · Qualität ${item.quality.score}%`:""}</small></div>${item.status==="ready"?`<button class="button secondary compact" type="button" data-review-import="${item.id}">Prüfen</button>`:""}</article>`).join("")}</div>${active.length?'<p class="muted-small">Die Verarbeitung läuft lokal weiter. Du kannst währenddessen andere Bereiche der App öffnen.</p>':'<button class="button secondary compact" id="clearImportQueue" type="button">Abgeschlossene Liste leeren</button>'}</section>`;
  $$('[data-review-import]').forEach(b=>b.onclick=()=>{const item=productImportQueue.find(x=>x.id===b.dataset.reviewImport);if(item)showProductImportReview(item.file,item.type,item.inferred,item.rawText,item)});
  const clear=$("#clearImportQueue");if(clear)clear.onclick=()=>{productImportQueue=[];renderProductImportQueueStatus()};
}
async function processProductImportQueue(){
  if(productImportProcessing)return;productImportProcessing=true;
  while(true){
    const item=productImportQueue.find(x=>x.status==="queued");if(!item)break;
    try{item.status="reading";renderProductImportQueueStatus();await new Promise(r=>setTimeout(r,30));
      item.tempFileId=item.tempFileId||`import-${item.id}`;await storeProductFile(item.tempFileId,item.file);
      item.rawText=await extractPdfTextBasic(item.file);item.status="analyzing";renderProductImportQueueStatus();await new Promise(r=>setTimeout(r,60));
      item.type=detectDocumentType(item.rawText,item.file.name);item.inferred=inferProductFromPdf(item.rawText,item.file.name,item.type);item.quality=productImportQuality(item.type,item.inferred,item.rawText);item.status="ready";
    }catch(error){console.error(error);item.status="error";item.error=error.message}
    renderProductImportQueueStatus();await new Promise(r=>setTimeout(r,20));
  }
  productImportProcessing=false;renderProductImportQueueStatus();
}
function enqueueProductPdfs(files){
  const pdfs=[...files].filter(f=>f.type==="application/pdf"||/\.pdf$/i.test(f.name));
  for(const file of pdfs)productImportQueue.push({id:makeId(),file,status:"queued",createdAt:new Date().toISOString()});
  renderProductImportQueueStatus();processProductImportQueue();
}

function openProductDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open("abwasser-product-documents-v1",1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("files"))req.result.createObjectStore("files")};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function storeProductFile(key,file){const db=await openProductDb();const record={blob:file instanceof Blob?file:new Blob([file],{type:file?.type||"application/pdf"}),fileName:file?.name||"Dokument.pdf",mimeType:file?.type||"application/pdf",size:file?.size||0,storedAt:new Date().toISOString()};return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put(record,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||new Error("IndexedDB-Transaktion abgebrochen"))}})}
async function getProductFile(key){const db=await openProductDb();return new Promise((resolve,reject)=>{const req=db.transaction("files","readonly").objectStore("files").get(key);req.onsuccess=()=>{const value=req.result;db.close();resolve(value?.blob instanceof Blob?value.blob:value instanceof Blob?value:null)};req.onerror=()=>{db.close();reject(req.error)}})}
async function deleteProductFile(key){const db=await openProductDb();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}

let plants=loadPlants();
let activePlantId=localStorage.getItem(STORAGE_ACTIVE_PLANT)||plants[0]?.id||"";
if(activePlantId&&!plants.some(p=>p.id===activePlantId))activePlantId=plants[0]?.id||"";

const state={
  view:"dashboard",category:null,query:"",selected:null,favoritesOnly:false,
  favorites:new Set(JSON.parse(localStorage.getItem(STORAGE_FAVORITES)||"[]")),
  openCategories:new Set(JSON.parse(localStorage.getItem(STORAGE_MENU)||"[]")),
  recent:JSON.parse(localStorage.getItem(STORAGE_RECENT)||"[]")
};

let isRestoringHistoryNavigation=false;
let historyNavigationInitialized=false;

const categories=[...new Set(calculators.map(item=>item.category))];
const workspace=$("#workspace");
const cards=$("#calculatorCards");
const menu=$("#categoryMenu");
const count=$("#calculatorCount");
const appView=$("#applicationView");

function loadPlants(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_PLANTS)||"[]");
    return Array.isArray(parsed)?parsed.map(normalizePlant):[];
  }catch{return []}
}
function savePlants(){
  try{
    const payload=JSON.stringify(plants);
    const previous=localStorage.getItem(STORAGE_PLANTS);
    if(previous)localStorage.setItem(STORAGE_BACKUP,previous);
    localStorage.setItem(STORAGE_PLANTS,payload);
    if(localStorage.getItem(STORAGE_PLANTS)!==payload)throw new Error("Speicherprüfung fehlgeschlagen");
    if(activePlantId)localStorage.setItem(STORAGE_ACTIVE_PLANT,activePlantId);
    else localStorage.removeItem(STORAGE_ACTIVE_PLANT);
    renderPlantSelector();
    return true;
  }catch(error){
    console.error("Anlagendaten konnten nicht gespeichert werden",error);
    alert("Die Anlagendaten konnten im Browser nicht gespeichert werden. Bitte freien Speicher prüfen und die Seite nicht schließen.");
    return false;
  }
}
function activePlant(){return plants.find(p=>p.id===activePlantId)||null}
function fmt(value,digits=3){
  const num=Number(String(value).replace(",","."));
  return Number.isFinite(num)?num.toLocaleString("de-DE",{
    minimumFractionDigits:0,
    maximumFractionDigits:digits
  }):"–";
}
function esc(value=""){
  return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}
function fmtInteger(value){
  const num=Number(String(value).replace(/\./g,"").replace(",","."));
  return Number.isFinite(num)?num.toLocaleString("de-DE",{maximumFractionDigits:0}):"–";
}
function processLabel(value){
  return mainProcessOptions.find(([key])=>key===value)?.[1]||value||"–";
}
function processStageLabels(values){
  return (Array.isArray(values)?values:[]).map(value=>processStageOptions.find(([key])=>key===value)?.[1]||value);
}
function normalizeTel(value=""){return String(value).replace(/[^\d+]/g,"")}
function telLink(value=""){
  const tel=normalizeTel(value);
  return tel?`<a class="contact-link" href="tel:${tel}">${esc(value)}</a>`:"–";
}
function mailLink(value=""){
  return value?`<a class="contact-link" href="mailto:${esc(value)}">${esc(value)}</a>`:"–";
}
function mailtoHref({to="",subject="",body=""}={}){
  const recipient=String(to||"").trim();
  const params=[];
  if(subject)params.push(`subject=${encodeURIComponent(String(subject))}`);
  if(body){
    const normalizedBody=String(body).replace(/\r?\n/g,"\r\n");
    params.push(`body=${encodeURIComponent(normalizedBody)}`);
  }
  return `mailto:${recipient}${params.length?`?${params.join("&")}`:""}`;
}
function openMailClient(mailData){
  const href=mailtoHref(mailData);
  // Direkte Navigation innerhalb des echten Klickereignisses funktioniert in
  // Safari/iOS/iPadOS, macOS-Browsern und Windows-Browsern am zuverlässigsten.
  window.location.assign(href);
}
function addCommunicationEntry(plant,{type,title,recipient="",subject="",note=""}){
  plant.communications=[...(plant.communications||[]),{
    id:makeId(),type,title,recipient,subject,note,
    createdAt:new Date().toISOString(),
    employee:employeeDisplayName()
  }];
  savePlants();
}
function bindCommunicationLinks(plant){
  $$('a[href^="tel:"]').forEach(link=>{
    if(link.dataset.communicationBound)return;
    link.dataset.communicationBound="true";
    link.addEventListener("click",()=>{
      const number=decodeURIComponent((link.getAttribute("href")||"").replace(/^tel:/i,""));
      addCommunicationEntry(plant,{type:"phone",title:"Anruf gestartet",recipient:number,note:link.textContent.trim()});
    });
  });
  $$('a[href^="mailto:"]:not([data-mail-action])').forEach(link=>{
    if(link.dataset.communicationBound)return;
    link.dataset.communicationBound="true";
    link.addEventListener("click",()=>{
      const href=link.getAttribute("href")||"";
      const recipient=decodeURIComponent(href.replace(/^mailto:/i,"").split("?")[0]);
      addCommunicationEntry(plant,{type:"mail",title:"E-Mail geöffnet",recipient,note:link.textContent.trim()});
    });
  });
}
function bindCommercialMailActions(plant){
  const actions={
    order:requestMailData(plant,"order"),
    offer:requestMailData(plant,"offer")
  };
  $$('[data-mail-action]').forEach(link=>{
    const actionType=link.dataset.mailAction;
    const data=actions[actionType];
    if(!data)return;
    link.href=mailtoHref(data);
    link.addEventListener("click",event=>{
      event.preventDefault();
      addCommunicationEntry(plant,{
        type:"mail",
        title:actionType==="order"?"Bestellanforderung geöffnet":"Angebotsanforderung geöffnet",
        recipient:data.to||"",
        subject:data.subject
      });
      openMailClient(data);
    });
  });
}
function requestMailData(plant,type){
  const isOrder=type==="order";
  const plantName=plant.master?.name||"Unbenannte Anlage";
  const plantNumber=plant.master?.internalNumber||"nicht hinterlegt";
  const operator=plant.operator?.name||"nicht hinterlegt";
  const location=[plant.address?.postalCode,plant.address?.city].filter(Boolean).join(" ")||"nicht hinterlegt";
  const sender=employeeDisplayName();
  const senderCompany=employeeProfile.company||"";
  const senderPhone=employeeProfile.mobile||employeeProfile.phone||"";
  const senderMail=employeeProfile.email||"";
  const subject=`${isOrder?"Bestellanforderung":"Angebotsanforderung"} – ${plantName} (${plantNumber})`;
  const requestFields=isOrder
    ?`Benötigtes Produkt / Ersatzteil:

Material- oder Artikelnummer:

Menge:

Gewünschter Liefertermin:

Lieferadresse / Ansprechpartner:

Kostenstelle / Projekt:
`
    :`Angefragtes Produkt / Leistung:

Ausgangssituation / Aufgabenstellung:

Gewünschter Leistungsumfang:

Benötigte Menge / Dimensionierung:

Gewünschter Angebots- oder Ausführungstermin:

Besondere technische Anforderungen:
`;
  const body=`Guten Tag,

bitte ${isOrder?"prüfen und die folgende Bestellung veranlassen":"für die nachfolgende Anlage ein Angebot erstellen"}.

ANLAGENDATEN
Anlage: ${plantName}
Anlagennummer: ${plantNumber}
Betreiber / Kunde: ${operator}
Standort: ${location}

ANFRAGE
${requestFields}
Zusätzliche Hinweise:

Vielen Dank.

Freundliche Grüße
${sender}${senderCompany?`
${senderCompany}`:""}${senderPhone?`
Telefon: ${senderPhone}`:""}${senderMail?`
E-Mail: ${senderMail}`:""}`;
  return {subject,body};
}
function renderCommercialMailActions(plant){
  const order=requestMailData(plant,"order");
  const offer=requestMailData(plant,"offer");
  return `<section class="dashboard-section compact-section commercial-mail-actions">
    <div class="section-heading"><div><p class="eyebrow">E-Mail-Schnellaktionen</p><h2>Anforderung vorbereiten</h2><p class="form-note">Öffnet das auf dem Gerät eingerichtete Standard-Mailprogramm. Empfänger und fehlende Angaben können dort ergänzt werden.</p></div></div>
    <div class="commercial-action-grid">
      <a class="commercial-action-card order" data-mail-action="order" href="${esc(mailtoHref(order))}"><span class="commercial-action-icon" aria-hidden="true">↗</span><div><strong>Bestellung anfordern</strong><small>Vorlage mit Anlagen-, Liefer- und Artikeldaten öffnen</small></div></a>
      <a class="commercial-action-card offer" data-mail-action="offer" href="${esc(mailtoHref(offer))}"><span class="commercial-action-icon" aria-hidden="true">€</span><div><strong>Angebot anfordern</strong><small>Technische Angebotsanfrage mit Anlagenbezug öffnen</small></div></a>
    </div>
  </section>`;
}
function parseLegacyGps(gps=""){
  const match=String(gps).trim().match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  return match?{latitude:match[1].replace(",","."),longitude:match[2].replace(",",".")}:{latitude:"",longitude:""};
}
function nextInternalNumber(){
  const maximum=plants.reduce((max,plant)=>{
    const match=String(plant.master?.internalNumber||"").match(/ANL-(\d+)/i);
    return Math.max(max,match?Number(match[1]):0);
  },0);
  return `ANL-${String(maximum+1).padStart(4,"0")}`;
}
function multiSelectField(name,label,selectedValues,options){
  const selected=new Set(Array.isArray(selectedValues)?selectedValues:[]);
  return `<fieldset class="field-label span-2 option-fieldset"><legend>${label}</legend>
    <div class="chip-grid">${options.map(([value,text])=>`<label class="check-chip"><input type="checkbox" name="${name}" value="${value}" ${selected.has(value)?"checked":""}><span>${text}</span></label>`).join("")}</div>
  </fieldset>`;
}


function procedureConfig(plant){
  const main=plant?.master?.mainProcess||"activated-sludge";
  const stages=new Set(Array.isArray(plant?.master?.processStages)?plant.master.processStages:[]);
  return {
    main,
    primary:stages.has("primary-clarification"),
    precipitation:["pre-precipitation","simultaneous-precipitation","post-precipitation"].some(x=>stages.has(x))||(plant?.dosingSystems||[]).some(x=>x.purpose==="precipitant"),
    digestion:stages.has("sludge-digestion"),
    dewatering:stages.has("sludge-dewatering")||Boolean(plant?.sludgeDewatering?.enabled),
    filtration:["sand-filtration","cloth-filtration","disc-filtration","microfiltration","ultrafiltration","activated-carbon","ozonation","uv"].some(x=>stages.has(x))
  };
}
function procedureSvg(plant,{interactive=true}={}){
  const c=procedureConfig(plant);
  const biological={
    "sbr":["SBR-Becken","sbr"],
    "mbr":["MBR / Membran","mbr"],
    "trickling-filter":["Tropfkörper","trickling"],
    "rotating-biological-contactor":["Scheibentauchkörper","rbc"],
    "constructed-wetland":["Pflanzenkläranlage","wetland"],
    "lagoon":["Abwasserteich","lagoon"]
  }[c.main]||["Belebungsbecken","activated"];
  const flow=[];
  flow.push({id:"inlet",label:"Zulauf",kind:"inlet"});
  if(c.primary)flow.push({id:"primary",label:"Vorklärung",kind:"clarifier"});
  flow.push({id:"biology",label:biological[0],kind:biological[1]});
  if(c.main!=="sbr"&&c.main!=="mbr"&&c.main!=="constructed-wetland"&&c.main!=="lagoon")flow.push({id:"secondary",label:"Nachklärung",kind:"clarifier"});
  if(c.filtration)flow.push({id:"filtration",label:"Weitergehende Reinigung",kind:"filter"});
  flow.push({id:"outlet",label:"Ablauf",kind:"outlet"});
  const gap=150, start=70, y=118;
  const width=Math.max(760,start*2+(flow.length-1)*gap);
  const nodes=flow.map((n,i)=>{
    const x=start+i*gap;
    let shape='';
    if(n.kind==='clarifier')shape=`<circle cx="${x}" cy="${y}" r="43" class="proc-water"/><g class="proc-rotor"><line x1="${x}" y1="${y}" x2="${x+36}" y2="${y}"/><circle cx="${x}" cy="${y}" r="5"/></g>`;
    else if(n.kind==='trickling')shape=`<circle cx="${x}" cy="${y}" r="43" class="proc-media"/><g class="proc-rotor"><line x1="${x-34}" y1="${y}" x2="${x+34}" y2="${y}"/><circle cx="${x}" cy="${y}" r="5"/></g>`;
    else if(n.kind==='outlet'||n.kind==='inlet')shape=`<rect x="${x-42}" y="${y-29}" width="84" height="58" rx="18" class="proc-${n.kind}"/>`;
    else shape=`<rect x="${x-55}" y="${y-43}" width="110" height="86" rx="22" class="proc-water"/>${['activated','sbr','mbr'].includes(n.kind)?`<g class="proc-bubbles">${[-30,-10,12,31].map((dx,j)=>`<circle cx="${x+dx}" cy="${y+24-j%2*8}" r="3"/>`).join('')}</g>`:''}${n.kind==='mbr'?`<g class="proc-membrane"><line x1="${x-18}" y1="${y-25}" x2="${x-18}" y2="${y+25}"/><line x1="${x}" y1="${y-25}" x2="${x}" y2="${y+25}"/><line x1="${x+18}" y1="${y-25}" x2="${x+18}" y2="${y+25}"/></g>`:''}`;
    return `<g class="procedure-node ${interactive?'is-interactive':''}" data-procedure-node="${n.id}" tabindex="${interactive?'0':'-1'}" role="${interactive?'button':'img'}" aria-label="${n.label}">${shape}<text x="${x}" y="${y+66}" text-anchor="middle">${n.label}</text></g>`;
  }).join('');
  const pipes=flow.slice(0,-1).map((_,i)=>{const x1=start+i*gap+55,x2=start+(i+1)*gap-55;return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="proc-pipe"/>`}).join('');
  const extras=[];
  if(c.precipitation){const x=start+Math.max(1,flow.findIndex(n=>n.id==='biology'))*gap;extras.push(`<g class="procedure-node ${interactive?'is-interactive':''}" data-procedure-node="precipitation" tabindex="${interactive?'0':'-1'}"><rect x="${x-38}" y="12" width="76" height="48" rx="15" class="proc-dose"/><path d="M ${x} 60 L ${x} 78" class="proc-dose-line"/><text x="${x}" y="4" text-anchor="middle">Fällung</text></g>`)}
  if(c.digestion||c.dewatering){let x=start+Math.max(2,flow.length-2)*gap; if(c.digestion)extras.push(`<g class="procedure-node ${interactive?'is-interactive':''}" data-procedure-node="digestion" tabindex="${interactive?'0':'-1'}"><path d="M ${x-38} 244 L ${x-30} 194 Q ${x} 160 ${x+30} 194 L ${x+38} 244 Z" class="proc-sludge"/><text x="${x}" y="267" text-anchor="middle">Faulung</text></g>`); if(c.dewatering)extras.push(`<g class="procedure-node ${interactive?'is-interactive':''}" data-procedure-node="dewatering" tabindex="${interactive?'0':'-1'}"><rect x="${x+75}" y="194" width="100" height="58" rx="17" class="proc-sludge"/><text x="${x+125}" y="277" text-anchor="middle">Entwässerung</text></g>`)}
  return `<div class="procedure-visual" style="--procedure-width:${width}px"><svg viewBox="0 0 ${width} 290" role="img" aria-label="Dynamisches Verfahrensschema">${pipes}${nodes}${extras.join('')}</svg></div>`;
}
function procedureCard(plant,{preview=false}={}){
  return `<section class="procedure-card ${preview?'procedure-preview-card':''}"><div class="section-heading"><div><p class="eyebrow">Digitales Anlagenschema</p><h2>${preview?'Live-Vorschau':esc(processLabel(plant.master?.mainProcess))}</h2><p class="form-note">Die Darstellung wird automatisch aus Hauptverfahren und Verfahrensstufen aufgebaut.</p></div><button type="button" class="text-button procedure-pause">Animation pausieren</button></div>${procedureSvg(plant)}<div class="procedure-selection" aria-live="polite">Anlagenteil antippen, um ihn hervorzuheben.</div></section>`;
}
function bindProcedureCard(root=document){
  root.querySelectorAll('.procedure-card').forEach(card=>{
    card.querySelector('.procedure-pause')?.addEventListener('click',e=>{const paused=card.classList.toggle('paused');e.currentTarget.textContent=paused?'Animation starten':'Animation pausieren'});
    card.querySelectorAll('[data-procedure-node]').forEach(node=>{
      const activate=()=>{card.querySelectorAll('[data-procedure-node]').forEach(n=>n.classList.remove('selected'));node.classList.add('selected');const label=node.getAttribute('aria-label')||node.querySelector('text')?.textContent||'Anlagenteil';card.querySelector('.procedure-selection').textContent=`${label} ausgewählt`};
      node.addEventListener('click',activate);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}});
    });
  });
}

function locationQuery(plant){
  const latitude=String(plant.address?.latitude||"").replace(",",".").trim();
  const longitude=String(plant.address?.longitude||"").replace(",",".").trim();
  if(latitude&&longitude)return `${latitude},${longitude}`;
  const gps=(plant.address?.gps||"").trim();
  if(gps)return gps;
  return [
    plant.address?.street,
    plant.address?.postalCode,
    plant.address?.city,
    plant.address?.country
  ].filter(Boolean).join(", ");
}
function googleMapsUrls(plant){
  const query=encodeURIComponent(locationQuery(plant));
  return {
    show:`https://www.google.com/maps/search/?api=1&query=${query}`,
    navigate:`https://www.google.com/maps/dir/?api=1&destination=${query}`,
    embed:`https://www.google.com/maps?q=${query}&output=embed`,
    street:`https://www.google.com/maps/search/?api=1&query=${query}`
  };
}
function mapsButtons(plant){
  const urls=googleMapsUrls(plant);
  return `<div class="map-actions">
    <a class="button primary" href="${urls.navigate}" target="_blank" rel="noopener">Navigation starten</a>
    <a class="button secondary" href="${urls.show}" target="_blank" rel="noopener">Standort in Google Maps</a>
    <a class="button secondary" href="${urls.street}" target="_blank" rel="noopener">Street View prüfen</a>
  </div>`;
}

function enableDecimalInputs(root=document){
  root.querySelectorAll('input[type="number"]').forEach(input=>{
    // Explizit gesetzte Schrittweiten (z. B. GPS mit step="any") nicht überschreiben.
    if(!input.hasAttribute("step"))input.step="0.001";
    input.inputMode="decimal";
  });
}
function persistMenu(){localStorage.setItem(STORAGE_MENU,JSON.stringify([...state.openCategories]))}
function filtered(){
  const query=state.query.trim().toLowerCase();
  return calculators.filter(item=>
    (!state.category||item.category===state.category)&&
    (!state.favoritesOnly||state.favorites.has(item.id))&&
    (!query||`${item.name} ${item.short} ${item.category}`.toLowerCase().includes(query))
  );
}
function categoryCount(category){return calculators.filter(item=>item.category===category).length}
function renderPlantSelector(){
  const select=$("#activePlantSelect");
  select.innerHTML=plants.length
    ? plants.map(p=>`<option value="${p.id}" ${p.id===activePlantId?"selected":""}>${esc(p.master.name||"Unbenannte Anlage")}</option>`).join("")
    : `<option value="">Keine Anlage angelegt</option>`;
  select.disabled=!plants.length;
  const plant=activePlant();
  $("#activePlantBadge").textContent=plant?plant.master.name||"Unbenannte Anlage":"Keine Anlage ausgewählt";
}
function renderCategoryMenu(){
  if(!menu)return updatePrimaryNavigation();
  menu.innerHTML=categories.map(category=>{
    const meta=categoryMeta[category]||{icon:"•",description:""};
    const active=state.category===category&&!state.favoritesOnly;
    return `<button class="category-nav-item ${active?"active":""}" type="button" data-category="${category}" title="${esc(meta.description||category)}">
      <span class="category-nav-icon">${meta.icon}</span>
      <span class="category-nav-copy"><strong>${category}</strong><small>${esc(meta.description||"")}</small></span>
      <span class="category-nav-count">${categoryCount(category)}</span>
    </button>`;
  }).join("");
  $$('[data-category]').forEach(button=>button.onclick=()=>{showCategory(button.dataset.category);closeMobileSidebar()});
  updatePrimaryNavigation();
}
function updatePrimaryNavigation(){
  $$('[data-primary-view]').forEach(button=>{
    const target=button.dataset.primaryView;
    const calculatorActive=target==="calculators"&&state.view==="calculators";
    const plantActive=target==="plants"&&["plants","plantForm","plantDashboard","limits","traffic"].includes(state.view);
    button.classList.toggle("active",calculatorActive||plantActive);
  });
  $$('[data-global-view]').forEach(button=>{
    const target=button.dataset.globalView;
    const active=(target==="today"&&state.view==="dashboard")||state.view===`global-${target}`;
    button.classList.toggle("active",active);
  });
  refreshGlobalNavigationBadges();
}
async function refreshGlobalNavigationBadges(){
  const badge=$("#tenderUnreadBadge");
  if(!badge) return;
  try{
    const unread=await getTenderUnreadCount();
    badge.textContent=String(unread||0);
    badge.classList.toggle("hidden",!unread);
  }catch{
    badge.textContent="0";
    badge.classList.add("hidden");
  }
}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  localStorage.setItem(STORAGE_FAVORITES,JSON.stringify([...state.favorites]));
  renderCards();renderCategoryMenu();if(state.view==="dashboard")renderDashboard();
}
function renderCards(){
  const list=filtered();
  count.textContent=`${list.length} von ${calculators.length}`;
  cards.innerHTML=list.length?list.map(item=>`<article class="calculator-card ${state.selected===item.id?"active":""}" data-id="${item.id}" role="button" tabindex="0">
    <span class="category">${item.category}</span>
    <button type="button" class="favorite ${state.favorites.has(item.id)?"active":""}" data-favorite="${item.id}">★</button>
    <h3>${item.name}</h3><p>${item.short}</p>
  </article>`).join(""):`<div class="no-results"><h3>Keine Treffer</h3><p>Suchbegriff oder Filter ändern.</p></div>`;
  $$(".calculator-card").forEach(card=>{
    card.onclick=e=>{if(!e.target.closest(".favorite"))selectCalculator(card.dataset.id)};
    card.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&!e.target.closest(".favorite")){e.preventDefault();selectCalculator(card.dataset.id)}};
  });
  $$(".favorite").forEach(button=>button.onclick=e=>{e.stopPropagation();toggleFavorite(button.dataset.favorite)});
}
function setBreadcrumb(current=""){
  $("#breadcrumbCurrent").textContent=current;
  $("#breadcrumbSeparator").classList.toggle("hidden",!current);
}
function setView(view){
  state.view=view;
  $("#dashboard").classList.toggle("hidden",view!=="dashboard");
  $("#calculatorView").classList.toggle("hidden",view!=="calculators");
  const applicationVisible=["plants","plantForm","plantDashboard","limits","traffic","profile","profileForm","product-editor","product-detail","product-import"].includes(view)||view.startsWith("global-");
  appView.classList.toggle("hidden",!applicationVisible);
  $("#printButton").classList.toggle("hidden",view!=="calculators"||!state.selected);
  updatePrimaryNavigation();
  syncBrowserHistory(view);
}

function currentHistoryNavigationState(view=state.view){
  return {
    appNav:true,
    view,
    activePlantId:activePlantId||"",
    globalPage:localStorage.getItem(STORAGE_GLOBAL_PAGE)||"today",
    plantPage:localStorage.getItem(STORAGE_PLANT_PAGE)||"overview",
    category:state.category||"",
    query:state.query||"",
    selected:state.selected||"",
    favoritesOnly:Boolean(state.favoritesOnly)
  };
}
function historyNavigationKey(nav){
  return JSON.stringify([
    nav.view,
    nav.activePlantId,
    nav.globalPage,
    nav.plantPage,
    nav.category,
    nav.query,
    nav.selected,
    nav.favoritesOnly
  ]);
}
function syncBrowserHistory(view){
  if(typeof window==="undefined"||!window.history||isRestoringHistoryNavigation)return;
  const nav=currentHistoryNavigationState(view);
  const key=historyNavigationKey(nav);
  const currentKey=window.history.state?.appNavKey;
  if(!historyNavigationInitialized){
    window.history.replaceState({...nav,appNavKey:key},"");
    historyNavigationInitialized=true;
    return;
  }
  if(currentKey===key)return;
  window.history.pushState({...nav,appNavKey:key},"");
}
function restoreNavigationFromHistory(nav){
  if(!nav?.appNav)return;
  isRestoringHistoryNavigation=true;
  try{
    if(nav.activePlantId&&plants.some(p=>p.id===nav.activePlantId)){
      activePlantId=nav.activePlantId;
      savePlants();
    }
    if(nav.view==="dashboard")return showHome();
    if(nav.view==="calculators"){
      state.query=nav.query||"";
      $("#searchInput").value=state.query;
      if(nav.favoritesOnly)return showFavorites();
      if(nav.selected&&calculators.some(c=>c.id===nav.selected))return selectCalculator(nav.selected);
      if(nav.category)return showCategory(nav.category);
      return state.query?showSearchResults():showAllCalculators();
    }
    if(nav.view.startsWith("global-"))return showGlobalPage(nav.view.slice(7));
    if(nav.view==="plants")return showApplication("plants");
    if(nav.view==="plantForm")return showPlantForm();
    if(nav.view==="plantDashboard")return showPlantDashboard(nav.plantPage||"overview");
    if(nav.view==="limits")return showLimits();
    if(nav.view==="traffic")return showTraffic();
    if(nav.view==="profile")return showProfile();
    if(nav.view==="profileForm")return showProfileForm();
    if(nav.view==="global-documents")return showDocuments();
    if(nav.view==="global-products")return showProducts();
    showGlobalPage(nav.globalPage||"today");
  }finally{
    isRestoringHistoryNavigation=false;
  }
}
function showHome(){
  state.category=null;state.query="";state.selected=null;state.favoritesOnly=false;
  $("#searchInput").value="";$("#favoriteFilter").textContent="★ Favoriten";
  setView("dashboard");setBreadcrumb("");renderDashboard();renderCategoryMenu();window.scrollTo({top:0,behavior:"smooth"});
}
function showCategory(category){
  state.category=category;state.favoritesOnly=false;state.selected=null;
  $("#favoriteFilter").textContent="★ Favoriten";setView("calculators");
  const meta=categoryMeta[category]||{};
  $("#catalogEyebrow").textContent="Kategorie";$("#catalogTitle").textContent=category;
  $("#catalogDescription").textContent=meta.description||"Verfügbare Rechner";
  workspace.innerHTML=`<div class="empty-state"><h2>Rechner auswählen</h2><p>Wähle ein Werkzeug aus der Kategorie ${category}.</p></div>`;
  setBreadcrumb(category);renderCards();renderCategoryMenu();
}
function showAllCalculators(){
  state.category=null;state.favoritesOnly=false;state.selected=null;state.query="";
  $("#searchInput").value="";$("#favoriteFilter").textContent="★ Favoriten";setView("calculators");
  $("#catalogEyebrow").textContent="Werkzeuge";$("#catalogTitle").textContent="Alle Rechner";
  $("#catalogDescription").textContent="Alle verfügbaren Rechner, gegliedert nach Fachgebiet.";
  workspace.innerHTML=`<div class="empty-state"><h2>Rechner auswählen</h2><p>Wähle ein Werkzeug aus den Karten.</p></div>`;
  setBreadcrumb("Alle Rechner");renderCards();renderCategoryMenu();
}
function showSearchResults(){
  state.category=null;state.favoritesOnly=false;state.selected=null;setView("calculators");
  $("#catalogEyebrow").textContent="Suche";$("#catalogTitle").textContent="Suchergebnisse";
  $("#catalogDescription").textContent=state.query?`Treffer für „${state.query}“`:"Alle verfügbaren Rechner";
  workspace.innerHTML=`<div class="empty-state"><h2>Rechner auswählen</h2><p>Wähle einen Treffer aus.</p></div>`;
  setBreadcrumb("Suche");renderCards();renderCategoryMenu();
}
function showFavorites(){
  state.category=null;state.favoritesOnly=true;state.selected=null;setView("calculators");
  $("#catalogEyebrow").textContent="Schnellzugriff";$("#catalogTitle").textContent="Favoriten";
  $("#catalogDescription").textContent="Deine lokal auf diesem Gerät gespeicherten Rechner.";
  workspace.innerHTML=`<div class="empty-state"><h2>Favorit auswählen</h2><p>Markiere Rechner über den Stern.</p></div>`;
  setBreadcrumb("Favoriten");$("#favoriteFilter").textContent="Alle Rechner";renderCards();renderCategoryMenu();
}
function selectCalculator(id){
  const calculator=calculators.find(item=>item.id===id);if(!calculator)return;
  state.recent=[id,...state.recent.filter(itemId=>itemId!==id)].slice(0,6);
  localStorage.setItem(STORAGE_RECENT,JSON.stringify(state.recent));
  state.selected=id;state.category=calculator.category;state.favoritesOnly=false;setView("calculators");
  const meta=categoryMeta[calculator.category]||{};
  $("#catalogEyebrow").textContent="Kategorie";$("#catalogTitle").textContent=calculator.category;
  $("#catalogDescription").textContent=meta.description||"Verfügbare Rechner";
  setBreadcrumb(`${calculator.category} › ${calculator.name}`);renderCards();renderCategoryMenu();
  calculator.render(workspace);injectProfileHelper(workspace);
  $("#printButton").classList.remove("hidden");
  if(innerWidth<1051)workspace.scrollIntoView({behavior:"smooth",block:"start"});
}
function injectProfileHelper(container){
  const plant=activePlant();if(!plant)return;
  const header=container.querySelector("h2");
  if(!header)return;
  const box=document.createElement("div");
  box.className="profile-helper";
  box.innerHTML=`<strong>Aktive Anlage: ${esc(plant.master.name||"Unbenannte Anlage")}</strong>
    <span>Profilwerte stehen zentral zur Verfügung. Eine automatische Feldzuordnung wird schrittweise je Rechner ergänzt.</span>
    <button type="button">Anlagenprofil öffnen</button>`;
  box.querySelector("button").onclick=()=>showPlantDashboard();
  header.insertAdjacentElement("afterend",box);
}
function quickCard({icon,title,text,action,label,status}){
  return `<article class="dashboard-card ${status==="planned"?"planned":""}">
    <span class="dashboard-icon">${icon}</span><div><h3>${title}</h3><p>${text}</p></div>
    ${status==="planned"?`<span class="planned-badge">Geplant</span>`:`<button type="button" class="dashboard-link" data-dashboard-action="${action}">${label||"Öffnen"} →</button>`}
  </article>`;
}
function greeting(){
  const hour=new Date().getHours();
  return hour<11?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend";
}
function upcomingVisits(limit=4){
  const now=Date.now();
  return plants.flatMap(plant=>(plant.visits||[]).map(visit=>({plant,visit,date:isoLocalToDate(visit.start)})))
    .filter(item=>item.date&&item.date.getTime()>=now&&item.visit.status!=="done"&&item.visit.status!=="cancelled")
    .sort((a,b)=>a.date-b.date).slice(0,limit);
}
function dashboardTrafficTally(){
  const tally={green:0,yellow:0,red:0,gray:0};
  plants.forEach(plant=>{
    const levels=evaluations(plant).map(item=>item.evaluation.level);
    let level="gray";
    if(levels.includes("red"))level="red";
    else if(levels.includes("yellow"))level="yellow";
    else if(levels.includes("green"))level="green";
    tally[level]++;
  });
  return tally;
}
const plantZones={
  inlet:{title:"Zulauf und Vorklärung",subtitle:"Frachten, Konzentrationen und hydraulische Belastung",icon:"↘",calculators:["load","concentration","hrt"]},
  biology:{title:"Biologische Stufe",subtitle:"Belebung, Biomasse und Absetzverhalten",icon:"◎",calculators:["loading","sludge-age","svi"]},
  precipitation:{title:"Fällmittelstation",subtitle:"Phosphorelimination und Chemikaliendosierung",icon:"◆",calculators:["precipitation","dose","cost"]},
  clarifier:{title:"Nachklärung",subtitle:"Absetzverhalten und hydraulische Aufenthaltszeit",icon:"◉",calculators:["svi","sludge-age","hrt"]},
  sludge:{title:"Schlammbehandlung",subtitle:"Feststoffmengen, Lagerung und Reichweiten",icon:"≋",calculators:["dw-throughput","dw-cake","tank"]},
  dewatering:{title:"Schlammentwässerung",subtitle:"Maschinenleistung, Polymer und Entsorgung",icon:"▦",calculators:["dw-polymer","dw-retention","dw-disposal","dw-compare"]}
};
function renderPlantAnimation(){
  return `<div class="plant-animation" aria-label="Interaktive schematische Kläranlage aus der Vogelperspektive">
    <img src="plant-hero-base.png" alt="Kläranlage aus der Vogelperspektive. Anlagenteile können angetippt werden.">
    <div class="water-flow flow-a"></div><div class="water-flow flow-b"></div><div class="water-flow flow-c"></div>
    <span class="clarifier-rotor rotor-a"></span><span class="clarifier-rotor rotor-b"></span><span class="clarifier-rotor rotor-c"></span>
    <span class="aeration-bubbles bubbles-a"></span><span class="aeration-bubbles bubbles-b"></span>
    <div class="plant-hotspots" aria-label="Anlagenteile">
      ${Object.entries(plantZones).map(([id,zone])=>`<button type="button" class="plant-hotspot zone-${id}" data-plant-zone="${id}" aria-label="${zone.title} öffnen"><span>${zone.title}</span></button>`).join("")}
    </div>
    <p class="plant-touch-hint">Anlagenteil antippen</p>
    <button class="animation-toggle" id="animationToggle" type="button">Ⅱ Animation pausieren</button>
  </div>`;
}
function renderPlantSheet(){
  return `<div class="plant-sheet-backdrop" id="plantSheetBackdrop" hidden></div>
    <section class="plant-sheet" id="plantSheet" role="dialog" aria-modal="true" aria-labelledby="plantSheetTitle" hidden>
      <div class="plant-sheet-handle" aria-hidden="true"></div>
      <header><div class="plant-sheet-icon" id="plantSheetIcon">◎</div><div><p class="eyebrow">Anlagenbereich</p><h2 id="plantSheetTitle"></h2><p id="plantSheetSubtitle"></p></div><button type="button" class="plant-sheet-close" id="plantSheetClose" aria-label="Bereich schließen">×</button></header>
      <div class="plant-sheet-actions" id="plantSheetActions"></div>
      <button type="button" class="plant-sheet-cancel" id="plantSheetCancel">Schließen</button>
    </section>`;
}
function openPlantSheet(zoneId){
  const zone=plantZones[zoneId];if(!zone)return;
  const sheet=$("#plantSheet"),backdrop=$("#plantSheetBackdrop");
  $("#plantSheetTitle").textContent=zone.title;$("#plantSheetSubtitle").textContent=zone.subtitle;$("#plantSheetIcon").textContent=zone.icon;
  $("#plantSheetActions").innerHTML=zone.calculators.map(id=>{const item=calculators.find(c=>c.id===id);return item?`<button type="button" data-sheet-calculator="${item.id}"><span><strong>${item.name}</strong><small>${item.short}</small></span><b>›</b></button>`:""}).join("");
  sheet.hidden=false;backdrop.hidden=false;requestAnimationFrame(()=>{sheet.classList.add("open");backdrop.classList.add("open")});
  document.body.classList.add("sheet-open");
  $$("[data-plant-zone]").forEach(button=>button.classList.toggle("selected",button.dataset.plantZone===zoneId));
  $$("[data-sheet-calculator]").forEach(button=>button.onclick=()=>{closePlantSheet();selectCalculator(button.dataset.sheetCalculator)});
  setTimeout(()=>$("#plantSheetClose")?.focus(),220);
}
function closePlantSheet(){
  const sheet=$("#plantSheet"),backdrop=$("#plantSheetBackdrop");if(!sheet||sheet.hidden)return;
  sheet.classList.remove("open");backdrop.classList.remove("open");document.body.classList.remove("sheet-open");
  $$("[data-plant-zone]").forEach(button=>button.classList.remove("selected"));
  setTimeout(()=>{sheet.hidden=true;backdrop.hidden=true},220);
}
function renderDashboard(){
  const plant=activePlant();
  const now=new Date();
  const dayKey=now.toISOString().slice(0,10);
  const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const displayName=employeeProfile.firstName?.trim()||employeeDisplayName();
  const personalName=displayName&&displayName!="Profil"?displayName:"Kollegin/Kollege";
  const visits=upcomingVisits(6);
  const visitsToday=visits.filter(item=>item.date.toISOString().slice(0,10)===dayKey);
  const nextVisit=visits[0]||null;
  const openTasks=plants.flatMap(plantItem=>(plantItem.actions||[])
    .filter(action=>action.status!=="done")
    .map(action=>({
      plant:plantItem,
      action,
      due:action.dueDate?new Date(`${action.dueDate}T12:00:00`):null
    })))
    .sort((a,b)=>{
      const aTime=a.due?.getTime()??Number.POSITIVE_INFINITY;
      const bTime=b.due?.getTime()??Number.POSITIVE_INFINITY;
      return aTime-bTime;
    });
  const tasksToday=openTasks.filter(item=>item.action.dueDate===dayKey);
  const overdueTasks=openTasks.filter(item=>item.due&&item.due.getTime()<startOfDay);
  const highPriorityTasks=openTasks.filter(item=>item.action.priority==="high");
  const salesReminders=salesReminderAlerts(4);
  const agenda=[
    ...visitsToday.map(item=>({
      kind:"visit",
      ts:item.date.getTime(),
      label:`${item.date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} · ${item.plant.master.name||"Kläranlage"}`,
      detail:item.visit.title||item.visit.purpose||"Besuchstermin",
      plantId:item.plant.id,
      page:"visits"
    })),
    ...tasksToday.map(item=>({
      kind:"task",
      ts:startOfDay+12*60*60*1000,
      label:`Heute fällig · ${item.plant.master.name||"Kläranlage"}`,
      detail:item.action.title,
      plantId:item.plant.id,
      page:"tasks"
    })),
    ...overdueTasks.slice(0,2).map(item=>({
      kind:"overdue",
      ts:startOfDay-1,
      label:`Überfällig seit ${formatDate(item.action.dueDate)}`,
      detail:item.action.title,
      plantId:item.plant.id,
      page:"tasks"
    }))
  ].sort((a,b)=>a.ts-b.ts).slice(0,7);
  $("#dashboard").innerHTML=`
    <section class="today-dashboard-hero">
      <div>
        <p class="eyebrow">Persönliches Dashboard</p>
        <h1>${greeting()}, ${esc(personalName)}.</h1>
        <p>Dein kompakter Tagesfokus mit Terminen, Aufgaben und direktem Zugriff auf die wichtigsten Aktionen.</p>
      </div>
      <div class="today-dashboard-meta">
        <span>${now.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</span>
        <strong>${now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</strong>
      </div>
      <div class="today-dashboard-actions">
        <button class="button primary" data-dashboard-action="${plant?"plantDashboard":"plantForm"}" type="button">${plant?"Aktive Anlage öffnen":"Anlage anlegen"}</button>
        <button class="button secondary" data-dashboard-action="global:appointments" type="button">Termine anzeigen</button>
        <button class="button secondary" data-dashboard-action="global:tasks-global" type="button">Aufgaben anzeigen</button>
      </div>
    </section>

    <section class="plant-visual-card today-plant-visual-card">
      ${renderPlantAnimation()}
    </section>

    <section class="today-kpi-grid" aria-label="Tageskennzahlen">
      <article class="today-kpi-card">
        <span>Termine heute</span>
        <strong>${visitsToday.length}</strong>
        <small>${nextVisit?`Nächster Termin um ${nextVisit.date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}`:"Heute keine weiteren Termine"}</small>
      </article>
      <article class="today-kpi-card">
        <span>Offene Aufgaben</span>
        <strong>${openTasks.length}</strong>
        <small>${highPriorityTasks.length} mit hoher Priorität</small>
      </article>
      <article class="today-kpi-card warning">
        <span>Überfällig</span>
        <strong>${overdueTasks.length}</strong>
        <small>${overdueTasks.length?"Bitte heute priorisieren":"Keine überfälligen Punkte"}</small>
      </article>
    </section>

    <section class="cockpit-panel sales-reminder-panel">
      <div class="panel-title"><div><p class="eyebrow">Kundenbindung</p><h2>Wiederbestell-Reminder</h2></div></div>
      ${salesReminders.length?`<div class="today-alerts">${salesReminders.map(item=>`<button type="button" class="today-alert ${item.level} today-alert-button" data-dashboard-open-plant="${item.plantId}" data-dashboard-open-page="sales"><b>${item.level==="red"?"!":"•"}</b><div><strong>${esc(item.plantName)}</strong><span>${esc(item.opportunityTitle)} · Letzte ${esc(item.referenceLabel)} am ${esc(item.referenceDateLabel)} (${esc(item.referenceDaysLabel)})</span></div></button>`).join("")}</div>`:`<div class="today-ok">Keine aktiven Wiederbestell-Reminder aus Bestellung und Belieferung.</div>`}
    </section>

    <section class="today-personal-grid">
      <article class="cockpit-panel">
        <div class="panel-title"><div><p class="eyebrow">Mein Tag</p><h2>Agenda</h2></div></div>
        <div class="today-agenda-list">
          ${agenda.length?agenda.map(item=>`<button type="button" class="today-agenda-item ${item.kind}" data-dashboard-open-plant="${item.plantId}" data-dashboard-open-page="${item.page}"><span>${item.kind==="visit"?"Termin":item.kind==="task"?"Aufgabe":"Überfällig"}</span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></button>`).join(""):`<div class="dashboard-empty">Für heute sind noch keine Termine oder fälligen Aufgaben geplant.</div>`}
        </div>
      </article>

      <article class="cockpit-panel">
        <div class="panel-title"><div><p class="eyebrow">Priorität</p><h2>Aufgabenfokus</h2></div><button data-dashboard-action="global:tasks-global" type="button">Alle Aufgaben →</button></div>
        <div class="today-focus-list">
          ${openTasks.slice(0,5).length?openTasks.slice(0,5).map(({plant:taskPlant,action})=>`<button type="button" class="today-focus-item ${action.priority==="high"?"high":""}" data-dashboard-open-plant="${taskPlant.id}" data-dashboard-open-page="tasks"><strong>${esc(action.title)}</strong><small>${esc(taskPlant.master.name||"Kläranlage")} · ${action.dueDate?`Fällig ${formatDate(action.dueDate)}`:"Ohne Fälligkeit"}</small></button>`).join(""):`<div class="dashboard-empty">Keine offenen Aufgaben vorhanden.</div>`}
        </div>
      </article>
    </section>

    ${renderPlantSheet()}`;
  bindDashboardActions();
  const animationToggle=$("#animationToggle");
  if(animationToggle)animationToggle.onclick=()=>{
    const visual=animationToggle.closest(".plant-animation");
    const paused=visual.classList.toggle("paused");
    animationToggle.textContent=paused?"▶ Animation starten":"Ⅱ Animation pausieren";
  };
  $$("[data-plant-zone]").forEach(button=>button.onclick=()=>openPlantSheet(button.dataset.plantZone));
  $("#plantSheetClose").onclick=closePlantSheet;$("#plantSheetCancel").onclick=closePlantSheet;$("#plantSheetBackdrop").onclick=closePlantSheet;
}
function bindDashboardActions(){
  $$('[data-dashboard-action]').forEach(button=>button.onclick=()=>{
    const action=button.dataset.dashboardAction;
    if(action?.startsWith("global:"))return showGlobalPage(action.slice(7));
    if(action==="favorites")showFavorites();
    else if(action==="allCalculators")showAllCalculators();
    else if(action==="search"){showAllCalculators();$("#searchInput").focus();}
    else if(["plants","plantForm","plantDashboard","limits","traffic"].includes(action))showApplication(action);
    else showCategory(action);
  });
  $$('[data-dashboard-calculator]').forEach(button=>button.onclick=()=>selectCalculator(button.dataset.dashboardCalculator));
  $$('[data-dashboard-open-plant]').forEach(button=>button.onclick=()=>{
    const plantId=button.dataset.dashboardOpenPlant;
    if(!plantId)return;
    activePlantId=plantId;
    savePlants();
    showPlantDashboard(button.dataset.dashboardOpenPage||"overview");
  });
}

function globalPageHeader(eyebrow,title,subtitle=""){
  return `<section class="page-header global-page-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${subtitle?`<p class="subtitle">${esc(subtitle)}</p>`:""}</div></section>`;
}
function renderGlobalPlaceholder(icon,title,text,next=""){
  return `${globalPageHeader("Arbeitsbereich",title,text)}<section class="global-placeholder"><span class="global-placeholder-icon">${icon}</span><h2>${esc(title)}</h2><p>${esc(text)}</p>${next?`<small>${esc(next)}</small>`:""}</section>`;
}

const DOCUMENT_TYPES=[
  ["sds","Sicherheitsdatenblatt"],["factsheet","Factsheet"],["product-data","Produktdatenblatt"],["technical-sheet","Technisches Merkblatt"],
  ["offer","Angebot"],["order-confirmation","Auftragsbestätigung"],["purchase-order","Bestellung"],["delivery-note","Lieferschein"],
  ["invoice","Rechnung"],["credit-note","Gutschrift"],["contract","Vertrag"],["tender","Ausschreibung"],
  ["lab-report","Laborbericht"],["trial-report","Versuchsbericht"],["visit-report","Besuchsbericht"],["certificate","Zertifikat"],["other","Sonstiges"]
];
const DOCUMENT_STATUSES=[["imported","Eingang"],["review","In Prüfung"],["approved","Freigegeben"],["archived","Archiv"]];
function normalizeDocument(d={}){return {id:d.id||makeId(),fileName:d.fileName||"",mimeType:d.mimeType||"application/pdf",size:Number(d.size)||0,importedAt:d.importedAt||new Date().toISOString(),updatedAt:d.updatedAt||new Date().toISOString(),type:d.type||"other",status:d.status||"imported",documentNumber:d.documentNumber||"",documentDate:d.documentDate||"",version:d.version||"",language:d.language||"DE",sender:d.sender||"",recipient:d.recipient||"",customer:d.customer||"",plantId:d.plantId||"",project:d.project||"",productIds:Array.isArray(d.productIds)?d.productIds:[],tags:Array.isArray(d.tags)?d.tags:[],notes:d.notes||"",textPreview:String(d.textPreview||d.rawText||"").slice(0,4000),textExtracted:Boolean(d.textExtracted),reviewedAt:d.reviewedAt||"",reviewer:d.reviewer||"",extracted:d.extracted||{},source:d.source||"PDF-Import",storageState:d.storageState||"stored",storageError:d.storageError||""}}
let documents=[];
let documentSaveQueue=Promise.resolve();
function saveDocuments(){
  documentSaveQueue=documentSaveQueue.then(()=>documentRepository.replaceAll(documents)).catch(e=>{console.error(e);alert("Dokumentmetadaten konnten nicht in IndexedDB gespeichert werden.")});
  return true;
}
async function loadDocumentsFromDatabase(){documents=(await documentRepository.list()).map(normalizeDocument);return documents}
function documentById(id){return documents.find(d=>d.id===id)||null}
function docTypeLabel(type){return DOCUMENT_TYPES.find(x=>x[0]===type)?.[1]||"Sonstiges"}
function docStatusLabel(status){return DOCUMENT_STATUSES.find(x=>x[0]===status)?.[1]||status}
function detectGeneralDocumentType(text,name){const h=`${name} ${text}`.toLowerCase();if(/sicherheitsdatenblatt|safety data sheet|abschnitt 1.*stoff/i.test(h))return "sds";if(/auftragsbestätigung|order confirmation/i.test(h))return "order-confirmation";if(/angebot|quotation|gültig bis/i.test(h))return "offer";if(/lieferschein|delivery note/i.test(h))return "delivery-note";if(/rechnung|invoice/i.test(h))return "invoice";if(/laborbericht|laboratory report/i.test(h))return "lab-report";if(/versuchsbericht|trial report/i.test(h))return "trial-report";if(/factsheet|produktvorteile|ihre vorteile/i.test(h))return "factsheet";if(/produktdatenblatt|product data sheet/i.test(h))return "product-data";return detectDocumentType(text,name)}
async function estimateStorage(){try{const e=await navigator.storage?.estimate?.();return e?{usage:e.usage||0,quota:e.quota||0}:null}catch{return null}}
async function importDocuments(files){const pdfs=[...files].filter(f=>f.type==="application/pdf"||/\.pdf$/i.test(f.name));if(!pdfs.length)return alert("Bitte mindestens eine PDF-Datei auswählen.");for(const file of pdfs){const id=makeId();const doc=normalizeDocument({id,fileName:file.name,mimeType:file.type||"application/pdf",size:file.size,status:"imported",storageState:"storing"});documents.unshift(doc);saveDocuments();showDocuments();try{await documentRepository.saveFile(id,file);doc.storageState="stored";await documentRepository.save(doc);try{const rawText=await extractPdfTextBasic(file);doc.type=detectGeneralDocumentType(rawText,file.name);doc.textPreview=rawText.slice(0,4000);doc.textExtracted=Boolean(rawText);doc.extracted=inferProductFromPdf(rawText,file.name,doc.type)}catch(extractionError){console.warn("PDF-Text konnte nicht extrahiert werden",extractionError);doc.textExtracted=false;doc.extracted=inferProductFromPdf("",file.name,"other")}doc.updatedAt=new Date().toISOString();saveDocuments()}catch(e){console.error(e);doc.storageState="error";doc.storageError=e?.message||String(e);doc.updatedAt=new Date().toISOString();saveDocuments();alert(`Datei konnte nicht offline gespeichert werden: ${file.name}`)}}showDocuments()}
function documentFiltersHtml(){return `<div class="document-filter-row"><label>Status<select id="documentStatusFilter"><option value="">Alle</option>${DOCUMENT_STATUSES.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label>Dokumenttyp<select id="documentTypeFilter"><option value="">Alle</option>${DOCUMENT_TYPES.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label class="document-search">Suche<input id="documentSearch" type="search" placeholder="Dateiname, Nummer, Kunde, Produkt"></label></div>`}
function showDocuments(){state.view="global-documents";localStorage.setItem(STORAGE_GLOBAL_PAGE,"documents");setView("global-documents");setBreadcrumb("Dokumente");updatePrimaryNavigation();const counts=Object.fromEntries(DOCUMENT_STATUSES.map(([v])=>[v,documents.filter(d=>d.status===v).length]));appView.innerHTML=`${globalPageHeader("Dokumentenzentrale","Dokumente","Original-PDFs vollständig offline speichern, prüfen, verknüpfen und freigeben.")}<section class="document-toolbar"><label class="button primary file-label-inline">PDF hochladen<input id="documentPdfImport" type="file" accept="application/pdf,.pdf" multiple></label><button class="button secondary" id="documentStorageInfo" type="button">Offline-Speicher prüfen</button></section><div class="document-status-cards">${DOCUMENT_STATUSES.map(([v,l])=>`<button type="button" data-doc-status-card="${v}"><strong>${counts[v]}</strong><span>${l}</span></button>`).join("")}</div>${documentFiltersHtml()}<div id="documentLibrary"></div>`;
 const render=()=>{const q=$("#documentSearch").value.trim().toLowerCase(),st=$("#documentStatusFilter").value,ty=$("#documentTypeFilter").value;const list=documents.filter(d=>(!st||d.status===st)&&(!ty||d.type===ty)&&(!q||[d.fileName,d.documentNumber,d.customer,d.sender,d.recipient,d.notes,...d.tags,...d.productIds.map(id=>productById(id)?.name||"")].join(" ").toLowerCase().includes(q)));$("#documentLibrary").innerHTML=list.length?`<div class="document-library-list">${list.map(d=>`<article><div class="document-icon">PDF</div><div class="document-main"><div class="document-meta"><span class="status-chip ${d.status==='approved'?'green':d.status==='review'?'amber':d.status==='archived'?'gray':'blue'}">${docStatusLabel(d.status)}</span><span>${docTypeLabel(d.type)}</span><span>${(d.size/1024/1024).toFixed(2)} MB</span><span>${d.storageState==='stored'?'offline gespeichert':d.storageState==='error'?'Speicherfehler':'wird gespeichert …'}</span></div><h2>${esc(d.fileName)}</h2><p>${[d.documentNumber,d.documentDate,d.customer,productNames(d.productIds)].filter(Boolean).map(esc).join(" · ")||"Noch keine fachliche Zuordnung"}</p></div><div class="document-list-actions"><button class="button secondary compact" data-open-document="${d.id}">Anzeigen</button><button class="button primary compact" data-review-document="${d.id}">${d.status==='imported'?'Prüfen':'Bearbeiten'}</button></div></article>`).join("")}</div>`:`<div class="empty-panel"><h2>Keine Dokumente gefunden</h2><p>Lade eine PDF hoch. Die Originaldatei wird vollständig in IndexedDB gespeichert und bleibt offline anzeigbar.</p></div>`;$$('[data-open-document]').forEach(b=>b.onclick=()=>showDocumentDetail(b.dataset.openDocument));$$('[data-review-document]').forEach(b=>b.onclick=()=>showDocumentReview(b.dataset.reviewDocument))};
 $("#documentPdfImport").onchange=e=>{importDocuments(e.target.files);e.target.value=""};$("#documentSearch").oninput=render;$("#documentStatusFilter").onchange=render;$("#documentTypeFilter").onchange=render;$$('[data-doc-status-card]').forEach(b=>b.onclick=()=>{$("#documentStatusFilter").value=b.dataset.docStatusCard;render()});$("#documentStorageInfo").onclick=async()=>{const e=await estimateStorage();alert(e?`Belegt: ${(e.usage/1024/1024).toFixed(1)} MB\nVerfügbares Kontingent: ${(e.quota/1024/1024).toFixed(1)} MB\n\nPDF-Dateien werden vollständig offline gespeichert.`:"Der Browser stellt keine Speicherstatistik bereit. PDF-Dateien werden dennoch lokal in IndexedDB gespeichert.")};render()}
function productNames(ids=[]){return ids.map(id=>productById(id)?.name).filter(Boolean).join(", ")}
async function showDocumentDetail(id){
  const d=documentById(id);if(!d)return showDocuments();
  state.view="document-detail";setView("document-detail");setBreadcrumb(`Dokumente › ${d.fileName}`);
  appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">${docTypeLabel(d.type)}</p><h1>${esc(d.fileName)}</h1><p class="subtitle">${docStatusLabel(d.status)} · offline gespeichert · ${(d.size/1024/1024).toFixed(2)} MB</p></div><div class="page-header-actions"><button class="button secondary" id="editDocument">Prüfen / bearbeiten</button></div></section><div class="document-detail-layout"><section class="offline-pdf-panel"><div id="documentPdfViewer" class="document-pdf-viewer"></div></section><aside class="record-card document-facts"><h2>Dokumentdaten</h2><dl class="product-data-list"><div><dt>Status</dt><dd>${docStatusLabel(d.status)}</dd></div><div><dt>Dokumenttyp</dt><dd>${docTypeLabel(d.type)}</dd></div><div><dt>Nummer</dt><dd>${esc(d.documentNumber||"–")}</dd></div><div><dt>Datum / Version</dt><dd>${esc([d.documentDate,d.version].filter(Boolean).join(" · ")||"–")}</dd></div><div><dt>Kunde</dt><dd>${esc(d.customer||"–")}</dd></div><div><dt>Anlage</dt><dd>${esc(plants.find(p=>p.id===d.plantId)?.master?.name||"–")}</dd></div><div><dt>Produkte</dt><dd>${esc(productNames(d.productIds)||"–")}</dd></div></dl><h3>Notizen</h3><p>${esc(d.notes||"Keine Notizen")}</p></aside></div>`;
  try{
    const blob=await documentRepository.getFile(d.id);
    if(!blob) throw new Error("Die Metadaten sind vorhanden, der lokale PDF-Blob fehlt.");
    await mountPdfViewer($("#documentPdfViewer"),blob,{fileName:d.fileName});
  }catch(error){
    console.error(error);
    $("#documentPdfViewer").innerHTML=`<div class="empty-panel"><h2>PDF konnte nicht geladen werden</h2><p>${esc(error?.message||String(error))}</p></div>`;
  }
  $("#editDocument").onclick=()=>showDocumentReview(d.id);
}
async function showDocumentReview(id){const d=documentById(id);if(!d)return showDocuments();state.view="document-review";setView("document-review");setBreadcrumb(`Dokumente › Prüfen`);const inferred=d.extracted||{};appView.innerHTML=`<form id="documentReviewForm" class="record-form"><section class="page-header"><div><p class="eyebrow">Manueller Prüfmodus</p><h1>${esc(d.fileName)}</h1><p class="subtitle">Original bleibt unverändert offline gespeichert.</p></div><span class="status-chip amber">${docStatusLabel(d.status)}</span></section><div class="document-review-layout"><section class="offline-pdf-panel"><div id="reviewPdfViewer" class="document-pdf-viewer"></div></section><section class="review-fields"><div class="form-section"><h2>Dokument klassifizieren</h2><div class="form-grid"><label class="field-label">Dokumenttyp<select name="type">${DOCUMENT_TYPES.map(([v,l])=>`<option value="${v}" ${d.type===v?'selected':''}>${l}</option>`).join("")}</select></label><label class="field-label">Status<select name="status">${DOCUMENT_STATUSES.map(([v,l])=>`<option value="${v}" ${d.status===v?'selected':''}>${l}</option>`).join("")}</select></label>${field("documentNumber","Dokumentnummer",d.documentNumber)}${field("documentDate","Dokumentdatum",d.documentDate,"date")}${field("version","Version / Stand",d.version)}${field("language","Sprache",d.language)}${field("sender","Absender",d.sender)}${field("recipient","Empfänger",d.recipient)}${field("customer","Kunde",d.customer)}<label class="field-label">Anlage<select name="plantId"><option value="">Keine Zuordnung</option>${plants.map(p=>`<option value="${p.id}" ${d.plantId===p.id?'selected':''}>${esc(p.master.name||'Unbenannte Anlage')}</option>`).join("")}</select></label>${field("project","Projekt / Auftrag",d.project)}<label class="field-label span-2">Schlagwörter<input name="tags" value="${esc(d.tags.join(', '))}" placeholder="kommagetrennt"></label><label class="field-label span-2">Notizen<textarea name="notes">${esc(d.notes)}</textarea></label></div></div><div class="form-section"><h2>Produktbezug</h2><p class="muted-small">Produktdokumente können ein neues Produkt erzeugen oder bestehende Produkte ergänzen. Kaufmännische Dokumente werden nur verknüpft.</p><label class="field-label">Bestehende Produkte<select name="productIds" multiple size="5">${products.map(p=>`<option value="${p.id}" ${d.productIds.includes(p.id)?'selected':''}>${esc(p.name)}</option>`).join("")}</select></label><label class="field-label">Neues Produkt aus Dokument erzeugen<input name="newProductName" value="${esc(inferred.name||'')}" placeholder="leer lassen, wenn keines erzeugt werden soll"></label><div class="form-grid">${field("newMaterialNumber","Materialnummer",inferred.materialNumber||"")}${field("newProductCategory","Produktgruppe",inferred.category||"")}</div></div></section></div><div class="sticky-form-actions"><button class="button secondary" type="button" id="cancelDocumentReview">Abbrechen</button><button class="button primary" type="submit">Dokument speichern</button></div></form>`;try{const blob=await documentRepository.getFile(d.id);if(!blob)throw new Error("Die Metadaten sind vorhanden, aber die Offline-Datei fehlt.");await mountPdfViewer($("#reviewPdfViewer"),blob,{fileName:d.fileName})}catch(error){console.error(error);$("#reviewPdfViewer").innerHTML=`<div class="empty-panel"><h2>PDF konnte nicht geladen werden</h2><p>${esc(error?.message||String(error))}</p></div>`}$("#cancelDocumentReview").onclick=()=>showDocumentDetail(d.id);$("#documentReviewForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);d.type=String(fd.get("type"));d.status=String(fd.get("status"));for(const k of ["documentNumber","documentDate","version","language","sender","recipient","customer","plantId","project","notes"])d[k]=String(fd.get(k)||"").trim();d.tags=String(fd.get("tags")||"").split(",").map(x=>x.trim()).filter(Boolean);d.productIds=fd.getAll("productIds").map(String);const newName=String(fd.get("newProductName")||"").trim();if(newName){let p=products.find(x=>x.name.toLowerCase()===newName.toLowerCase());if(!p){p=normalizeProduct();p.name=newName;p.materialNumber=String(fd.get("newMaterialNumber")||"").trim();p.category=String(fd.get("newProductCategory")||"").trim()||"Sonstiges";products.push(p)}if(!d.productIds.includes(p.id))d.productIds.push(p.id);if(!p.documents.some(x=>x.id===d.id))p.documents.push({id:d.id,fileName:d.fileName,type:d.type,documentDate:d.documentDate,size:d.size,mimeType:d.mimeType,importedAt:d.importedAt,source:"Dokumentenzentrale",reviewStatus:d.status==='approved'?'confirmed':'review',textExtracted:d.textExtracted});p.updatedAt=new Date().toISOString();saveProducts()}for(const pid of d.productIds){const p=productById(pid);if(p&&!p.documents.some(x=>x.id===d.id)){p.documents.push({id:d.id,fileName:d.fileName,type:d.type,documentDate:d.documentDate,size:d.size,mimeType:d.mimeType,importedAt:d.importedAt,source:"Dokumentenzentrale",reviewStatus:d.status==='approved'?'confirmed':'review',textExtracted:d.textExtracted});p.updatedAt=new Date().toISOString()}}d.reviewedAt=new Date().toISOString();d.reviewer=employeeProfile?.name||"lokaler Benutzer";d.updatedAt=new Date().toISOString();saveProducts();saveDocuments();showDocumentDetail(d.id)}}

function showGlobalPage(page){
  const valid=new Set(["today","appointments","tasks-global","documents","products","tenders","projects","reports","backup","settings","system"]);
  page=valid.has(page)?page:"today";localStorage.setItem(STORAGE_GLOBAL_PAGE,page);
  if(page==="today")return showHome();
  setView(`global-${page}`);
  const titles={appointments:"Termine",'tasks-global':"Aufgaben",documents:"Dokumente",products:"Produkte",tenders:"Ausschreibungsradar",projects:"Optimierungsprojekte",reports:"Berichte",backup:"Backup",settings:"Einstellungen",system:"Info & System"};
  setBreadcrumb(titles[page]||"Abwasser-Rechner");
  if(page==="appointments"){
    const items=upcomingVisits(50);
    appView.innerHTML=`${globalPageHeader("Einsatzplanung","Termine","Anlagenübergreifende Besuchs- und Terminübersicht.")}<div class="appointment-global-list">${items.length?items.map(({plant,visit,date})=>`<article><time>${date.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}<strong>${date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</strong></time><div><h3>${esc(plant.master.name||"Kläranlage")}</h3><p>${esc(visit.title||visit.purpose||"Besuchstermin")}</p></div><button type="button" data-global-open-plant="${plant.id}">Anlage öffnen</button></article>`).join(""):`<div class="empty-panel"><h2>Keine Termine vorhanden</h2><p>Geplante Besuche erscheinen hier anlagenübergreifend.</p></div>`}</div>`;
  }else if(page==="tasks-global"){
    const tasks=plants.flatMap(plant=>(plant.actions||[]).filter(a=>a.status!=="done").map(action=>({plant,action}))).sort((a,b)=>(a.action.dueDate||"9999").localeCompare(b.action.dueDate||"9999"));
    appView.innerHTML=`${globalPageHeader("Arbeitsliste","Aufgaben","Offene Aufgaben aus allen Anlagen.")}<div class="global-task-list">${tasks.length?tasks.map(({plant,action})=>`<article class="${action.priority==='high'?'high':''}"><div><span>${esc(plant.master.name||"Kläranlage")}</span><h3>${esc(action.title)}</h3><p>${action.dueDate?`Fällig: ${formatDate(action.dueDate)}`:"Ohne Fälligkeit"}</p></div><button type="button" data-global-open-plant="${plant.id}" data-global-plant-page="tasks">Öffnen</button></article>`).join(""):`<div class="empty-panel"><h2>Keine offenen Aufgaben</h2><p>Offene Punkte aus Besuchen und Anlagenakten werden hier gesammelt.</p></div>`}</div>`;
  }else if(page==="backup"){
    appView.innerHTML=`${globalPageHeader("Datensicherheit","Backup","Lokale Daten sichern oder eine Gesamtsicherung wiederherstellen.")}<section class="backup-center"><article><h2>Gesamtsicherung exportieren</h2><p>Exportiert Profil, Anlagen, Besuche und Aufgaben als JSON-Datei.</p><button class="button primary" id="globalExportBackup" type="button">Sicherung exportieren</button></article><article><h2>Sicherung importieren</h2><p>Ersetzt nach Bestätigung den aktuellen lokalen Datenbestand.</p><label class="button secondary file-label-inline">Sicherung auswählen<input id="globalImportBackup" type="file" accept=".json,application/json"></label></article></section>`;
    $("#globalExportBackup").onclick=()=>downloadJson(`abwasser-rechner-sicherung-${new Date().toISOString().slice(0,10)}.json`,{schema:"abwasser-rechner-backup-v1",version:VERSION,exportedAt:new Date().toISOString(),employeeProfile,plants,products,activePlantId});
    $("#globalImportBackup").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.plants)||!data.employeeProfile)throw new Error("Keine gültige Gesamtsicherung");if(!confirm("Vorhandene Profil- und Anlagendaten durch diese Sicherung ersetzen?"))return;plants=data.plants.map(normalizePlant);products=Array.isArray(data.products)?data.products.map(normalizeProduct):products;saveProducts();employeeProfile=normalizeEmployeeProfile(data.employeeProfile);activePlantId=data.activePlantId&&plants.some(x=>x.id===data.activePlantId)?data.activePlantId:plants[0]?.id||"";if(savePlants()&&saveEmployeeProfile()){renderPlantSelector();updateProfileButton();showGlobalPage("backup");}}catch(err){alert(`Import nicht möglich: ${err.message}`)}finally{e.target.value="";}};
  }else if(page==="system"){
    const visitCount=plants.reduce((n,p)=>n+(p.visits||[]).length,0),actionCount=plants.reduce((n,p)=>n+(p.actions||[]).length,0);
    appView.innerHTML=`${globalPageHeader("Info & System","Abwasser-Rechner","Versions-, Datenschutz- und Systeminformationen.")}<div id="v011Diagnostics" class="system-grid"><article><span>Version</span><strong>${VERSION}</strong><small>IndexedDB-Datenkern · Alpha</small></article><article><span>Datenbestand</span><strong>${plants.length} Anlagen</strong><small>${visitCount} Besuche · ${actionCount} Aufgaben</small></article><article><span>Offline-Modus</span><strong>${navigator.onLine?'Online / offlinefähig':'Offline'}</strong><small>Lokale Speicherung im Browser</small></article><article><span>Datenmodell</span><strong>Schema ${Math.max(0,...plants.map(p=>Number(p.schemaVersion)||0))||'–'}</strong><small>Keine Cloud-Synchronisation</small></article></div><div class="record-grid"><article class="record-card"><h2>Copyright</h2><p><strong>© 2026 Mirco Krause & Sebastian Steinkohl</strong></p><p>Alle Rechte vorbehalten.</p><p>Diese Software wurde für den professionellen Einsatz im technischen Außendienst der Wasser- und Abwassertechnik entwickelt.</p></article><article class="record-card"><h2>Datenschutz</h2><p>Anlagen-, Kontakt- und Profildaten werden lokal im Browser gespeichert. Eine Übertragung an Dritte oder Cloud-Synchronisation findet in dieser Version nicht statt.</p><p>Exporte erfolgen ausschließlich durch eine bewusste Benutzeraktion.</p></article></div><article class="release-notes"><h2>Release Notes 0.9.3</h2><h3>Neu</h3><ul><li>Globale Produktbibliothek mit strukturierten Produktakten</li><li>Kontrollierter PDF-Import für SDS, Factsheets und technische Dokumente</li><li>Lokale PDF-Ablage in IndexedDB mit Prüfmaske</li><li>Asynchrone Importwarteschlange für mehrere PDFs</li><li>Importqualität mit transparenten Erkennungschecks</li></ul><h3>Verbessert</h3><ul><li>Klare Trennung zwischen appweiten Funktionen und der Navigation einer einzelnen Anlage</li><li>Reduzierte Anlagennavigation ohne systemfremde Inhalte</li><li>Vorbereitung für Dokumenten- und Produktbibliothek</li></ul></article>`;
    Promise.all([documentRepository.diagnostics(),navigator.storage?.estimate?.()||null,recentAudit(5)]).then(([diag,storage,events])=>{
      const host=$("#v011Diagnostics");if(!host)return;
      host.insertAdjacentHTML("beforeend",`<article><span>Dokumente</span><strong>${diag.documents} / ${diag.files} PDFs</strong><small>${diag.missing} fehlend · ${diag.orphans} verwaist</small></article><article><span>PDF-Speicher</span><strong>${(diag.fileBytes/1024/1024).toFixed(1)} MB</strong><small>${storage?.quota?`${(storage.usage/1024/1024).toFixed(1)} von ${(storage.quota/1024/1024).toFixed(0)} MB belegt`:"Speicherquote nicht verfügbar"}</small></article>`);
      if(events.length)appView.insertAdjacentHTML("beforeend",`<article class="release-notes"><h2>Letzte Systemereignisse</h2><ul>${events.map(e=>`<li>${esc(new Date(e.createdAt).toLocaleString("de-DE"))}: ${esc(e.action)}</li>`).join("")}</ul></article>`);
    }).catch(console.error);
  }else if(page==="documents") return showDocuments();
  else if(page==="products") return showProducts();
  else if(page==="tenders") return showTenderRadar();
  else if(page==="projects") appView.innerHTML=renderGlobalPlaceholder("📈","Optimierungsprojekte","Anlagenübergreifende Pipeline für Analysen, Versuche, Angebote und Aufträge.","Die Projektlogik wird nach der Dokumenten- und Produktbasis umgesetzt.");
  else if(page==="reports") appView.innerHTML=renderGlobalPlaceholder("📊","Berichte","Besuchsberichte, Jahresübersichten und technische Auswertungen.","Berichte werden schrittweise aus Anlagen-, Besuchs- und Projektdaten erzeugt.");
  else if(page==="settings") appView.innerHTML=renderGlobalPlaceholder("⚙","Einstellungen","Appweite Einstellungen für Darstellung, Backup-Erinnerungen und zukünftige Benutzeroptionen.","Die lokale Benutzer- und PIN-Sperre ist als späterer Foundation-Baustein vorgesehen.");
  $$('[data-global-open-plant]').forEach(b=>b.onclick=()=>{activePlantId=b.dataset.globalOpenPlant;savePlants();showPlantDashboard(b.dataset.globalPlantPage||"overview");});
}

function showTenderRadar(){
  state.view="global-tenders";
  localStorage.setItem(STORAGE_GLOBAL_PAGE,"tenders");
  setView("global-tenders");
  setBreadcrumb("Ausschreibungsradar");
  updatePrimaryNavigation();
  const profileName=employeeDisplayName?.()||"";
  renderTenderRadarPage(appView,{globalPageHeader,currentUserName:profileName}).then(refreshGlobalNavigationBadges).catch(error=>{
    console.error(error);
    appView.innerHTML=`${globalPageHeader("Beschaffung","Ausschreibungsradar","Import und Bewertung oeffentlicher Ausschreibungen.")}<div class="empty-panel"><h2>Radar konnte nicht geladen werden</h2><p>${esc(error?.message||String(error))}</p></div>`;
  });
}


function showProducts(){
  state.view="global-products";localStorage.setItem(STORAGE_GLOBAL_PAGE,"products");setView("global-products");setBreadcrumb("Produkte");updatePrimaryNavigation();
  appView.innerHTML=`${globalPageHeader("Produkte","Produktwissen","Sicherheitsdatenblätter und Factsheets lokal importieren, prüfen und Produkten zuordnen.")}
  <section class="product-toolbar"><label class="button primary file-label-inline">PDF importieren<input id="productPdfImport" type="file" accept="application/pdf,.pdf" multiple></label><label class="button primary file-label-inline">Produktliste importieren<input id="productCsvImport" type="file" accept=".csv,text/csv" multiple></label><button class="button secondary" id="newProductManual" type="button">Produkt manuell anlegen</button><label class="product-search">Produkte durchsuchen<input id="productSearch" type="search" placeholder="Name, Kategorie oder Problem"></label></section>
  <div id="productImportStatus"></div><div id="productLibrary"></div>`;
  const render=(query="")=>{const q=query.trim().toLowerCase();const list=products.filter(p=>!q||[p.name,p.materialNumber,p.category,p.shortDescription,...p.applications,...p.problems,...p.benefits].join(" ").toLowerCase().includes(q));$("#productLibrary").innerHTML=list.length?`<div class="product-grid">${list.map(p=>`<article class="product-card" data-open-product="${p.id}"><div class="product-image">${productPreviewVisual(p,"card")}</div><div class="product-card-head"><span class="status-chip blue">${esc(p.category)}</span><span>${p.documents.length} Dokument${p.documents.length===1?"":"e"}</span></div><h2>${esc(p.name||"Unbenanntes Produkt")}</h2><p>${esc(p.shortDescription||"Noch keine Kurzbeschreibung hinterlegt.")}</p><div class="product-tags">${p.problems.slice(0,4).map(x=>`<span>${esc(x)}</span>`).join("")}</div><dl><div><dt>Materialnummer</dt><dd>${esc(p.materialNumber||"–")}</dd></div><div><dt>Prüfstatus</dt><dd>${p.reviewStatus==="confirmed"?"Geprüft":p.reviewStatus==="seeded"?"Vorbelegt":"Entwurf"}</dd></div></dl></article>`).join("")}</div>`:`<div class="empty-panel"><h2>Keine Produkte gefunden</h2><p>Importiere ein PDF oder lege ein Produkt manuell an.</p></div>`;$$('[data-open-product]').forEach(b=>b.onclick=()=>showProductDetail(b.dataset.openProduct));};
  render();renderProductImportQueueStatus();$("#productSearch").oninput=e=>render(e.target.value);$("#productPdfImport").onchange=handleProductPdfImport;$("#productCsvImport").onchange=handleProductCsvImport;$("#newProductManual").onclick=()=>showProductEditor();
}
async function handleProductPdfImport(event){
  const files=event.target.files;if(!files?.length)return;enqueueProductPdfs(files);event.target.value="";
}

async function showProductImportReview(file,type,inferred,rawText,queueItem=null){
  state.view="product-import";setView("product-import");setBreadcrumb("Produkte › PDF prüfen");
  const possible=products.filter(p=>p.name&&inferred.name&&p.name.toLowerCase().replace(/[^a-z0-9]/g,"").includes(inferred.name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12)));
  const quality=queueItem?.quality||productImportQuality(type,inferred,rawText);
  appView.innerHTML=`<form id="productImportReview" class="record-form"><section class="page-header"><div><p class="eyebrow">PDF-Import</p><h1>Import prüfen</h1><p class="subtitle">${esc(file.name)} · ${(file.size/1024/1024).toFixed(2)} MB</p></div><span class="status-chip blue">${documentTypeLabel(type)}</span></section>
  ${!rawText?`<div class="info-box warning"><strong>Hinweis:</strong> In diesem PDF konnte ohne OCR keine verwertbare Textschicht gelesen werden. Produktname und Dokumenttyp wurden aus dem Dateinamen abgeleitet. Bitte alle Felder prüfen.</div>`:""}
  <section class="import-quality"><div><span>Importqualität</span><strong>${quality.score}%</strong></div><div class="quality-bar"><span style="width:${quality.score}%"></span></div><div class="quality-checks">${quality.checks.map(([label,ok])=>`<span class="${ok?"ok":"missing"}">${ok?"✓":"⚠"} ${esc(label)}</span>`).join("")}</div></section>
  <section class="form-section"><h2>Zuordnung</h2><div class="form-grid"><label class="field-label span-2">Bestehendem Produkt zuordnen<select name="existingProduct"><option value="">Neues Produkt anlegen</option>${products.map(p=>`<option value="${p.id}" ${possible[0]?.id===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select></label>${field("name","Produktname",inferred.name)}${field("materialNumber","Materialnummer",inferred.materialNumber)}${field("category","Produktgruppe",inferred.category)}${field("documentDate","Dokumentstand",inferred.documentDate)}<label class="field-label span-2">Kurzbeschreibung<textarea name="shortDescription">${esc(inferred.shortDescription)}</textarea></label></div></section>
  <section class="form-section"><h2>Anwendung und Vertrieb</h2><div class="form-grid"><label class="field-label">Anwendungsbereiche<textarea name="applications">${esc(inferred.applications.join("\n"))}</textarea></label><label class="field-label">Adressierte Probleme<textarea name="problems">${esc(inferred.problems.join("\n"))}</textarea></label><label class="field-label span-2">Nutzen / Vorteile<textarea name="benefits">${esc(inferred.benefits.join("\n"))}</textarea></label></div></section>
  <section class="form-section"><h2>Technik und Sicherheit</h2><div class="form-grid">${field("state","Aggregatzustand",inferred.technical.state||"")}${field("ph","pH-Wert",inferred.technical.ph||"")}${field("density","Dichte",inferred.technical.density||"")}${field("signalWord","Signalwort",inferred.safety.signalWord||"")}${field("unNumber","UN-Nummer",inferred.safety.unNumber||"")}<label class="field-label">H-Sätze<textarea name="hazardStatements">${esc((inferred.safety.hazardStatements||[]).join("\n"))}</textarea></label></div></section>
  <div class="sticky-form-actions"><button class="button secondary" type="button" id="cancelProductImport">Abbrechen</button><button class="button primary" type="submit">PDF und Produkt speichern</button></div></form>`;
  $("#cancelProductImport").onclick=()=>queueItem?showProducts():showProducts();$("#productImportReview").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);let product=productById(String(fd.get("existingProduct")||""));if(!product){product=normalizeProduct();products.push(product)}product.name=String(fd.get("name")||"").trim();product.materialNumber=String(fd.get("materialNumber")||"").trim();product.category=String(fd.get("category")||"").trim()||"Sonstiges";product.shortDescription=String(fd.get("shortDescription")||"").trim();product.applications=unique([...product.applications,...splitKnowledge(fd.get("applications"))]);product.problems=unique([...product.problems,...splitKnowledge(fd.get("problems"))]);product.benefits=unique([...product.benefits,...splitKnowledge(fd.get("benefits"))]);product.technical.state=String(fd.get("state")||"").trim()||product.technical.state;product.technical.ph=String(fd.get("ph")||"").trim()||product.technical.ph;product.technical.density=String(fd.get("density")||"").trim()||product.technical.density;product.safety.signalWord=String(fd.get("signalWord")||"").trim()||product.safety.signalWord;product.safety.unNumber=String(fd.get("unNumber")||"").trim()||product.safety.unNumber;product.safety.hazardStatements=unique([...product.safety.hazardStatements,...splitKnowledge(fd.get("hazardStatements"))]);const docId=queueItem?.tempFileId||makeId();if(!queueItem?.tempFileId)await storeProductFile(docId,file);product.documents.push({id:docId,fileName:file.name,type,documentDate:String(fd.get("documentDate")||"").trim(),size:file.size,mimeType:file.type||"application/pdf",importedAt:new Date().toISOString(),source:"PDF-Import",reviewStatus:"confirmed",textExtracted:Boolean(rawText)});product.updatedAt=new Date().toISOString();product.reviewStatus="confirmed";if(queueItem){queueItem.status="saved";queueItem.productId=product.id}if(saveProducts()){if(productImportQueue.length>1)showProducts();else showProductDetail(product.id)}};
}
function showProductDetail(id){
  const p=productById(id);if(!p)return showProducts();state.view="product-detail";setView("product-detail");setBreadcrumb(`Produkte › ${p.name}`);
  appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">Produktakte</p><h1>${esc(p.name)}</h1><p class="subtitle">${esc(p.category)}${p.materialNumber?` · Materialnummer ${esc(p.materialNumber)}`:""}</p></div><div class="page-header-actions"><button class="button secondary" id="editProduct">Bearbeiten</button><label class="button primary file-label-inline">PDF hinzufügen<input id="addProductPdf" type="file" accept="application/pdf,.pdf" multiple></label></div></section>
  <div class="product-detail-grid"><article class="record-card product-detail-image"><div class="product-image">${productPreviewVisual(p,"detail")}</div><h2>Übersicht</h2><p>${esc(p.shortDescription||"Keine Kurzbeschreibung vorhanden.")}</p><dl class="product-data-list"><div><dt>Anwendungen</dt><dd>${p.applications.map(esc).join(", ")||"–"}</dd></div><div><dt>Adressierte Probleme</dt><dd>${p.problems.map(esc).join(", ")||"–"}</dd></div><div><dt>Nutzen</dt><dd>${p.benefits.map(esc).join(" · ")||"–"}</dd></div></dl></article><article class="record-card"><h2>Technische Daten</h2><dl class="product-data-list"><div><dt>Aggregatzustand</dt><dd>${esc(p.technical.state||"–")}</dd></div><div><dt>pH-Wert</dt><dd>${esc(p.technical.ph||"–")}</dd></div><div><dt>Dichte</dt><dd>${esc(p.technical.density||"–")}</dd></div><div><dt>Löslichkeit</dt><dd>${esc(p.technical.solubility||"–")}</dd></div><div><dt>Lagerstabilität</dt><dd>${esc(p.technical.storageStability||"–")}</dd></div></dl></article><article class="record-card"><h2>Sicherheit</h2><dl class="product-data-list"><div><dt>Signalwort</dt><dd>${esc(p.safety.signalWord||"–")}</dd></div><div><dt>H-Sätze</dt><dd>${p.safety.hazardStatements.map(esc).join(", ")||"–"}</dd></div><div><dt>UN-Nummer</dt><dd>${esc(p.safety.unNumber||"–")}</dd></div><div><dt>Transportklasse</dt><dd>${esc(p.safety.transportClass||"–")}</dd></div></dl></article></div>
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Quellen</p><h2>Dokumente</h2></div></div>${p.documents.length?`<div class="document-list">${p.documents.map(d=>`<article><div><span class="status-chip blue">${documentTypeLabel(d.type)}</span><h3>${esc(d.fileName)}</h3><p>${d.documentDate?`Stand ${esc(d.documentDate)} · `:""}${(d.size/1024/1024).toFixed(2)} MB · ${d.textExtracted?"Text erkannt":"manuell geprüft"}</p></div><div class="document-actions"><button type="button" data-open-product-document="${d.id}">Öffnen</button><button type="button" class="danger-link" data-delete-product-document="${d.id}">Entfernen</button></div></article>`).join("")}</div>`:`<div class="empty-panel compact"><p>Noch keine Dokumente zugeordnet.</p></div>`}</section>`;
  $("#editProduct").onclick=()=>showProductEditor(p.id);$("#addProductPdf").onchange=handleProductPdfImport;$$('[data-open-product-document]').forEach(b=>b.onclick=async()=>{const blob=await documentRepository.getFile(b.dataset.openProductDocument)||await getProductFile(b.dataset.openProductDocument);if(!blob)return alert("Die lokale PDF-Datei wurde nicht gefunden.");const url=URL.createObjectURL(blob);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000)});$$('[data-delete-product-document]').forEach(b=>b.onclick=async()=>{if(!confirm("Dokument wirklich aus der Produktakte entfernen?"))return;await deleteProductFile(b.dataset.deleteProductDocument);p.documents=p.documents.filter(d=>d.id!==b.dataset.deleteProductDocument);saveProducts();showProductDetail(p.id)});
}
function showProductEditor(id=""){
  let p=id?productById(id):normalizeProduct();if(!p)return showProducts();state.view="product-editor";setView("product-editor");setBreadcrumb(id?`Produkte › ${p.name} › Bearbeiten`:"Produkte › Neues Produkt");
  appView.innerHTML=`<form id="productEditor" class="record-form"><section class="page-header"><div><p class="eyebrow">Produktakte</p><h1>${id?"Produkt bearbeiten":"Produkt anlegen"}</h1></div></section><section class="form-section"><div class="form-grid">${field("name","Produktname",p.name)}${field("materialNumber","Materialnummer",p.materialNumber)}${field("category","Produktgruppe",p.category)}${field("imageUrl","Bild-URL",p.imageUrl,"url","https://...")}<label class="field-label span-2">Kurzbeschreibung<textarea name="shortDescription">${esc(p.shortDescription)}</textarea></label><label class="field-label">Anwendungsbereiche<textarea name="applications">${esc(p.applications.join("\n"))}</textarea></label><label class="field-label">Adressierte Probleme<textarea name="problems">${esc(p.problems.join("\n"))}</textarea></label><label class="field-label span-2">Nutzen / Vorteile<textarea name="benefits">${esc(p.benefits.join("\n"))}</textarea></label>${field("state","Aggregatzustand",p.technical.state)}${field("ph","pH-Wert",p.technical.ph)}${field("density","Dichte",p.technical.density)}${field("solubility","Löslichkeit",p.technical.solubility)}${field("storageStability","Lagerstabilität",p.technical.storageStability)}${field("signalWord","Signalwort",p.safety.signalWord)}${field("unNumber","UN-Nummer",p.safety.unNumber)}<label class="field-label">H-Sätze<textarea name="hazardStatements">${esc(p.safety.hazardStatements.join("\n"))}</textarea></label></div></section><div class="sticky-form-actions"><button class="button secondary" type="button" id="cancelProductEditor">Abbrechen</button><button class="button primary" type="submit">Produkt speichern</button></div></form>`;
  $("#cancelProductEditor").onclick=()=>id?showProductDetail(id):showProducts();$("#productEditor").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);p.name=String(fd.get("name")||"").trim();p.materialNumber=String(fd.get("materialNumber")||"").trim();p.category=String(fd.get("category")||"").trim()||"Sonstiges";p.imageUrl=String(fd.get("imageUrl")||"").trim();p.shortDescription=String(fd.get("shortDescription")||"").trim();p.applications=splitKnowledge(fd.get("applications"));p.problems=splitKnowledge(fd.get("problems"));p.benefits=splitKnowledge(fd.get("benefits"));for(const k of ["state","ph","density","solubility","storageStability"])p.technical[k]=String(fd.get(k)||"").trim();p.safety.signalWord=String(fd.get("signalWord")||"").trim();p.safety.unNumber=String(fd.get("unNumber")||"").trim();p.safety.hazardStatements=splitKnowledge(fd.get("hazardStatements"));p.updatedAt=new Date().toISOString();p.reviewStatus="confirmed";if(!id)products.push(p);if(saveProducts())showProductDetail(p.id)};
}

function showApplication(view){
  if(view==="plantDashboard")return showPlantDashboard();
  if(view==="traffic")return showTraffic();
  if(view==="limits")return showLimits();
  if(view==="plantForm")return showPlantForm();
  setView("plants");setBreadcrumb("Anlagenübersicht");renderPlants();
}
function renderPlants(){
  appView.innerHTML=`<section class="page-header">
    <div><p class="eyebrow">Anlagenakte</p><h1>Anlagenübersicht</h1><p class="subtitle">Kommunale und industrielle Kläranlagen lokal verwalten.</p></div>
    <button class="button primary" id="createPlantTop">Neue Anlage</button>
  </section>
  <div class="plant-grid">${plants.length?plants.map(p=>`<article class="plant-card ${p.id===activePlantId?"active":""}">
    <div class="plant-card-head"><span class="plant-type">${p.master.type==="industrial"?"Industriell":p.master.type==="mixed"?"Kommunal mit Industrieanteil":"Kommunal"}</span>${p.id===activePlantId?`<span class="active-chip">Aktiv</span>`:""}</div>
    <h3>${esc(p.master.name||"Unbenannte Anlage")}</h3>
    <p>${esc([p.address.postalCode,p.address.city].filter(Boolean).join(" ")||"Adresse nicht hinterlegt")}</p>
    <dl><div><dt>Betreiber</dt><dd>${esc(p.operator.name||"–")}</dd></div><div><dt>Ansprechpartner</dt><dd>${p.contacts?.length||0}</dd></div></dl>
    <div class="card-actions">
      <button type="button" data-open-plant="${p.id}">Öffnen</button>
      <button type="button" data-edit-plant="${p.id}">Bearbeiten</button>
      <button type="button" class="danger-link" data-delete-plant="${p.id}">Löschen</button>
    </div>
  </article>`).join(""):`<div class="empty-panel"><h2>Noch keine Anlage angelegt</h2><p>Lege die erste Anlagenakte mit Stammdaten, Betreiber und Ansprechpartner an.</p></div>`}</div>`;
  $("#createPlantTop").onclick=()=>showPlantForm();
  $$("[data-open-plant]").forEach(b=>b.onclick=()=>{activePlantId=b.dataset.openPlant;savePlants();showPlantDashboard()});
  $$("[data-edit-plant]").forEach(b=>b.onclick=()=>showPlantForm(b.dataset.editPlant));
  $$("[data-delete-plant]").forEach(b=>b.onclick=()=>{
    const p=plants.find(x=>x.id===b.dataset.deletePlant);
    if(confirm(`Anlage „${p?.master.name||"Unbenannte Anlage"}“ wirklich löschen?`)){
      plants=plants.filter(x=>x.id!==b.dataset.deletePlant);
      if(activePlantId===b.dataset.deletePlant)activePlantId=plants[0]?.id||"";
      savePlants();renderPlants();
    }
  });
}
function field(name,label,value="",type="text",placeholder=""){
  let numericAttributes="";
  if(type==="number"){
    if(name==="address.latitude")numericAttributes=' step="any" min="-90" max="90" inputmode="decimal"';
    else if(name==="address.longitude")numericAttributes=' step="any" min="-180" max="180" inputmode="decimal"';
    else numericAttributes=' step="any" inputmode="decimal"';
  }
  const effectiveType=(name==="address.latitude"||name==="address.longitude")?"text":type;
  return `<label class="field-label">${label}<input name="${name}" type="${effectiveType}"${numericAttributes} value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
}
function selectField(name,label,value,options){
  return `<label class="field-label">${label}<select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${v===value?"selected":""}>${l}</option>`).join("")}</select></label>`;
}

function checkboxField(name,label,checked=false){
  return `<label class="check-field"><input name="${name}" type="checkbox" ${checked?"checked":""}><span>${label}</span></label>`;
}
function dewateringDefaults(value={}){
  return {enabled:false,status:"active",process:"screw-press",manufacturer:"",model:"",year:"",unitCount:"1",operationMode:"batch",throughputM3h:"",inletTsPercent:"",outletTsPercent:"",polymerKgPerTds:"",operatingHours:"",sludgeQuantity:"",polymerStation:false,feedPump:false,conveyor:false,container:false,filtrateRouting:"",notes:"",...value};
}
function dosingDefaults(value={}){
  return {id:makeId(),name:"",purpose:"polymer",status:"active",location:"",tankType:"storage-tank",tankManufacturer:"",tankModel:"",tankYear:"",tankVolume:"",tankMaterial:"",doubleWalled:false,bundPresent:false,levelMonitoring:false,leakageMonitoring:false,lastInspection:"",nextInspection:"",stationManufacturer:"",stationModel:"",stationYear:"",pumpType:"diaphragm",pumpCount:"1",capacityLh:"",maxPressureBar:"",controlMode:"flow-proportional",standbyPump:false,automaticChangeover:false,calibrationDevice:false,flushConnection:false,pressureHoldingValve:false,overflowValve:false,pulsationDamper:false,productName:"",activeIngredient:"",concentrationPercent:"",densityKgL:"",hazardous:false,safetyDataSheetAvailable:false,consumption:"",flowMeter:false,levelSensor:false,dryRunProtection:false,pressureMonitoring:false,leakageSensor:false,plcConnected:false,remoteAlarm:false,controlledValue:"",notes:"",...value};
}
function tankDefaults(value={}){
  return {id:makeId(),name:"",status:"active",location:"",type:"storage-tank",manufacturer:"",model:"",year:"",volume:"",material:"",medium:"",doubleWalled:false,bundPresent:false,levelMonitoring:false,leakageMonitoring:false,lastInspection:"",nextInspection:"",notes:"",...value};
}
function statusText(status){return status==="active"?"In Betrieb":status==="reserve"?"Reserve":status==="planned"?"Geplant":"Außer Betrieb"}
function dewateringProcessText(value){return ({"screw-press":"Schneckenpresse","belt-press":"Siebbandpresse","filter-press":"Kammerfilterpresse",centrifuge:"Zentrifuge",mobile:"Mobile Entwässerung",dryingBed:"Trockenbeet",other:"Sonstiges"})[value]||"Nicht festgelegt"}
function dosingPurposeText(value){return ({polymer:"Polymer",precipitant:"Fällmittel",carbon:"Kohlenstoffquelle",neutralization:"Neutralisationsmittel",defoamer:"Entschäumer",other:"Sonstiges"})[value]||"Dosierung"}
function tankApprovalRuleForMedium(medium=""){
  const label=String(medium||"").trim();
  if(!label) return null;
  return TANK_APPROVAL_RULES.find(rule=>rule.match.test(label))||null;
}
function tankAgeFromYear(year=""){
  const parsed=Number(String(year||"").trim());
  if(!Number.isInteger(parsed)||parsed<1950) return null;
  const age=new Date().getFullYear()-parsed;
  return age>=0?age:null;
}
function tankOfferSignals(plant){
  return (plant.tankSystems||[])
    .map(tank=>{
      const rule=tankApprovalRuleForMedium(tank.medium);
      const age=tankAgeFromYear(tank.year);
      if((tank.status||"active")==="inactive") return null;
      if(!rule||age===null) return null;
      if(age<=rule.maxYears) return null;
      const overrun=age-rule.maxYears;
      const level=overrun>TANK_CRITICAL_OVERRUN_YEARS?"red":"yellow";
      return {
        id:tank.id,
        name:tank.name||"Tankanlage",
        medium:tank.medium,
        buildYear:String(tank.year),
        age,
        limit:rule.maxYears,
        overrun,
        ruleLabel:rule.label,
        level,
        levelLabel:level==="red"?"Kritisch":"Beobachten"
      };
    })
    .filter(Boolean)
    .sort((a,b)=>{
      const rank=item=>item.level==="red"?2:1;
      return rank(b)-rank(a)||b.overrun-a.overrun;
    });
}
function renderOperationsDataSection(plant){
  return `<section class="dashboard-section compact-section"><div class="section-heading"><div><p class="eyebrow">Zentrale Datenbasis</p><h2>Betriebswerte</h2><p class="form-note">Zentrale Kennwerte für Außendienst, Technik und Vertrieb auf einen Blick.</p></div><button class="text-button" id="editParameters">Werte bearbeiten</button></div>
  <div class="kpi-grid">${[["Volumenstrom",plant.parameters.flow,"m³/d"],["Pges Ablauf",plant.parameters.pOut,"mg/l"],["NH₄-N Ablauf",plant.parameters.nh4Out,"mg/l"],["SVI",plant.parameters.svi,"ml/g"],["Schlammalter",plant.parameters.sludgeAge,"d"],["Kuchen-TS",plant.parameters.cakeTs,"%"],["Feststoffrückhalt",plant.parameters.retention,"%"],["Polymer",plant.parameters.polymer,"kg WS/t TS"]].map(([l,v,u])=>`<article class="kpi-card"><span>${l}</span><strong>${fmt(v)}</strong><small>${u}</small></article>`).join("")}</div></section>`;
}
function renderTechnicalAssets(plant){
  const d=dewateringDefaults(plant.sludgeDewatering||{});
  const systems=Array.isArray(plant.dosingSystems)?plant.dosingSystems:[];
  const tanks=Array.isArray(plant.tankSystems)?plant.tankSystems:[];
  const tankSignals=tankOfferSignals(plant);
  return `<section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Technische Anlagenbereiche</p><h2>Technik separat verwalten</h2><p class="form-note">Schlammentwässerung, Dosierstationen und Tankanlagen besitzen jeweils eine eigene Bearbeitungsmaske.</p></div></div>
  <div class="technical-assets-grid three-columns">
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">▦</span><div><h3>Schlammentwässerung</h3><span class="status-chip ${d.enabled?'green':'gray'}">${d.enabled?statusText(d.status):'Nicht vorhanden'}</span></div></div>${d.enabled?`<dl><div><dt>Verfahren</dt><dd>${esc(dewateringProcessText(d.process))}</dd></div><div><dt>Fabrikat</dt><dd>${esc([d.manufacturer,d.model].filter(Boolean).join(' ')||'–')}</dd></div><div><dt>Baujahr</dt><dd>${esc(d.year||'–')}</dd></div></dl>`:'<p>Noch nicht erfasst.</p>'}<button type="button" class="button secondary asset-edit-button" id="editDewatering">Schlammentwässerung bearbeiten</button></article>
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">DS</span><div><h3>Dosiertechnik</h3><span class="status-chip ${systems.length?'blue':'gray'}">${systems.length} ${systems.length===1?'Station':'Stationen'}</span></div></div>${systems.length?`<div class="dosing-summary-list">${systems.map(x=>`<div><strong>${esc(x.name||dosingPurposeText(x.purpose))}</strong><span>${esc(dosingPurposeText(x.purpose))} · ${esc(statusText(x.status))}</span><small>${esc(x.productName||'Medium nicht hinterlegt')}</small></div>`).join('')}</div>`:'<p>Noch keine Dosierstation erfasst.</p>'}<button type="button" class="button secondary asset-edit-button" id="editDosing">Dosiertechnik bearbeiten</button></article>
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">TA</span><div><h3>Tankanlagen</h3><span class="status-chip ${tanks.length?'blue':'gray'}">${tanks.length} ${tanks.length===1?'Tank':'Tanks'}</span></div></div>${tanks.length?`<div class="dosing-summary-list">${tanks.map(x=>`<div><strong>${esc(x.name||'Tankanlage')}</strong><span>${esc(x.medium||'Medium nicht hinterlegt')} · ${esc(statusText(x.status))}</span><small>${x.volume?`${esc(x.volume)} l`: 'Volumen nicht hinterlegt'}${x.year?` · Baujahr ${esc(x.year)}`:''}</small></div>`).join('')}</div>`:'<p>Noch keine Tankanlage erfasst.</p>'}${tankSignals.length?`<div class="info-box warning"><strong>Angebotschance erkannt:</strong> ${tankSignals.length} Tankanlage(n) über der hinterlegten Zulassungszeit.<ul class="plant-missing-list">${tankSignals.slice(0,4).map(item=>`<li><span class="status-chip ${item.level}">${esc(item.levelLabel)}</span> ${esc(item.name)} · ${esc(item.ruleLabel)} · Baujahr ${esc(item.buildYear)} · ${item.age} Jahre (Grenze ${item.limit} Jahre, +${item.overrun})</li>`).join("")}</ul><div class="section-actions"><button type="button" class="button primary" data-jump-page="sales">Angebot im Vertrieb vorbereiten</button></div></div>`:""}<button type="button" class="button secondary asset-edit-button" id="editTanks">Tankanlagen bearbeiten</button></article>
  </div></section>`;
}

function showPlantForm(id=null){
  setView("plantForm");setBreadcrumb(id?"Anlage bearbeiten":"Neue Anlage");
  const existing=id?plants.find(p=>p.id===id):null;
  const p=existing?structuredClone(existing):emptyPlant();
  p.master.mainProcess=p.master.mainProcess||"activated-sludge";
  p.master.processStages=Array.isArray(p.master.processStages)?p.master.processStages:[];
  p.master.processOther=p.master.processOther||p.master.process||"";
  p.sludgeDewatering=dewateringDefaults(p.sludgeDewatering||{});
  p.dosingSystems=Array.isArray(p.dosingSystems)?p.dosingSystems.map(dosingDefaults):[];
  p.tankSystems=Array.isArray(p.tankSystems)?p.tankSystems.map(tankDefaults):[];
  if(!p.master.internalNumber)p.master.internalNumber=nextInternalNumber();
  const legacyGps=parseLegacyGps(p.address.gps||"");
  p.address.latitude=p.address.latitude||legacyGps.latitude;
  p.address.longitude=p.address.longitude||legacyGps.longitude;
  appView.innerHTML=`<form id="plantForm" class="record-form">
    <section class="page-header"><div><p class="eyebrow">Anlagenakte</p><h1>${existing?"Anlage bearbeiten":"Neue Anlage"}</h1><p class="subtitle">Stammdaten, Adresse, Betreiber, Ansprechpartner und zentrale Betriebswerte.</p></div></section>

    <section class="form-section"><h2>Stammdaten und Verfahrenstechnik</h2><div class="form-grid">
      ${field("master.name","Name der Kläranlage",p.master.name)}
      ${field("master.internalNumber","Anlagennummer",p.master.internalNumber)}
      ${selectField("master.type","Anlagentyp",p.master.type,[["municipal","Kommunal"],["industrial","Industriell"],["mixed","Kommunal mit Industrieanteil"]])}
      ${field("master.industry","Branche bei Industrieanlage",p.master.industry)}
      ${field("master.capacityPE","Ausbaugröße [EW]",p.master.capacityPE,"number")}
      ${field("master.actualPE","Tatsächliche Belastung [EW]",p.master.actualPE,"number")}
      ${selectField("master.mainProcess","Hauptverfahren",p.master.mainProcess,mainProcessOptions)}
      ${multiSelectField("master.processStages","Weitere Verfahrensstufen",p.master.processStages,processStageOptions)}
      <label class="field-label span-2">Sonstige Verfahren / verfahrenstechnische Besonderheiten<textarea name="master.processOther">${esc(p.master.processOther)}</textarea></label>
      <label class="field-label span-2">Weitere Besonderheiten der Anlage<textarea name="master.notes">${esc(p.master.notes)}</textarea></label>
    </div></section>

    ${procedureCard(p,{preview:true})}

    <section class="form-section"><div class="section-heading"><div><h2>Anlagenadresse</h2><p class="form-note">Standort direkt vor Ort erfassen oder Adresse und Koordinaten manuell ergänzen.</p></div></div>
      <div class="location-capture-card">
        <div class="location-capture-copy"><span class="location-capture-icon" aria-hidden="true">⌖</span><div><strong>Standort automatisch übernehmen</strong><p>Das Smartphone ermittelt die GPS-Koordinaten. Bei Internetverbindung wird anschließend die Adresse ergänzt.</p></div></div>
        <button type="button" class="button primary location-capture-button" id="capturePlantLocation">Aktuellen Standort erfassen</button>
        <div id="locationCaptureStatus" class="location-status" role="status" aria-live="polite"></div>
      </div>
      <div class="form-grid">
      ${field("address.street","Straße und Hausnummer",p.address.street)}
      ${field("address.postalCode","Postleitzahl",p.address.postalCode)}
      ${field("address.city","Ort",p.address.city)}
      ${field("address.state","Bundesland",p.address.state)}
      ${field("address.country","Land",p.address.country)}
      ${field("address.latitude","Breitengrad",p.address.latitude,"number","z. B. 52,894321")}
      ${field("address.longitude","Längengrad",p.address.longitude,"number","z. B. 13,108765")}
      <label class="field-label">GPS-Genauigkeit<input name="address.accuracy" type="text" value="${esc(p.address.accuracy||"")}" placeholder="wird automatisch ermittelt" readonly></label>
      <label class="field-label">Erfasst am<input name="address.capturedAt" type="text" value="${esc(p.address.capturedAt||"")}" placeholder="wird automatisch ermittelt" readonly></label>
      <label class="field-label span-2">Abweichende Zufahrts-/Lieferadresse<textarea name="address.deliveryAddress">${esc(p.address.deliveryAddress)}</textarea></label>
    </div>
    <div id="locationPreview" class="location-preview" hidden></div>
    </section>
    <section class="form-section"><h2>Zufahrt und Besuch</h2><div class="form-grid">
      ${field("access.parking","Parkmöglichkeit",p.access?.parking||"")}
      ${field("access.gate","Tor / Zufahrt",p.access?.gate||"")}
      ${field("access.accessCode","Zugangscode / Schlüsselhinweis",p.access?.accessCode||"")}
      ${field("access.openingHours","Öffnungs- oder Besuchszeiten",p.access?.openingHours||"")}
      ${field("access.registration","Anmeldung / Pförtner",p.access?.registration||"")}
      ${field("access.ppe","Erforderliche PSA",p.access?.ppe||"")}
      ${field("access.truckAccess","LKW-Zufahrt",p.access?.truckAccess||"")}
      ${field("access.deliveryNotes","Hinweise für Lieferungen",p.access?.deliveryNotes||"")}
      <label class="field-label span-2">Besonderheiten vor Ort<textarea name="access.siteNotes">${esc(p.access?.siteNotes||"")}</textarea></label>
    </div></section>

    <section class="form-section"><h2>Betreiber</h2><div class="form-grid">
      ${field("operator.name","Betreibername",p.operator.name)}
      ${field("operator.legalForm","Rechtsform",p.operator.legalForm)}
      ${field("operator.customerNumber","Kundennummer",p.operator.customerNumber)}
      ${field("operator.association","Zweckverband",p.operator.association)}
      ${field("operator.owner","Eigentümer",p.operator.owner)}
      ${field("operator.operatingCompany","Betriebsführer",p.operator.operatingCompany)}
      ${field("operator.street","Straße und Hausnummer",p.operator.street)}
      ${field("operator.postalCode","Postleitzahl",p.operator.postalCode)}
      ${field("operator.city","Ort",p.operator.city)}
      ${field("operator.municipality","Gemeinde",p.operator.municipality)}
      ${field("operator.district","Landkreis",p.operator.district)}
      ${field("operator.state","Bundesland",p.operator.state)}
      ${field("operator.municipalityKey","Gemeindeschlüssel",p.operator.municipalityKey)}
      ${phoneField("operator.phoneParts","Telefon",p.operator.phone||"")}
      ${field("operator.email","Zentrale E-Mail",p.operator.email,"email")}
      ${field("operator.website","Internetseite",p.operator.website,"url")}
      <label class="field-label">Quelle der Ermittlung<input name="operator.lookupSource" type="text" value="${esc(p.operator.lookupSource||"")}" readonly></label>
      <label class="field-label">Datum der Ermittlung<input name="operator.lookupDate" type="text" value="${esc(p.operator.lookupDate||"")}" readonly></label>
      <label class="field-label">Trefferstatus<input name="operator.lookupStatus" type="text" value="${esc(p.operator.lookupStatus||"IDLE")}" readonly></label>
      <div id="operatorLookupStatus" class="operator-lookup-status"></div>
    </div></section>

    <section class="form-section"><div class="section-heading"><h2>Ansprechpartner</h2><button type="button" class="button secondary" id="addContact">Ansprechpartner hinzufügen</button></div>
      <div id="contactsEditor" class="contacts-editor"></div>
    </section>

    <section class="form-section technical-form-section"><div class="section-heading"><div><p class="eyebrow">Schlammbehandlung</p><h2>Schlammentwässerung</h2><p class="form-note">Maschine, Leistung und zugehörige Peripherie in der Anlagenakte dokumentieren.</p></div></div>
      <div class="toggle-panel">${checkboxField("sludgeDewatering.enabled","Schlammentwässerung vorhanden",p.sludgeDewatering.enabled)}</div>
      <div class="form-grid" id="dewateringFields">
        ${selectField("sludgeDewatering.status","Betriebsstatus",p.sludgeDewatering.status,[["active","In Betrieb"],["inactive","Außer Betrieb"],["reserve","Reserve"],["planned","Geplant"]])}
        ${selectField("sludgeDewatering.process","Verfahren",p.sludgeDewatering.process,[["screw-press","Schneckenpresse"],["belt-press","Siebbandpresse"],["filter-press","Kammerfilterpresse"],["centrifuge","Zentrifuge"],["mobile","Mobile Entwässerung"],["dryingBed","Trockenbeet"],["other","Sonstiges"]])}
        ${field("sludgeDewatering.manufacturer","Hersteller",p.sludgeDewatering.manufacturer)} ${field("sludgeDewatering.model","Typ / Modell",p.sludgeDewatering.model)}
        ${field("sludgeDewatering.year","Baujahr",p.sludgeDewatering.year,"number")} ${field("sludgeDewatering.unitCount","Anzahl Aggregate",p.sludgeDewatering.unitCount,"number")}
        ${selectField("sludgeDewatering.operationMode","Betriebsweise",p.sludgeDewatering.operationMode,[["continuous","Kontinuierlich"],["batch","Chargenweise"],["mobile","Mobil / extern"]])}
        ${field("sludgeDewatering.throughputM3h","Schlammdurchsatz [m³/h]",p.sludgeDewatering.throughputM3h,"number")}
        ${field("sludgeDewatering.inletTsPercent","Zulauf-TS [%]",p.sludgeDewatering.inletTsPercent,"number")} ${field("sludgeDewatering.outletTsPercent","Austrags-TS [%]",p.sludgeDewatering.outletTsPercent,"number")}
        ${field("sludgeDewatering.polymerKgPerTds","Polymer [kg WS/t TS]",p.sludgeDewatering.polymerKgPerTds,"number")} ${field("sludgeDewatering.operatingHours","Betriebsstunden [h/a]",p.sludgeDewatering.operatingHours,"number")}
        ${field("sludgeDewatering.sludgeQuantity","Schlammmenge [t/a oder m³/a]",p.sludgeDewatering.sludgeQuantity)} ${field("sludgeDewatering.filtrateRouting","Filtrat-/Zentratführung",p.sludgeDewatering.filtrateRouting)}
        <div class="span-2 check-grid">${checkboxField("sludgeDewatering.polymerStation","Polymerstation",p.sludgeDewatering.polymerStation)}${checkboxField("sludgeDewatering.feedPump","Beschickungspumpe",p.sludgeDewatering.feedPump)}${checkboxField("sludgeDewatering.conveyor","Fördertechnik",p.sludgeDewatering.conveyor)}${checkboxField("sludgeDewatering.container","Schlammcontainer",p.sludgeDewatering.container)}</div>
        <label class="field-label span-2">Bemerkungen<textarea name="sludgeDewatering.notes">${esc(p.sludgeDewatering.notes)}</textarea></label>
      </div>
    </section>

    <section class="form-section technical-form-section"><div class="section-heading"><div><p class="eyebrow">Chemikalienlagerung und Dosierung</p><h2>Dosiertechnik</h2><p class="form-note">Mehrere Tank- und Dosieranlagen können separat erfasst und einem Einsatzzweck zugeordnet werden.</p></div><button type="button" class="button secondary" id="addDosingSystem">Dosieranlage hinzufügen</button></div><div id="dosingSystemsEditor" class="dosing-editor"></div></section>

    <section class="form-section"><h2>Zentrale Betriebsparameter</h2><p class="form-note">Diese Werte bilden die gemeinsame Datenbasis für Ampeln und später die automatische Übernahme in Rechner.</p><div class="form-grid">
      ${field("parameters.flow","Volumenstrom m³/d",p.parameters.flow,"number")}
      ${field("parameters.pIn","Pges Zulauf mg/l",p.parameters.pIn,"number")}
      ${field("parameters.pOut","Pges Ablauf mg/l",p.parameters.pOut,"number")}
      ${field("parameters.pTarget","Betriebliches P-Ziel mg/l",p.parameters.pTarget,"number")}
      ${field("parameters.nh4Out","NH₄-N Ablauf mg/l",p.parameters.nh4Out,"number")}
      ${field("parameters.basinVolume","Belebungsvolumen m³",p.parameters.basinVolume,"number")}
      ${field("parameters.mlss","TS Belebung kg/m³",p.parameters.mlss,"number")}
      ${field("parameters.svi","SVI ml/g",p.parameters.svi,"number")}
      ${field("parameters.sludgeAge","Schlammalter d",p.parameters.sludgeAge,"number")}
      ${field("parameters.sludgeFlow","Schlammstrom m³/h",p.parameters.sludgeFlow,"number")}
      ${field("parameters.sludgeTs","TS Zulauf Entwässerung g/l",p.parameters.sludgeTs,"number")}
      ${field("parameters.cakeTs","Kuchen-TS %",p.parameters.cakeTs,"number")}
      ${field("parameters.retention","Feststoffrückhalt %",p.parameters.retention,"number")}
      ${field("parameters.polymer","Polymerverbrauch kg WS/t TS",p.parameters.polymer,"number")}
      ${field("parameters.disposalPrice","Entsorgungspreis €/t",p.parameters.disposalPrice,"number")}
      ${field("parameters.precipitantPrice","Fällmittelpreis €/t",p.parameters.precipitantPrice,"number")}
      ${field("parameters.operatingDays","Betriebstage pro Jahr",p.parameters.operatingDays,"number")}
    </div></section>

    <div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelPlant">Abbrechen</button><button type="submit" class="button primary">Anlage speichern</button></div>
  </form>`;

  const plantForm=$("#plantForm");
  if(!plantForm){
    console.error("Anlagenformular konnte nicht initialisiert werden");
    alert("Das Anlagenformular konnte nicht geladen werden. Bitte die App vollständig neu starten.");
    return;
  }
  enableDecimalInputs(appView);
  const numberInput=appView.querySelector('[name="master.internalNumber"]');
  if(numberInput)numberInput.readOnly=true;
  let dosingSystems=structuredClone(p.dosingSystems||[]).map(dosingDefaults);
  const dosingEditor=$("#dosingSystemsEditor");
  const syncDosingSystemsFromForm=()=>{
    dosingSystems=dosingSystems.map((current,i)=>{
      const out=dosingDefaults({id:current.id});
      for(const key of Object.keys(out)){
        if(key==="id")continue;
        const input=plantForm.elements.namedItem(`dosing.${i}.${key}`);
        if(!input){out[key]=current[key];continue;}
        out[key]=typeof out[key]==="boolean"?Boolean(input.checked):input.value;
      }
      return out;
    });
  };
  const renderDosingSystems=()=>{
    dosingEditor.innerHTML=dosingSystems.length?dosingSystems.map((d,i)=>`<article class="dosing-editor-card"><div class="contact-editor-head"><strong>${esc(d.name||`Dosieranlage ${i+1}`)}</strong><button type="button" data-remove-dosing="${i}">Entfernen</button></div>
      <div class="dosing-block"><h3>Zuordnung und Status</h3><div class="form-grid">${field(`dosing.${i}.name`,"Bezeichnung",d.name)}${selectField(`dosing.${i}.purpose`,"Verwendungszweck",d.purpose,[["polymer","Polymer"],["precipitant","Fällmittel"],["carbon","Kohlenstoffquelle"],["neutralization","Neutralisationsmittel"],["defoamer","Entschäumer"],["other","Sonstiges"]])}${selectField(`dosing.${i}.status`,"Betriebsstatus",d.status,[["active","In Betrieb"],["inactive","Außer Betrieb"],["reserve","Reserve"],["planned","Geplant"]])}${field(`dosing.${i}.location`,"Standort / Einbauort",d.location)}</div></div>
      <div class="dosing-block"><h3>Tankanlage</h3><div class="form-grid">${selectField(`dosing.${i}.tankType`,"Tankart",d.tankType,[["storage-tank","Lagertank"],["day-tank","Tagestank"],["ibc","IBC"],["double-wall","Doppelwandtank"],["other","Sonstiges"]])}${field(`dosing.${i}.tankVolume`,"Volumen [l]",d.tankVolume,"number")}${field(`dosing.${i}.tankManufacturer`,"Hersteller",d.tankManufacturer)}${field(`dosing.${i}.tankModel`,"Typ",d.tankModel)}${field(`dosing.${i}.tankYear`,"Baujahr",d.tankYear,"number")}${field(`dosing.${i}.tankMaterial`,"Material",d.tankMaterial)}<div class="span-2 check-grid">${checkboxField(`dosing.${i}.doubleWalled`,"Doppelwandig",d.doubleWalled)}${checkboxField(`dosing.${i}.bundPresent`,"Auffangwanne",d.bundPresent)}${checkboxField(`dosing.${i}.levelMonitoring`,"Füllstandsüberwachung",d.levelMonitoring)}${checkboxField(`dosing.${i}.leakageMonitoring`,"Leckageüberwachung",d.leakageMonitoring)}</div>${field(`dosing.${i}.lastInspection`,"Letzte Prüfung",d.lastInspection,"date")}${field(`dosing.${i}.nextInspection`,"Nächste Prüfung",d.nextInspection,"date")}</div></div>
      <div class="dosing-block"><h3>Dosierstation</h3><div class="form-grid">${field(`dosing.${i}.stationManufacturer`,"Hersteller",d.stationManufacturer)}${field(`dosing.${i}.stationModel`,"Typ",d.stationModel)}${field(`dosing.${i}.stationYear`,"Baujahr",d.stationYear,"number")}${selectField(`dosing.${i}.pumpType`,"Pumpenart",d.pumpType,[["diaphragm","Membrandosierpumpe"],["hose","Schlauchpumpe"],["progressive-cavity","Exzenterschneckenpumpe"],["piston","Kolbenpumpe"],["other","Sonstige"]])}${field(`dosing.${i}.pumpCount`,"Anzahl Dosierpumpen",d.pumpCount,"number")}${field(`dosing.${i}.capacityLh`,"Förderleistung [l/h]",d.capacityLh,"number")}${field(`dosing.${i}.maxPressureBar`,"Maximaldruck [bar]",d.maxPressureBar,"number")}${selectField(`dosing.${i}.controlMode`,"Betriebsweise",d.controlMode,[["constant","Konstant"],["flow-proportional","Durchflussproportional"],["measured-value","Messwertgeführt"],["manual","Manuell"]])}<div class="span-2 check-grid">${checkboxField(`dosing.${i}.standbyPump`,"Reservepumpe",d.standbyPump)}${checkboxField(`dosing.${i}.automaticChangeover`,"Automatische Umschaltung",d.automaticChangeover)}${checkboxField(`dosing.${i}.calibrationDevice`,"Kalibriereinrichtung",d.calibrationDevice)}${checkboxField(`dosing.${i}.flushConnection`,"Spülanschluss",d.flushConnection)}${checkboxField(`dosing.${i}.pressureHoldingValve`,"Druckhalteventil",d.pressureHoldingValve)}${checkboxField(`dosing.${i}.overflowValve`,"Überströmventil",d.overflowValve)}${checkboxField(`dosing.${i}.pulsationDamper`,"Pulsationsdämpfer",d.pulsationDamper)}</div></div></div>
      <div class="dosing-block"><h3>Medium und MSR-Technik</h3><div class="form-grid">${field(`dosing.${i}.productName`,"Produktname",d.productName)}${field(`dosing.${i}.activeIngredient`,"Wirkstoff",d.activeIngredient)}${field(`dosing.${i}.concentrationPercent`,"Konzentration [%]",d.concentrationPercent,"number")}${field(`dosing.${i}.densityKgL`,"Dichte [kg/l]",d.densityKgL,"number")}${field(`dosing.${i}.consumption`,"Verbrauch pro Tag / Woche / Monat",d.consumption)}${field(`dosing.${i}.controlledValue`,"Zugehöriger Messwert",d.controlledValue)}<div class="span-2 check-grid">${checkboxField(`dosing.${i}.hazardous`,"Gefahrstoff",d.hazardous)}${checkboxField(`dosing.${i}.safetyDataSheetAvailable`,"Sicherheitsdatenblatt vorhanden",d.safetyDataSheetAvailable)}${checkboxField(`dosing.${i}.flowMeter`,"Durchflussmesser",d.flowMeter)}${checkboxField(`dosing.${i}.levelSensor`,"Füllstandssonde",d.levelSensor)}${checkboxField(`dosing.${i}.dryRunProtection`,"Trockenlaufschutz",d.dryRunProtection)}${checkboxField(`dosing.${i}.pressureMonitoring`,"Drucküberwachung",d.pressureMonitoring)}${checkboxField(`dosing.${i}.leakageSensor`,"Leckagesensor",d.leakageSensor)}${checkboxField(`dosing.${i}.plcConnected`,"SPS-Anbindung",d.plcConnected)}${checkboxField(`dosing.${i}.remoteAlarm`,"Fern-/Störmeldung",d.remoteAlarm)}</div><label class="field-label span-2">Bemerkungen<textarea name="dosing.${i}.notes">${esc(d.notes)}</textarea></label></div></div></article>`).join(''):`<div class="empty-panel compact"><p>Noch keine Dosieranlage angelegt.</p></div>`;
    $$('[data-remove-dosing]').forEach(b=>b.onclick=()=>{syncDosingSystemsFromForm();dosingSystems.splice(Number(b.dataset.removeDosing),1);renderDosingSystems();enableDecimalInputs(dosingEditor)});
    enableDecimalInputs(dosingEditor);
  };
  renderDosingSystems();
  $("#addDosingSystem").onclick=()=>{syncDosingSystemsFromForm();dosingSystems.push(dosingDefaults({name:`Dosieranlage ${dosingSystems.length+1}`}));renderDosingSystems()};
  const dewateringEnabled=plantForm.elements.namedItem("sludgeDewatering.enabled"),dewateringFields=$("#dewateringFields");
  const syncDewateringVisibility=()=>{dewateringFields.classList.toggle("disabled-section",!dewateringEnabled.checked);dewateringFields.querySelectorAll("input,select,textarea").forEach(el=>el.disabled=!dewateringEnabled.checked)};
  dewateringEnabled.onchange=syncDewateringVisibility;syncDewateringVisibility();
  let contacts=structuredClone(p.contacts||[]);
  const editor=$("#contactsEditor");
  const syncContactsFromForm=()=>{
    contacts=contacts.map((current,i)=>({
      ...current,
      name:plantForm.elements.namedItem(`contact.${i}.name`)?.value||"",
      role:plantForm.elements.namedItem(`contact.${i}.role`)?.value||"",
      department:plantForm.elements.namedItem(`contact.${i}.department`)?.value||"",
      email:plantForm.elements.namedItem(`contact.${i}.email`)?.value||"",
      preferred:plantForm.elements.namedItem(`contact.${i}.preferred`)?.value||"email",
      notes:plantForm.elements.namedItem(`contact.${i}.notes`)?.value||"",
      phone:[plantForm.elements.namedItem(`contact.${i}.phoneParts.code`)?.value||"",plantForm.elements.namedItem(`contact.${i}.phoneParts.number`)?.value||""].filter(Boolean).join(" ").trim(),
      mobile:[plantForm.elements.namedItem(`contact.${i}.mobileParts.code`)?.value||"",plantForm.elements.namedItem(`contact.${i}.mobileParts.number`)?.value||""].filter(Boolean).join(" ").trim()
    }));
  };
  const renderContacts=()=>{
    editor.innerHTML=contacts.length?contacts.map((c,i)=>`<article class="contact-editor-card">
      <div class="contact-editor-head"><strong>Ansprechpartner ${i+1}</strong><button type="button" data-remove-contact="${i}">Entfernen</button></div>
      <div class="form-grid">
        ${field(`contact.${i}.name`,"Name",c.name||"")}
        ${field(`contact.${i}.role`,"Funktion",c.role||"")}
        ${field(`contact.${i}.department`,"Bereich",c.department||"")}
        ${phoneField(`contact.${i}.phoneParts`,"Telefon",c.phone||"")}
        ${phoneField(`contact.${i}.mobileParts`,"Mobil",c.mobile||"")}
        ${field(`contact.${i}.email`,"E-Mail",c.email||"","email")}
        ${selectField(`contact.${i}.preferred`,"Bevorzugter Kontakt",c.preferred||"email",[["email","E-Mail"],["phone","Telefon"],["mobile","Mobil"]])}
        ${field(`contact.${i}.notes`,"Bemerkung",c.notes||"")}
      </div></article>`).join(""):`<p class="empty-inline">Noch kein Ansprechpartner hinterlegt.</p>`;
    $$("[data-remove-contact]").forEach(b=>b.onclick=()=>{syncContactsFromForm();contacts.splice(Number(b.dataset.removeContact),1);renderContacts()});
  };
  renderContacts();
  $("#addContact").onclick=()=>{syncContactsFromForm();contacts.push({name:"",role:"",department:"",phone:"",mobile:"",email:"",preferred:"email",notes:""});renderContacts()};

  const locationStatus=$("#locationCaptureStatus");
  const locationPreview=$("#locationPreview");
  const locationButton=$("#capturePlantLocation");
  const formInput=name=>plantForm.elements.namedItem(name);
  const setInput=(name,value)=>{const input=formInput(name);if(input)input.value=value??""};
  const getInput=name=>String(formInput(name)?.value||"").trim();
  const parseCoordinate=value=>{
    const raw=String(value??"").trim().replace(",", ".");
    if(raw==="")return null;
    const n=Number(raw);
    return Number.isFinite(n)?n:null;
  };
  const setLocationStatus=(message,kind="info")=>{
    locationStatus.className=`location-status ${kind}`;
    locationStatus.textContent=message;
  };
  const formatCapturedAt=iso=>iso?new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short"}).format(new Date(iso)):"";
  const renderLocationPreview=()=>{
    const lat=parseCoordinate(getInput("address.latitude"));
    const lon=parseCoordinate(getInput("address.longitude"));
    if(lat===null||lon===null){locationPreview.hidden=true;locationPreview.innerHTML="";return;}
    const query=encodeURIComponent(`${lat},${lon}`);
    locationPreview.hidden=false;
    locationPreview.innerHTML=`<div class="location-preview-head"><div><strong>Standort prüfen</strong><span>${lat.toFixed(6)}, ${lon.toFixed(6)}</span></div><a class="button secondary" href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener">In Karte öffnen</a></div><iframe class="location-preview-map" title="Erfasster Anlagenstandort" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${query}&output=embed"></iframe><p class="location-attribution">Die automatisch ermittelte Adresse ist ein Vorschlag und sollte vor dem Speichern geprüft werden.</p>`;
  };
  const operatorLookupStatus=$("operatorLookupStatus");
  const setOperatorLookupStatus=(message,kind="info")=>{
    if(!operatorLookupStatus) return;
    operatorLookupStatus.className=`location-status operator-lookup-status ${kind}`;
    operatorLookupStatus.textContent=message;
  };
  const getFormCoordinates=()=>{
    const lat=parseCoordinate(formInput("address.latitude")?.value||"");
    const lon=parseCoordinate(formInput("address.longitude")?.value||"");
    return {latitude:lat,longitude:lon};
  };
  const formatCoordinateKey=(latitude,longitude)=>{
    const lat=parseCoordinate(latitude);
    const lon=parseCoordinate(longitude);
    if(lat===null||lon===null)return "";
    return `${lat.toFixed(6)},${lon.toFixed(6)}`;
  };
  const loadReverseGeocodeCache=()=>{
    try{
      const data=JSON.parse(localStorage.getItem(STORAGE_REVERSE_GEOCODE_CACHE)||"{}");
      return data&&typeof data==="object"?data:{};
    }catch{return {}}
  };
  const saveReverseGeocodeCache=cache=>{
    try{localStorage.setItem(STORAGE_REVERSE_GEOCODE_CACHE,JSON.stringify(cache));}catch{}
  };
  let geocodeResolveTimer=null;
  let lastResolvedCoordinate="";
  const selectLookupMatch=matches=>{
    if(!Array.isArray(matches)||matches.length<=1)return matches?.[0]||null;
    const options=matches.map((match,index)=>`${index+1}: ${match.operator||"Unbekannt"}${match.municipality?` (${match.municipality})`:""}`).join("\n");
    const raw=prompt(`Mehrere mögliche Betreiber gefunden\n\n${options}\n\nBitte Nummer eingeben:`);
    const index=Number(raw)-1;
    return Number.isInteger(index)&&index>=0&&index<matches.length?matches[index]:matches[0];
  };
  const populateOperatorFieldsIfBlank=operator=>{
    if(!operator) return;
    if(!getInput("operator.name")&&operator.operator)setInput("operator.name",operator.operator);
    if(!getInput("operator.association")&&operator.association)setInput("operator.association",operator.association);
    if(!getInput("operator.owner")&&operator.owner)setInput("operator.owner",operator.owner);
    if(!getInput("operator.operatingCompany")&&operator.operatingCompany)setInput("operator.operatingCompany",operator.operatingCompany);
    if(!getInput("operator.municipality")&&operator.municipality)setInput("operator.municipality",operator.municipality);
    if(!getInput("operator.district")&&operator.district)setInput("operator.district",operator.district);
    if(!getInput("operator.state")&&operator.state)setInput("operator.state",operator.state);
    if(!getInput("operator.municipalityKey")&&operator.municipalityKey)setInput("operator.municipalityKey",operator.municipalityKey);
    if(!getInput("operator.email")&&operator.email)setInput("operator.email",operator.email);
    if(!getInput("operator.website")&&operator.website)setInput("operator.website",operator.website);
    if(!getInput("operator.lookupSource")&&operator.lookupSource)setInput("operator.lookupSource",operator.lookupSource);
    if(!getInput("operator.lookupDate")&&operator.lookupDate)setInput("operator.lookupDate",operator.lookupDate);
    if(!getInput("operator.lookupStatus")&&operator.lookupStatus)setInput("operator.lookupStatus",operator.lookupStatus);
    if(operator.phone&&!getInput("operator.phoneParts.number")){
      const parts=phoneParts(operator.phone);
      setInput("operator.phoneParts.code",parts.code);
      setInput("operator.phoneParts.number",parts.number);
    }
  };
  const performOperatorLookup=async({force=false}={})=>{
    const {latitude,longitude}=getFormCoordinates();
    const coordinates=formatCoordinateKey(latitude,longitude);
    if(!coordinates){
      setOperatorLookupStatus("Koordinaten fehlen. Betreiber/Verband kann nicht automatisch gesucht werden.","warning");
      return null;
    }
    if(!navigator.onLine){
      setOperatorLookupStatus("Keine Internetverbindung. Betreiber-Suche kann später ausgeführt werden.","warning");
      return null;
    }
    const currentLookup=p.operatorLookup||{};
    if(!force && currentLookup.coordinates===coordinates && currentLookup.status!=="idle" && currentLookup.status!=="error"){
      if(currentLookup.status==="found"){
        setOperatorLookupStatus(`Betreiber zuletzt gefunden: ${currentLookup.operator?.name||"Unbekannt"}`,"success");
      } else if(currentLookup.status==="not-found"){
        setOperatorLookupStatus("Kein Betreiber automatisch gefunden.","warning");
      } else {
        setOperatorLookupStatus(`Betreiber-Suche zuletzt ausgeführt: ${currentLookup.status}`,"info");
      }
      return currentLookup;
    }
    setOperatorLookupStatus("Betreiber/Verband wird automatisch gesucht …","loading");
    p.operatorLookup={status:"loading",provider:"osm-nominatim",checkedAt:"",coordinates,found:false,error:"",operator:currentLookup.operator||{}};
    try{
      const lookup=await operatorLookupService.lookupByCoordinates(latitude,longitude);
      p.operatorLookup={
        status:lookup.lookupStatus==="AUTO"?"found":"not-found",
        provider:lookup.lookupSource||"osm-nominatim",
        checkedAt:lookup.lookupDate||new Date().toISOString(),
        coordinates,
        found:lookup.lookupStatus==="AUTO",
        error:"",
        operator:{
          name:lookup.operator||"",
          phone:lookup.phone||"",
          email:lookup.email||"",
          website:lookup.website||""
        }
      };
      if(lookup.lookupStatus==="AUTO"){
        const selected=selectLookupMatch(lookup.matches)||lookup;
        populateOperatorFieldsIfBlank(selected);
        setInput("operator.lookupStatus","AUTO");
        setOperatorLookupStatus(`Betreiber gefunden: ${selected.operator}${selected.municipality?`, ${selected.municipality}`:""}`,"success");
      } else {
        setInput("operator.lookupStatus","NOT_FOUND");
        setOperatorLookupStatus("Kein Betreiber automatisch gefunden. Bitte manuell ergänzen.","warning");
      }
      return lookup;
    }catch(error){
      p.operatorLookup={status:"error",provider:"osm-nominatim",checkedAt:new Date().toISOString(),coordinates,found:false,error:String(error?.message||error),operator:currentLookup.operator||{}};
      setInput("operator.lookupStatus","NOT_FOUND");
      setOperatorLookupStatus("Betreiber-Suche fehlgeschlagen. Bitte prüfen Sie die Verbindung.","error");
      console.warn("Operator lookup failed",error);
      return p.operatorLookup;
    }
  };
  const reverseGeocode=async(latitude,longitude)=>{
    const endpoint=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=de&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const response=await fetch(endpoint,{headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error(`Adressdienst antwortet mit Status ${response.status}`);
    return response.json();
  };
  const applyReverseAddress=data=>{
    const a=data?.address||{};
    const road=a.road||a.pedestrian||a.residential||a.path||a.cycleway||"";
    const street=[road,a.house_number].filter(Boolean).join(" ");
    const city=a.city||a.town||a.village||a.municipality||a.hamlet||"";
    if(street)setInput("address.street",street);
    if(a.postcode)setInput("address.postalCode",a.postcode);
    if(city)setInput("address.city",city);
    if(a.state)setInput("address.state",a.state);
    if(a.country)setInput("address.country",a.country);
    const nameInput=formInput("master.name");
    if(nameInput&&!nameInput.value.trim()&&city)nameInput.value=`Kläranlage ${city}`;
  };
  const hydrateAddressFromCoordinates=async({forceNetwork=false,silent=false}={})=>{
    const {latitude,longitude}=getFormCoordinates();
    const coordinates=formatCoordinateKey(latitude,longitude);
    if(!coordinates)return false;
    const cache=loadReverseGeocodeCache();
    const cached=cache[coordinates];
    if(cached?.data){
      applyReverseAddress(cached.data);
      if(cached.cachedAt){
        p.address.geocodedAt=cached.cachedAt;
      }
      if(!silent)setLocationStatus("Adresse aus lokalem Zwischenspeicher übernommen.","info");
    }
    if(!forceNetwork && cached?.data){
      lastResolvedCoordinate=coordinates;
      return true;
    }
    if(!navigator.onLine){
      if(!cached?.data&&!silent)setLocationStatus("Keine Internetverbindung. Adresse kann später ergänzt werden.","warning");
      return Boolean(cached?.data);
    }
    const data=await reverseGeocode(latitude,longitude);
    applyReverseAddress(data);
    const cachedAt=new Date().toISOString();
    p.address.geocodedAt=cachedAt;
    cache[coordinates]={cachedAt,data};
    const keys=Object.keys(cache);
    if(keys.length>160){
      keys.sort((a,b)=>String(cache[a]?.cachedAt||"").localeCompare(String(cache[b]?.cachedAt||"")));
      keys.slice(0,keys.length-120).forEach(key=>delete cache[key]);
    }
    saveReverseGeocodeCache(cache);
    lastResolvedCoordinate=coordinates;
    if(!silent)setLocationStatus("Standort und Adresse wurden übernommen. Bitte die Angaben vor dem Speichern prüfen.","success");
    return true;
  };
  locationButton.onclick=()=>{
    if(!window.isSecureContext){setLocationStatus("Die Standortermittlung ist nur über HTTPS oder localhost verfügbar. Bitte die bereitgestellte Web-App öffnen, nicht die HTML-Datei direkt.","error");return;}
    if(!navigator.geolocation){setLocationStatus("Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.","error");return;}
    locationButton.disabled=true;
    locationButton.textContent="Standort wird ermittelt …";
    setLocationStatus("GPS-Signal wird gesucht. Dies kann im Gebäude etwas länger dauern.","loading");
    navigator.geolocation.getCurrentPosition(async position=>{
      const {latitude,longitude,accuracy}=position.coords;
      const capturedAt=new Date(position.timestamp||Date.now()).toISOString();
      setInput("address.latitude",latitude.toFixed(6));
      setInput("address.longitude",longitude.toFixed(6));
      setInput("address.accuracy",`± ${Math.round(accuracy)} m`);
      setInput("address.capturedAt",formatCapturedAt(capturedAt));
      p.address.capturedAt=capturedAt;
      p.address.accuracy=String(Math.round(accuracy));
      renderLocationPreview();
      if(!navigator.onLine){setLocationStatus(`Koordinaten gespeichert (Genauigkeit ± ${Math.round(accuracy)} m). Keine Internetverbindung – die Adresse kann später manuell ergänzt werden.`,"warning");locationButton.disabled=false;locationButton.textContent="Standort erneut erfassen";return;}
      setLocationStatus(`Koordinaten erfasst (Genauigkeit ± ${Math.round(accuracy)} m). Adresse wird ermittelt …`,"loading");
      try{
        await hydrateAddressFromCoordinates({forceNetwork:true});
        await performOperatorLookup({force:true});
      }catch(error){
        console.warn("Rückwärts-Geokodierung fehlgeschlagen",error);
        setLocationStatus("Die Koordinaten wurden gespeichert, aber die Adresse konnte nicht automatisch ermittelt werden. Sie kann manuell ergänzt werden.","warning");
      }finally{
        locationButton.disabled=false;
        locationButton.textContent="Standort erneut erfassen";
      }
    },error=>{
      const messages={1:"Standortfreigabe wurde verweigert. Bitte die Berechtigung im Browser aktivieren oder die Daten manuell eintragen.",2:"Der Standort konnte nicht bestimmt werden. Bitte nach draußen gehen oder GPS aktivieren.",3:"Die Standortermittlung hat zu lange gedauert. Bitte erneut versuchen."};
      setLocationStatus(messages[error.code]||"Der Standort konnte nicht ermittelt werden.","error");
      locationButton.disabled=false;
      locationButton.textContent="Standort erneut erfassen";
    },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };
  ["address.latitude","address.longitude"].forEach(name=>{
    const input=formInput(name);
    if(!input)return;
    input.addEventListener("input",()=>{
      renderLocationPreview();
      if(geocodeResolveTimer)clearTimeout(geocodeResolveTimer);
      geocodeResolveTimer=setTimeout(()=>{
        hydrateAddressFromCoordinates({silent:true})
          .then(resolved=>{if(resolved)return performOperatorLookup();})
          .catch(error=>console.warn("Automatische Adressauflösung fehlgeschlagen",error));
      },700);
    });
    input.addEventListener("blur",()=>{
      const coordinates=formatCoordinateKey(getInput("address.latitude"),getInput("address.longitude"));
      if(!coordinates||coordinates===lastResolvedCoordinate)return;
      hydrateAddressFromCoordinates({silent:false})
        .then(resolved=>{if(resolved)return performOperatorLookup();})
        .catch(error=>console.warn("Adressauflösung beim Verlassen des Feldes fehlgeschlagen",error));
    });
  });
  [
    "operator.name","operator.legalForm","operator.customerNumber","operator.association","operator.owner","operator.operatingCompany",
    "operator.street","operator.postalCode","operator.city","operator.municipality","operator.district","operator.state","operator.municipalityKey",
    "operator.email","operator.website"
  ].forEach(name=>formInput(name)?.addEventListener("input",()=>setInput("operator.lookupStatus","MANUAL")));
  formInput("operator.phoneParts.number")?.addEventListener("input",()=>setInput("operator.lookupStatus","MANUAL"));
  renderLocationPreview();
  const initialCoordinates=getFormCoordinates();
  if(initialCoordinates.latitude!==null && initialCoordinates.longitude!==null){
    hydrateAddressFromCoordinates({silent:true})
      .then(()=>performOperatorLookup())
      .catch(error=>console.warn("Automatische Adress-/Betreibersuche beim Laden der Anlage fehlgeschlagen",error));
  }
  $("#cancelPlant").onclick=()=>existing?showPlantDashboard():showApplication("plants");
  plantForm.addEventListener("invalid",event=>{
    event.preventDefault();
    const label=event.target.closest("label")?.childNodes?.[0]?.textContent?.trim()||"Eingabefeld";
    alert(`Bitte das Feld „${label}“ prüfen. Dezimalwerte können mit Punkt oder Komma eingegeben werden.`);
    event.target.focus();
  },true);
  plantForm.onsubmit=e=>{
    e.preventDefault();
    syncDosingSystemsFromForm();
    const fd=new FormData(e.currentTarget);
    const result=existing?structuredClone(existing):p;
    result.access=result.access||{};
    for(const [key,value] of fd.entries()){
      if(key.startsWith("contact.")||key.startsWith("dosing.")||key.startsWith("sludgeDewatering.")||key.startsWith("tank."))continue;
      if(key==="master.processStages")continue;
      if(key.startsWith("operator.phoneParts."))continue;
      const [section,prop]=key.split(".");
      result[section][prop]=value;
    }
    result.master.processStages=fd.getAll("master.processStages");
    result.master.process=result.master.processOther||processLabel(result.master.mainProcess);
    const latitudeRaw=String(formInput("address.latitude")?.value||"").trim().replace(",",".");
    const longitudeRaw=String(formInput("address.longitude")?.value||"").trim().replace(",",".");
    const latitude=latitudeRaw===""?null:Number(latitudeRaw);
    const longitude=longitudeRaw===""?null:Number(longitudeRaw);
    if(latitude!==null&&(!Number.isFinite(latitude)||latitude<-90||latitude>90))return alert("Der Breitengrad muss zwischen -90 und +90 liegen.");
    if(longitude!==null&&(!Number.isFinite(longitude)||longitude<-180||longitude>180))return alert("Der Längengrad muss zwischen -180 und +180 liegen.");
    result.address.latitude=latitudeRaw;
    result.address.longitude=longitudeRaw;
    result.address.gps=latitudeRaw&&longitudeRaw?`${latitudeRaw}, ${longitudeRaw}`:result.address.gps||"";
    result.address.accuracy=p.address.accuracy||String(result.address.accuracy||"").replace(/[^0-9.,]/g,"");
    result.address.capturedAt=p.address.capturedAt||result.address.capturedAt||"";
    result.address.geocodedAt=p.address.geocodedAt||result.address.geocodedAt||"";
    result.operatorLookup=result.operatorLookup||p.operatorLookup||{};
    const previousCoordinates=formatCoordinateKey(
      Number((existing?.address?.latitude||"").trim().replace(",",".")),
      Number((existing?.address?.longitude||"").trim().replace(",","."))
    );
    const currentCoordinates=formatCoordinateKey(latitude,longitude);
    const shouldLookup=Boolean(currentCoordinates)&&currentCoordinates!==previousCoordinates;
    if(shouldLookup){
      result.operatorLookup={...result.operatorLookup,coordinates:currentCoordinates,status:"pending",provider:"osm-nominatim",checkedAt:"",found:false,error:""};
      performOperatorLookup().then(lookup=>{
        if(lookup?.lookupStatus==="AUTO"){
          result.operator={
            ...result.operator,
            name:lookup.operator||result.operator.name,
            association:lookup.association||result.operator.association,
            owner:lookup.owner||result.operator.owner,
            operatingCompany:lookup.operatingCompany||result.operator.operatingCompany,
            municipality:lookup.municipality||result.operator.municipality,
            district:lookup.district||result.operator.district,
            state:lookup.state||result.operator.state,
            municipalityKey:lookup.municipalityKey||result.operator.municipalityKey,
            website:lookup.website||result.operator.website,
            phone:lookup.phone||result.operator.phone,
            email:lookup.email||result.operator.email,
            lookupSource:lookup.lookupSource||"osm-nominatim",
            lookupDate:lookup.lookupDate||new Date().toISOString(),
            lookupStatus:"AUTO"
          };
          result.operatorLookup={...result.operatorLookup,status:"found",checkedAt:result.operator.lookupDate,found:true,error:""};
        }else{
          result.operator.lookupStatus="NOT_FOUND";
          result.operatorLookup={...result.operatorLookup,status:"not-found",checkedAt:new Date().toISOString(),found:false,error:""};
        }
        result.updatedAt=new Date().toISOString();
        if(savePlants())showPlantDashboard();
      }).catch(error=>{
        result.operator.lookupStatus="NOT_FOUND";
        result.operatorLookup={...result.operatorLookup,status:"error",checkedAt:new Date().toISOString(),found:false,error:String(error?.message||error)};
        console.warn("Operator-Lookup beim Speichern fehlgeschlagen",error);
      });
    }
    const dewatering=dewateringDefaults(result.sludgeDewatering||p.sludgeDewatering||{});
    dewatering.enabled=fd.has("sludgeDewatering.enabled");
    for(const key of Object.keys(dewatering)){
      if(key==="enabled")continue;
      const fieldName=`sludgeDewatering.${key}`;
      if(typeof dewatering[key]==="boolean")dewatering[key]=fd.has(fieldName);
      else if(fd.has(fieldName))dewatering[key]=fd.get(fieldName)||"";
    }
    result.sludgeDewatering=dewatering;
    result.dosingSystems=structuredClone(dosingSystems).map(dosingDefaults);
    result.tankSystems=Array.isArray(result.tankSystems)?result.tankSystems.map(tankDefaults):[];
    result.operator.phone=combinePhone(fd,"operator.phoneParts");
    result.operator.lookupStatus=String(fd.get("operator.lookupStatus")||result.operator.lookupStatus||"IDLE");
    result.operator.lookupSource=String(fd.get("operator.lookupSource")||result.operator.lookupSource||"");
    result.operator.lookupDate=String(fd.get("operator.lookupDate")||result.operator.lookupDate||"");
    result.contacts=contacts.map((c,i)=>{
      const obj={};
      for(const prop of ["name","role","department","email","preferred","notes"]){
        obj[prop]=fd.get(`contact.${i}.${prop}`)||"";
      }
      obj.phone=combinePhone(fd,`contact.${i}.phoneParts`);
      obj.mobile=combinePhone(fd,`contact.${i}.mobileParts`);
      return obj;
    });
    result.updatedAt=new Date().toISOString();
    if(existing)plants=plants.map(x=>x.id===result.id?result:x);else plants.push(result);
    activePlantId=result.id;if(savePlants())showPlantDashboard();
  };
}
function getEvaluation(limit,value){
  const n=Number(String(value).replace(",","."));if(!Number.isFinite(n)||value==="")return {level:"gray",label:"Keine Bewertung",reason:"Messwert fehlt"};
  if(limit.direction==="max"){
    if(n<=Number(limit.target))return {level:"green",label:"Im Zielbereich",reason:`≤ ${fmt(limit.target)} ${limit.unit}`};
    if(n<=Number(limit.warning))return {level:"yellow",label:"Beobachten",reason:`über Ziel, bis ${fmt(limit.warning)} ${limit.unit}`};
    if(limit.legal!==null&&limit.legal!==""&&n>Number(limit.legal))return {level:"red",label:"Grenzwert überschritten",reason:`> ${fmt(limit.legal)} ${limit.unit}`};
    return {level:"red",label:"Handlungsbedarf",reason:`> ${fmt(limit.warning)} ${limit.unit}`};
  }
  if(limit.direction==="min"){
    if(n>=Number(limit.target))return {level:"green",label:"Im Zielbereich",reason:`≥ ${fmt(limit.target)} ${limit.unit}`};
    if(n>=Number(limit.warning))return {level:"yellow",label:"Beobachten",reason:`unter Ziel, mindestens ${fmt(limit.warning)} ${limit.unit}`};
    return {level:"red",label:"Handlungsbedarf",reason:`< ${fmt(limit.warning)} ${limit.unit}`};
  }
  if(n>=Number(limit.greenMin)&&n<=Number(limit.greenMax))return {level:"green",label:"Im Zielbereich",reason:`${fmt(limit.greenMin)}–${fmt(limit.greenMax)} ${limit.unit}`};
  if(n>=Number(limit.warningMin)&&n<=Number(limit.warningMax))return {level:"yellow",label:"Beobachten",reason:`außer Ziel, innerhalb Warnbereich`};
  return {level:"red",label:"Handlungsbedarf",reason:`außer ${fmt(limit.warningMin)}–${fmt(limit.warningMax)} ${limit.unit}`};
}
function evaluations(plant){
  return (plant.limits||defaultLimits).map(limit=>({...limit,value:plant.parameters[limit.key],evaluation:getEvaluation(limit,plant.parameters[limit.key])}));
}
function renderTrafficSummary(plant){
  const evals=evaluations(plant);
  const tally={green:0,yellow:0,red:0,gray:0};evals.forEach(e=>tally[e.evaluation.level]++);
  return `<div class="traffic-summary">
    <div class="traffic-total"><span class="traffic-light green"></span><strong>${tally.green}</strong><small>im Ziel</small></div>
    <div class="traffic-total"><span class="traffic-light yellow"></span><strong>${tally.yellow}</strong><small>beobachten</small></div>
    <div class="traffic-total"><span class="traffic-light red"></span><strong>${tally.red}</strong><small>prüfen</small></div>
    <div class="traffic-total"><span class="traffic-light gray"></span><strong>${tally.gray}</strong><small>ohne Wert</small></div>
  </div>`;
}

function visitStatusLabel(status){
  return status==="done"?"Erledigt":status==="cancelled"?"Abgesagt":"Geplant";
}
function visitStatusClass(status){
  return status==="done"?"green":status==="cancelled"?"gray":"blue";
}
function isoDateOffset(days){
  const date=new Date();
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()+days);
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}
function hasFollowUpAction(plant,followUpType,followUpSourceId){
  return (plant.actions||[]).some(action=>action.followUpType===followUpType&&action.followUpSourceId===followUpSourceId);
}
function createFollowUpAction(plant,payload){
  const followUpType=payload.followUpType||"";
  const followUpSourceId=payload.followUpSourceId||"";
  if(followUpType&&followUpSourceId&&hasFollowUpAction(plant,followUpType,followUpSourceId)) return false;
  plant.actions=[...(plant.actions||[]),{
    id:makeId(),
    title:payload.title,
    status:"open",
    priority:payload.priority||"normal",
    dueDate:payload.dueDate||"",
    component:payload.component||"",
    sourceVisitId:payload.sourceVisitId||"",
    createdAt:new Date().toISOString(),
    completedAt:"",
    autoGenerated:true,
    followUpType,
    followUpSourceId
  }];
  return true;
}
function ensureTankOfferFollowUps(plant){
  const signals=tankOfferSignals(plant);
  let created=false;
  signals.forEach(signal=>{
    const dueDays=signal.level==="red"?3:7;
    const offerTitle=`Tankerneuerung anbieten: ${signal.name} (${signal.medium})`;
    const wasCreated=createFollowUpAction(plant,{
      title:offerTitle,
      priority:signal.level==="red"?"high":"normal",
      dueDate:isoDateOffset(dueDays),
      component:"Vertrieb",
      sourceVisitId:"",
      followUpType:"tank-approval-offer",
      followUpSourceId:signal.id
    });
    if(wasCreated) created=true;
  });
  return created;
}
function ensureVisitCompletionFollowUp(plant,visit){
  const visitTitle=String(visit?.title||"Besuch").trim();
  return createFollowUpAction(plant,{
    title:`Nachbereitung ${visitTitle}: Ergebnisse prüfen und nächste Bestellung anstoßen`,
    priority:"normal",
    dueDate:isoDateOffset(VISIT_FOLLOW_UP_DAYS),
    component:"Nachbereitung",
    sourceVisitId:visit?.id||"",
    followUpType:"visit-completion",
    followUpSourceId:visit?.id||""
  });
}
function ensureTaskCompletionFollowUp(plant,task){
  if(task?.autoGenerated) return false;
  const taskTitle=String(task?.title||"Aufgabe").trim();
  return createFollowUpAction(plant,{
    title:`Wirksamkeit prüfen: ${taskTitle}`,
    priority:"normal",
    dueDate:isoDateOffset(TASK_FOLLOW_UP_DAYS),
    component:"Follow-up",
    sourceVisitId:task?.sourceVisitId||"",
    followUpType:"task-completion",
    followUpSourceId:task?.id||""
  });
}
function formatDateTime(value){
  const d=isoLocalToDate(value);
  return d?d.toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"}):"–";
}
function showVisitForm(visitId=null){
  const plant=activePlant();if(!plant)return;
  const existing=(plant.visits||[]).find(v=>v.id===visitId);
  const now=new Date();
  now.setMinutes(Math.ceil(now.getMinutes()/15)*15,0,0);
  const end=new Date(now.getTime()+60*60*1000);
  const localValue=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const visit=existing?structuredClone(existing):{
    id:crypto.randomUUID(),
    title:`Besuch ${plant.master.name||"Kläranlage"}`,
    start:localValue(now),end:localValue(end),purpose:"",contact:plant.contacts?.[0]?.name||"",
    status:"planned",notes:""
  };
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"} › Besuchstermin`);
  appView.innerHTML=`<form id="visitForm" class="record-form">
    <section class="page-header"><div><p class="eyebrow">Besuchstermin</p><h1>${existing?"Termin bearbeiten":"Neuen Termin anlegen"}</h1>
    <p class="subtitle">${esc(plant.master.name||"Unbenannte Anlage")}</p></div></section>
    <section class="form-section"><div class="form-grid">
      ${field("title","Termintitel",visit.title)}
      ${selectField("status","Status",visit.status,[["planned","Geplant"],["done","Erledigt"],["cancelled","Abgesagt"]])}
      ${field("start","Beginn",visit.start,"datetime-local")}
      ${field("end","Ende",visit.end,"datetime-local")}
      ${selectField("visitType","Besuchsart",visit.visitType,[
        ["process-optimization","Prozessoptimierung"],["product-trial","Produktversuch"],["inventory","Bestandsaufnahme / Rundgang"],["follow-up","Nachkontrolle"],["technical-service","Technischer Service"],["consulting","Beratung"],["other","Sonstiger Termin"]
      ])}
      ${selectField("processArea","Prozessbereich",visit.processArea,[
        ["","Bitte auswählen"],["inlet","Zulauf / mechanische Stufe"],["biology","Biologische Stufe"],["secondary-clarifier","Nachklärung"],["phosphorus","Phosphatfällung"],["sludge-treatment","Schlammbehandlung"],["dewatering","Schlammentwässerung"],["digester","Faulturm"],["filtrate","Zentrat / Filtrat"],["channel","Kanal / Pumpwerk"],["odor","Abluft / Geruch"],["other","Sonstiger Bereich"]
      ])}
      ${field("purpose","Anlass / Zweck",visit.purpose)}
      <label class="field-label">Ansprechpartner<select name="contact">
        <option value="">Kein Ansprechpartner</option>
        ${(plant.contacts||[]).map(c=>`<option value="${esc(c.name)}" ${visit.contact===c.name?"selected":""}>${esc(c.name)}${c.role?` – ${esc(c.role)}`:""}</option>`).join("")}
      </select></label>
      <label class="field-label span-2">Ziel des Besuchs<textarea name="objective">${esc(visit.objective||"")}</textarea></label>
      <label class="field-label span-2">Vorabinformationen / Notizen<textarea name="notes">${esc(visit.notes||"")}</textarea></label>
    </div></section>
    <div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelVisit">Abbrechen</button><button type="submit" class="button primary">Termin speichern</button></div>
  </form>`;
  $("#cancelVisit").onclick=showPlantDashboard;
  $("#visitForm").onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const saved=normalizeVisit(existing?{...existing,id:visit.id}:{id:visit.id});
    const wasDone=Boolean(existing?.status==="done");
    for(const key of ["title","status","start","end","visitType","processArea","purpose","contact","objective","notes"])saved[key]=fd.get(key)||"";
    const start=isoLocalToDate(saved.start), end=isoLocalToDate(saved.end);
    if(!start||!end||end<=start)return alert("Das Terminende muss nach dem Beginn liegen.");
    if(saved.status==="done"&&!saved.completedAt)saved.completedAt=new Date().toISOString();
    if(saved.status!=="done")saved.completedAt="";
    plant.visits=plant.visits||[];
    plant.visits=existing?plant.visits.map(v=>v.id===saved.id?saved:v):[...plant.visits,saved];
    if(saved.status==="done"&&!wasDone)ensureVisitCompletionFollowUp(plant,saved);
    plant.visits.sort((a,b)=>String(a.start).localeCompare(String(b.start)));
    plant.updatedAt=new Date().toISOString();savePlants();showPlantDashboard();
  };
}
function renderVisitCards(plant,visits){
  return visits.map(v=>`<article class="visit-card">
      <div class="visit-date"><strong>${formatDateTime(v.start)}</strong><span>bis ${formatDateTime(v.end)}</span></div>
      <div class="visit-main"><div class="visit-title-row"><h3>${esc(v.title||"Besuchstermin")}</h3><span class="status-chip ${visitStatusClass(v.status)}">${visitStatusLabel(v.status)}</span></div>
        ${(()=>{const done=VISIT_CHECKLIST.filter(([key])=>v.checklist?.[key]).length;return `<div class="visit-progress"><span style="width:${Math.round(done/VISIT_CHECKLIST.length*100)}%"></span></div><small>${done} von ${VISIT_CHECKLIST.length} Besuchspunkten erledigt</small>`})()}
        <p><strong>Anlass:</strong> ${esc(v.purpose||"Nicht hinterlegt")}</p>
        ${v.notes?`<p class="visit-notes"><strong>Informationen und Notizen:</strong><br>${esc(v.notes)}</p>`:""}
        <small>${v.contact?`Ansprechpartner: ${esc(v.contact)}`:"Kein Ansprechpartner hinterlegt"}</small>
      </div>
      <div class="visit-actions">
        <button type="button" class="visit-open-button" data-open-visit="${v.id}">${v.modeStatus==="completed"?"Dokumentation öffnen":v.modeStatus==="active"?"Besuch fortsetzen":"Besuch öffnen"}</button>
        <button type="button" data-edit-visit="${v.id}">Termin bearbeiten</button>
        <button type="button" data-ics-visit="${v.id}">Outlook / ICS</button>
        <a href="${visitOutlookUrl(plant,v)}" target="_blank" rel="noopener">Outlook Web</a>
        <button type="button" class="danger-link" data-delete-visit="${v.id}">Löschen</button>
      </div>
    </article>`).join("");
}
function renderVisits(plant){
  const now=Date.now();
  const visits=[...(plant.visits||[])];
  const upcoming=visits.filter(v=>(isoLocalToDate(v.start)?.getTime()||0)>=now&&v.status!=="done").sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  const history=visits.filter(v=>(isoLocalToDate(v.start)?.getTime()||0)<now||v.status==="done").sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  return `<section class="dashboard-section">
    <div class="section-heading"><div><p class="eyebrow">Außendienst</p><h2>Termine und Anlagenhistorie</h2></div>
      <div class="section-actions"><button class="button visit-start" id="startVisitMain" type="button">▶ Besuch starten</button><button class="button secondary" id="addVisit" type="button">Termin hinzufügen</button></div>
    </div>
    <h3 class="visit-group-title">Nächste Termine</h3>
    <div class="visits-list">${upcoming.length?renderVisitCards(plant,upcoming):`<div class="empty-panel compact"><p>Keine zukünftigen Termine hinterlegt.</p></div>`}</div>
    <h3 class="visit-group-title">Chronologische Historie</h3>
    <div class="visits-list">${history.length?renderVisitCards(plant,history):`<div class="empty-panel compact"><p>Noch keine vergangenen oder erledigten Termine.</p></div>`}</div>
  </section>`;
}
function showVisitMode(visitId=null){
  const plant=activePlant();if(!plant)return;
  const now=new Date(),localValue=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  let visit=visitId?(plant.visits||[]).find(v=>v.id===visitId):null;
  if(!visit){
    visit=normalizeVisit({title:`Besuch ${plant.master.name||"Kläranlage"}`,start:localValue(now),end:localValue(new Date(now.getTime()+60*60*1000)),contact:plant.contacts?.[0]?.name||"",status:"planned",modeStatus:"active",startedAt:new Date().toISOString()});
    plant.visits=[...(plant.visits||[]),visit];plant.updatedAt=new Date().toISOString();if(!savePlants())return;
  }else{
    visit=normalizeVisit(visit);if(visit.modeStatus==="not-started"){visit.modeStatus="active";visit.startedAt=visit.startedAt||new Date().toISOString();}
    plant.visits=plant.visits.map(v=>v.id===visit.id?visit:v);savePlants();
  }
  const persist=()=>{plant.visits=plant.visits.map(v=>v.id===visit.id?visit:v);plant.updatedAt=new Date().toISOString();return savePlants();};
  const render=()=>{
    const done=VISIT_CHECKLIST.filter(([key])=>visit.checklist[key]).length;
    setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"} › Besuch`);
    appView.innerHTML=`<section class="page-header visit-mode-header"><div><p class="eyebrow">Besuchsmodus</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1><p class="subtitle">${visit.modeStatus==="completed"?"Besuch abgeschlossen":`Gestartet ${formatDateTime(visit.startedAt)}`}</p></div><div class="visit-header-actions"><button class="button secondary" id="leaveVisit" type="button">Zur Anlagenakte</button><button class="button primary" id="finishVisit" type="button">${visit.modeStatus==="completed"?"Besuch wieder öffnen":"Besuch beenden"}</button></div></section>
    <section class="visit-overview"><article><span>Fortschritt</span><strong>${done}/${VISIT_CHECKLIST.length}</strong><div class="visit-progress large"><span style="width:${Math.round(done/VISIT_CHECKLIST.length*100)}%"></span></div></article><article><span>Ansprechpartner</span><strong>${esc(visit.contact||"Nicht gewählt")}</strong></article><article><span>Beginn</span><strong>${formatDateTime(visit.startedAt||visit.start)}</strong></article></section>
    <div class="visit-workspace">
      <section class="visit-panel"><div class="section-heading"><div><p class="eyebrow">Rundgang</p><h2>Besuchscheckliste</h2></div></div><div class="visit-checklist">${VISIT_CHECKLIST.map(([key,label])=>`<label><input type="checkbox" data-check="${key}" ${visit.checklist[key]?"checked":""}><span>${label}</span></label>`).join("")}</div></section>
      <section class="visit-panel"><div class="section-heading"><div><p class="eyebrow">Messwerte</p><h2>Vor-Ort-Werte</h2></div></div><div class="form-grid visit-measurements">${field("vm.flow","Volumenstrom [m³/d]",visit.measurements.flow,"number")}${field("vm.pOut","Pges Ablauf [mg/l]",visit.measurements.pOut,"number")}${field("vm.nh4Out","NH₄-N Ablauf [mg/l]",visit.measurements.nh4Out,"number")}${field("vm.cakeTs","Kuchen-TS [%]",visit.measurements.cakeTs,"number")}${field("vm.polymer","Polymer [kg WS/t TS]",visit.measurements.polymer,"number")}<label class="field-label">Weitere Messwerte<textarea name="vm.custom">${esc(visit.measurements.custom)}</textarea></label></div><button class="button secondary" id="saveMeasurements" type="button">Messwerte speichern</button></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Besuchsbericht</p><h2>Strukturierte Dokumentation</h2><p class="form-note">Diese Angaben bilden den späteren OneNote-Ersatz und bleiben auswertbar.</p></div></div><div class="form-grid">
        <label class="field-label span-2">Ausgangssituation<textarea name="vr.initialSituation">${esc(visit.initialSituation)}</textarea></label>
        <label class="field-label span-2">Durchgeführte Tätigkeiten<textarea name="vr.workPerformed">${esc(visit.workPerformed)}</textarea></label>
        <label class="field-label">Änderungen an Chemie / Produkt<textarea name="vr.chemistryChanges">${esc(visit.chemistryChanges)}</textarea></label>
        <label class="field-label">Änderungen an Einstellungen / Maschine<textarea name="vr.settingChanges">${esc(visit.settingChanges)}</textarea></label>
        <label class="field-label span-2">Ergebnis<textarea name="vr.result">${esc(visit.result)}</textarea></label>
        <label class="field-label">Empfehlung<textarea name="vr.recommendation">${esc(visit.recommendation)}</textarea></label>
        <label class="field-label">Offene Punkte / nächste Schritte<textarea name="vr.nextSteps">${esc(visit.nextSteps)}</textarea></label>
      </div><button class="button secondary" id="saveVisitReport" type="button">Besuchsbericht speichern</button></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Vorher / Nachher</p><h2>Vergleich der Optimierung</h2><p class="form-note">Optional; Produkte, Dosierung, Kosten und Ergebnisqualität direkt gegenüberstellen.</p></div></div><div class="form-grid">
        ${field("vc.beforeProduct","Produkt vorher",visit.comparison.beforeProduct)}${field("vc.afterProduct","Produkt nachher",visit.comparison.afterProduct)}
        ${field("vc.beforeDose","Dosierung vorher",visit.comparison.beforeDose)}${field("vc.afterDose","Dosierung nachher",visit.comparison.afterDose)}
        ${field("vc.beforeCost","Kosten vorher",visit.comparison.beforeCost)}${field("vc.afterCost","Kosten nachher",visit.comparison.afterCost)}
        <label class="field-label">Ergebnisqualität vorher<textarea name="vc.beforeQuality">${esc(visit.comparison.beforeQuality)}</textarea></label>
        <label class="field-label">Ergebnisqualität nachher<textarea name="vc.afterQuality">${esc(visit.comparison.afterQuality)}</textarea></label>
      </div><button class="button secondary" id="saveVisitComparison" type="button">Vergleich speichern</button></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Heute aufgefallen</p><h2>Auffälligkeiten und Aufgaben</h2></div></div><form id="findingForm" class="finding-entry"><select name="severity"><option value="info">Hinweis</option><option value="warning">Beobachten</option><option value="critical">Handlungsbedarf</option><option value="task">Aufgabe</option></select><input name="text" required placeholder="Beobachtung oder Aufgabe eintragen"><button class="button primary" type="submit">Hinzufügen</button></form><div class="finding-list">${visit.findings.length?visit.findings.map(f=>`<article class="finding-item ${esc(f.severity)}"><div><span>${f.severity==="critical"?"Handlungsbedarf":f.severity==="warning"?"Beobachten":f.severity==="task"?"Aufgabe":"Hinweis"}</span><p>${esc(f.text)}</p><small>${formatDateTime(f.createdAt)}</small></div><button type="button" data-remove-finding="${f.id}" aria-label="Eintrag löschen">×</button></article>`).join(""):`<p class="muted-small">Noch keine Auffälligkeiten dokumentiert.</p>`}</div></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Fotos</p><h2>Fotodokumentation</h2></div><label class="button secondary file-label-inline">Fotos hinzufügen<input id="visitPhotoInput" type="file" accept="image/*" capture="environment" multiple></label></div><p class="muted-small">Fotos werden ausschließlich lokal in dieser App gespeichert. Maximal 6 Fotos pro Besuch.</p><div class="visit-photo-grid">${visit.photos.length?visit.photos.map(ph=>`<figure><img src="${ph.dataUrl}" alt="Besuchsfoto"><figcaption>${esc(ph.name||"Foto")}<button type="button" data-remove-photo="${ph.id}">Löschen</button></figcaption></figure>`).join(""):`<div class="empty-panel compact"><p>Noch keine Fotos hinterlegt.</p></div>`}</div></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Zusammenfassung</p><h2>Besuchsnotiz</h2></div></div><textarea id="visitSummary" rows="6" placeholder="Gespräch, Empfehlungen, nächste Schritte …">${esc(visit.summary||visit.notes||"")}</textarea><button class="button secondary" id="saveVisitSummary" type="button">Notiz speichern</button></section>
    </div>`;
    enableDecimalInputs(appView);
    $("#leaveVisit").onclick=showPlantDashboard;
    $("#finishVisit").onclick=()=>{const wasDone=visit.status==="done";visit.modeStatus=visit.modeStatus==="completed"?"active":"completed";visit.status=visit.modeStatus==="completed"?"done":"planned";visit.completedAt=visit.modeStatus==="completed"?new Date().toISOString():"";if(visit.status==="done"&&!wasDone)ensureVisitCompletionFollowUp(plant,visit);if(persist())render();};
    $$('[data-check]').forEach(el=>el.onchange=()=>{visit.checklist[el.dataset.check]=el.checked;persist();render();});
    $("#saveMeasurements").onclick=()=>{for(const key of ["flow","pOut","nh4Out","cakeTs","polymer","custom"]){const el=appView.querySelector(`[name="vm.${key}"]`);visit.measurements[key]=el?.value||"";}visit.checklist.measurements=true;if(persist())render();};
    $("#saveVisitReport").onclick=()=>{for(const key of ["initialSituation","workPerformed","chemistryChanges","settingChanges","result","recommendation","nextSteps"]){visit[key]=appView.querySelector(`[name="vr.${key}"]`)?.value.trim()||"";}if(persist())alert("Besuchsbericht gespeichert.");};
    $("#saveVisitComparison").onclick=()=>{for(const key of ["beforeProduct","afterProduct","beforeDose","afterDose","beforeCost","afterCost","beforeQuality","afterQuality"]){visit.comparison[key]=appView.querySelector(`[name="vc.${key}"]`)?.value.trim()||"";}if(persist())alert("Vorher-/Nachher-Vergleich gespeichert.");};
    $("#findingForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),text=String(fd.get("text")||"").trim();if(!text)return;const severity=fd.get("severity")||"info";visit.findings.unshift({id:makeId(),severity,text,createdAt:new Date().toISOString(),resolved:false});if(severity==="task"){visit.checklist.tasks=true;plant.actions=[...(plant.actions||[]),{id:makeId(),title:text,status:"open",priority:"normal",dueDate:"",component:"Besuch",sourceVisitId:visit.id,createdAt:new Date().toISOString(),completedAt:"",autoGenerated:false,followUpType:"",followUpSourceId:""}];}if(persist())render();};
    $$('[data-remove-finding]').forEach(b=>b.onclick=()=>{visit.findings=visit.findings.filter(f=>f.id!==b.dataset.removeFinding);if(persist())render();});
    $("#saveVisitSummary").onclick=()=>{visit.summary=$("#visitSummary").value.trim();visit.notes=visit.summary;if(persist())alert("Besuchsnotiz gespeichert.");};
    $("#visitPhotoInput").onchange=async e=>{const files=[...e.target.files].slice(0,Math.max(0,6-visit.photos.length));for(const file of files){if(file.size>1500000){alert(`${file.name}: Foto ist größer als 1,5 MB und wurde nicht gespeichert.`);continue;}const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});visit.photos.push({id:makeId(),name:file.name,createdAt:new Date().toISOString(),dataUrl});}if(files.length)visit.checklist.photos=true;if(persist())render();};
    $$('[data-remove-photo]').forEach(b=>b.onclick=()=>{visit.photos=visit.photos.filter(ph=>ph.id!==b.dataset.removePhoto);if(!visit.photos.length)visit.checklist.photos=false;if(persist())render();});
  };
  render();
}

function showDewateringForm(){
  const plant=activePlant();if(!plant)return showPlantForm();
  const d=dewateringDefaults(plant.sludgeDewatering||{});
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"} › Schlammentwässerung`);
  appView.innerHTML=`<form id="dewateringForm" class="record-form"><section class="page-header"><div><p class="eyebrow">Technikakte</p><h1>Schlammentwässerung</h1><p class="subtitle">${esc(plant.master.name||"")}</p></div></section><section class="form-section"><div class="toggle-panel">${checkboxField("enabled","Schlammentwässerung vorhanden",d.enabled)}</div><div class="form-grid" id="standaloneDewateringFields">${selectField("status","Betriebsstatus",d.status,[["active","In Betrieb"],["inactive","Außer Betrieb"],["reserve","Reserve"],["planned","Geplant"]])}${selectField("process","Verfahren",d.process,[["screw-press","Schneckenpresse"],["belt-press","Siebbandpresse"],["filter-press","Kammerfilterpresse"],["centrifuge","Zentrifuge"],["mobile","Mobile Entwässerung"],["dryingBed","Trockenbeet"],["other","Sonstiges"]])}${field("manufacturer","Hersteller",d.manufacturer)}${field("model","Typ / Modell",d.model)}${field("year","Baujahr",d.year,"number")}${field("unitCount","Anzahl Aggregate",d.unitCount,"number")}${selectField("operationMode","Betriebsweise",d.operationMode,[["continuous","Kontinuierlich"],["batch","Chargenweise"],["mobile","Mobil / extern"]])}${field("throughputM3h","Schlammdurchsatz [m³/h]",d.throughputM3h,"number")}${field("inletTsPercent","Zulauf-TS [%]",d.inletTsPercent,"number")}${field("outletTsPercent","Austrags-TS [%]",d.outletTsPercent,"number")}${field("polymerKgPerTds","Polymer [kg WS/t TS]",d.polymerKgPerTds,"number")}${field("operatingHours","Betriebsstunden [h/a]",d.operatingHours,"number")}${field("sludgeQuantity","Schlammmenge",d.sludgeQuantity)}${field("filtrateRouting","Filtrat-/Zentratführung",d.filtrateRouting)}<div class="span-2 check-grid">${checkboxField("polymerStation","Polymerstation",d.polymerStation)}${checkboxField("feedPump","Beschickungspumpe",d.feedPump)}${checkboxField("conveyor","Fördertechnik",d.conveyor)}${checkboxField("container","Schlammcontainer",d.container)}</div><label class="field-label span-2">Bemerkungen<textarea name="notes">${esc(d.notes)}</textarea></label></div></section><div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelTechnical">Abbrechen</button><button type="submit" class="button primary">Speichern</button></div></form>`;
  enableDecimalInputs(appView);$("#cancelTechnical").onclick=showPlantDashboard;
  $("#dewateringForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),out=dewateringDefaults();for(const k of Object.keys(out))out[k]=typeof out[k]==="boolean"?fd.has(k):(fd.get(k)||"");plant.sludgeDewatering=out;plant.updatedAt=new Date().toISOString();if(savePlants())showPlantDashboard();};
}
function showDosingForm(){
  const plant=activePlant();if(!plant)return showPlantForm();let items=(plant.dosingSystems||[]).map(dosingDefaults);
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"} › Dosiertechnik`);
  appView.innerHTML=`<form id="dosingForm" class="record-form"><section class="page-header"><div><p class="eyebrow">Technikakte</p><h1>Dosiertechnik</h1><p class="subtitle">Dosierstationen unabhängig von Tankanlagen verwalten.</p></div><button type="button" class="button secondary" id="addStandaloneDosing">Dosierstation hinzufügen</button></section><div id="standaloneDosingEditor" class="dosing-editor"></div><div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelTechnical">Abbrechen</button><button type="submit" class="button primary">Speichern</button></div></form>`;
  const form=$("#dosingForm"),editor=$("#standaloneDosingEditor");
  const sync=()=>{items=items.map((cur,i)=>{const out=dosingDefaults({id:cur.id});for(const k of Object.keys(out)){if(k==="id")continue;const el=form.elements.namedItem(`d.${i}.${k}`);if(el)out[k]=typeof out[k]==="boolean"?el.checked:el.value;else out[k]=cur[k];}return out;});};
  const render=()=>{editor.innerHTML=items.length?items.map((d,i)=>`<section class="form-section"><div class="section-heading"><h2>${esc(d.name||`Dosierstation ${i+1}`)}</h2><button type="button" class="danger-link" data-remove-dose="${i}">Entfernen</button></div><div class="form-grid">${field(`d.${i}.name`,`Bezeichnung`,d.name)}${selectField(`d.${i}.purpose`,`Verwendungszweck`,d.purpose,[["polymer","Polymer"],["precipitant","Fällmittel"],["carbon","Kohlenstoffquelle"],["neutralization","Neutralisationsmittel"],["defoamer","Entschäumer"],["other","Sonstiges"]])}${selectField(`d.${i}.status`,`Betriebsstatus`,d.status,[["active","In Betrieb"],["inactive","Außer Betrieb"],["reserve","Reserve"],["planned","Geplant"]])}${field(`d.${i}.location`,`Einbauort`,d.location)}${field(`d.${i}.stationManufacturer`,`Hersteller`,d.stationManufacturer)}${field(`d.${i}.stationModel`,`Typ`,d.stationModel)}${field(`d.${i}.stationYear`,`Baujahr`,d.stationYear,"number")}${selectField(`d.${i}.pumpType`,`Pumpenart`,d.pumpType,[["diaphragm","Membrandosierpumpe"],["hose","Schlauchpumpe"],["progressive-cavity","Exzenterschneckenpumpe"],["piston","Kolbenpumpe"],["other","Sonstige"]])}${field(`d.${i}.pumpCount`,`Anzahl Pumpen`,d.pumpCount,"number")}${field(`d.${i}.capacityLh`,`Förderleistung [l/h]`,d.capacityLh,"number")}${field(`d.${i}.maxPressureBar`,`Maximaldruck [bar]`,d.maxPressureBar,"number")}${selectField(`d.${i}.controlMode`,`Betriebsweise`,d.controlMode,[["constant","Konstant"],["flow-proportional","Durchflussproportional"],["measured-value","Messwertgeführt"],["manual","Manuell"]])}${field(`d.${i}.productName`,`Produktname`,d.productName)}${field(`d.${i}.activeIngredient`,`Wirkstoff`,d.activeIngredient)}${field(`d.${i}.concentrationPercent`,`Konzentration [%]`,d.concentrationPercent,"number")}${field(`d.${i}.consumption`,`Verbrauch`,d.consumption)}<div class="span-2 check-grid">${checkboxField(`d.${i}.standbyPump`,`Reservepumpe`,d.standbyPump)}${checkboxField(`d.${i}.automaticChangeover`,`Automatische Umschaltung`,d.automaticChangeover)}${checkboxField(`d.${i}.flowMeter`,`Durchflussmesser`,d.flowMeter)}${checkboxField(`d.${i}.dryRunProtection`,`Trockenlaufschutz`,d.dryRunProtection)}${checkboxField(`d.${i}.plcConnected`,`SPS-Anbindung`,d.plcConnected)}${checkboxField(`d.${i}.remoteAlarm`,`Fern-/Störmeldung`,d.remoteAlarm)}</div><label class="field-label span-2">Bemerkungen<textarea name="d.${i}.notes">${esc(d.notes)}</textarea></label></div></section>`).join(""):`<div class="empty-panel"><p>Noch keine Dosierstation angelegt.</p></div>`;editor.querySelectorAll('[data-remove-dose]').forEach(b=>b.onclick=()=>{sync();items.splice(Number(b.dataset.removeDose),1);render();});enableDecimalInputs(editor);};
  render();$("#addStandaloneDosing").onclick=()=>{sync();items.push(dosingDefaults({name:`Dosierstation ${items.length+1}`}));render();};$("#cancelTechnical").onclick=showPlantDashboard;form.onsubmit=e=>{e.preventDefault();sync();plant.dosingSystems=items;plant.updatedAt=new Date().toISOString();if(savePlants())showPlantDashboard();};
}
function showTankForm(){
  const plant=activePlant();if(!plant)return showPlantForm();let items=(plant.tankSystems||[]).map(tankDefaults);
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"} › Tankanlagen`);
  appView.innerHTML=`<form id="tankForm" class="record-form"><section class="page-header"><div><p class="eyebrow">Technikakte</p><h1>Tankanlagen</h1><p class="subtitle">Lager-, Tages- und IBC-Tanks separat dokumentieren.</p></div><button type="button" class="button secondary" id="addTank">Tankanlage hinzufügen</button></section><div id="tankEditor" class="dosing-editor"></div><div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelTechnical">Abbrechen</button><button type="submit" class="button primary">Speichern</button></div></form>`;
  const form=$("#tankForm"),editor=$("#tankEditor");
  const sync=()=>{items=items.map((cur,i)=>{const out=tankDefaults({id:cur.id});for(const k of Object.keys(out)){if(k==="id")continue;const el=form.elements.namedItem(`t.${i}.${k}`);if(el)out[k]=typeof out[k]==="boolean"?el.checked:el.value;else out[k]=cur[k];}return out;});};
  const render=()=>{editor.innerHTML=items.length?items.map((t,i)=>`<section class="form-section"><div class="section-heading"><h2>${esc(t.name||`Tankanlage ${i+1}`)}</h2><button type="button" class="danger-link" data-remove-tank="${i}">Entfernen</button></div><div class="form-grid">${field(`t.${i}.name`,`Bezeichnung`,t.name)}${selectField(`t.${i}.status`,`Betriebsstatus`,t.status,[["active","In Betrieb"],["inactive","Außer Betrieb"],["reserve","Reserve"],["planned","Geplant"]])}${field(`t.${i}.location`,`Standort`,t.location)}${selectField(`t.${i}.type`,`Tankart`,t.type,[["storage-tank","Lagertank"],["day-tank","Tagestank"],["ibc","IBC"],["double-wall","Doppelwandtank"],["other","Sonstiges"]])}${field(`t.${i}.manufacturer`,`Hersteller`,t.manufacturer)}${field(`t.${i}.model`,`Typ`,t.model)}${field(`t.${i}.year`,`Baujahr`,t.year,"number")}${field(`t.${i}.volume`,`Volumen [l]`,t.volume,"number")}${field(`t.${i}.material`,`Material`,t.material)}${field(`t.${i}.medium`,`Medium / Produkt`,t.medium)}${field(`t.${i}.lastInspection`,`Letzte Prüfung`,t.lastInspection,"date")}${field(`t.${i}.nextInspection`,`Nächste Prüfung`,t.nextInspection,"date")}<div class="span-2 check-grid">${checkboxField(`t.${i}.doubleWalled`,`Doppelwandig`,t.doubleWalled)}${checkboxField(`t.${i}.bundPresent`,`Auffangwanne`,t.bundPresent)}${checkboxField(`t.${i}.levelMonitoring`,`Füllstandsüberwachung`,t.levelMonitoring)}${checkboxField(`t.${i}.leakageMonitoring`,`Leckageüberwachung`,t.leakageMonitoring)}</div><label class="field-label span-2">Bemerkungen<textarea name="t.${i}.notes">${esc(t.notes)}</textarea></label></div></section>`).join(""):`<div class="empty-panel"><p>Noch keine Tankanlage angelegt.</p></div>`;editor.querySelectorAll('[data-remove-tank]').forEach(b=>b.onclick=()=>{sync();items.splice(Number(b.dataset.removeTank),1);render();});enableDecimalInputs(editor);};
  render();$("#addTank").onclick=()=>{sync();items.push(tankDefaults({name:`Tankanlage ${items.length+1}`}));render();};$("#cancelTechnical").onclick=showPlantDashboard;form.onsubmit=e=>{e.preventDefault();sync();plant.tankSystems=items;plant.updatedAt=new Date().toISOString();if(savePlants())showPlantDashboard();};
}

function plantDiagnostics(plant){
  const items=[];
  const today=new Date(); today.setHours(0,0,0,0);
  (plant.tankSystems||[]).forEach(t=>{
    if(t.nextInspection){
      const d=new Date(`${t.nextInspection}T00:00:00`);
      const days=Math.ceil((d-today)/86400000);
      if(days<0)items.push({level:"red",title:`Tankprüfung überfällig`,text:`${t.name||t.medium||"Tankanlage"}: seit ${Math.abs(days)} Tagen fällig`,component:"Tankanlage"});
      else if(days<=90)items.push({level:"yellow",title:`Tankprüfung steht an`,text:`${t.name||t.medium||"Tankanlage"}: in ${days} Tagen`,component:"Tankanlage"});
    }
    if(t.medium&&!t.bundPresent)items.push({level:"yellow",title:"Auffangwanne prüfen",text:`${t.name||t.medium}: keine Auffangwanne dokumentiert`,component:"Tankanlage"});
  });
  (plant.dosingSystems||[]).forEach(d=>{
    if(d.hazardous&&!d.safetyDataSheetAvailable)items.push({level:"red",title:"Sicherheitsdatenblatt fehlt",text:`${d.name||d.productName||"Dosierstation"}`,component:"Dosiertechnik"});
    if(Number(d.pumpCount||0)===1&&!d.standbyPump)items.push({level:"yellow",title:"Keine Reservepumpe dokumentiert",text:`${d.name||"Dosierstation"}`,component:"Dosiertechnik"});
  });
  const dw=plant.sludgeDewatering||{};
  if(dw.enabled&&(!dw.outletTsPercent||!dw.polymerKgPerTds))items.push({level:"yellow",title:"Entwässerungsdaten unvollständig",text:"Kuchen-TS oder Polymerverbrauch fehlen.",component:"Schlammentwässerung"});
  return items;
}
function openPlantActions(plant){return (plant.actions||[]).filter(a=>a.status!=="done");}
function renderTodayCockpit(plant){
  const primary=plant.contacts?.[0];
  const visits=[...(plant.visits||[])].sort((a,b)=>String(b.start||b.startedAt).localeCompare(String(a.start||a.startedAt)));
  const last=visits.find(v=>v.modeStatus==="completed"||v.status==="done");
  const photos=visits.reduce((n,v)=>n+(v.photos?.length||0),0);
  const actions=openPlantActions(plant);
  const diagnostics=plantDiagnostics(plant);
  return `<section class="today-cockpit">
    <div class="section-heading"><div><p class="eyebrow">Einsatzcockpit</p><h2>Heute beim Kunden</h2></div><button class="button visit-start" id="startVisitCockpit" type="button">▶ Besuch starten</button></div>
    <div class="today-grid">
      <article class="today-card"><span>Ansprechpartner</span><strong>${esc(primary?.name||"Nicht hinterlegt")}</strong><small>${esc(primary?.role||"")}</small><div class="today-links">${primary?.mobile||primary?.phone?`<a href="tel:${esc(primary.mobile||primary.phone)}">Anrufen</a>`:""}${primary?.email?`<a href="mailto:${esc(primary.email)}">E-Mail</a>`:""}</div></article>
      <article class="today-card"><span>Letzter Besuch</span><strong>${last?formatDateTime(last.completedAt||last.start):"Noch kein Besuch"}</strong><small>${last?esc(last.summary||last.purpose||"Dokumentation vorhanden"):""}</small></article>
      <article class="today-card ${actions.length?'attention':''}"><span>Offene Aufgaben</span><strong>${actions.length}</strong><small>${actions.length?"Vor Ort oder nach dem Termin bearbeiten":"Keine offenen Aufgaben"}</small></article>
      <article class="today-card"><span>Dokumentation</span><strong>${photos} Fotos</strong><small>${visits.length} Besuche in der Historie</small></article>
    </div>
    ${diagnostics.length?`<div class="today-alerts">${diagnostics.slice(0,4).map(x=>`<article class="today-alert ${x.level}"><b>${x.level==="red"?"!":"•"}</b><div><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span></div></article>`).join("")}</div>`:`<div class="today-ok">Keine automatischen Hinweise aus den vorhandenen Technikdaten.</div>`}
  </section>`;
}
function renderActionCenter(plant){
  const actions=[...(plant.actions||[])].sort((a,b)=>(a.status==="done")-(b.status==="done")||String(b.createdAt).localeCompare(String(a.createdAt)));
  return `<section class="dashboard-section action-center"><div class="section-heading"><div><p class="eyebrow">Nachverfolgung</p><h2>Aufgaben und Aktionen</h2></div></div>
    <form id="quickActionForm" class="quick-action-form"><input name="title" required placeholder="Neue Aufgabe, z. B. Polymeroptimierung durchführen"><select name="priority"><option value="normal">Normal</option><option value="high">Hoch</option></select><input name="dueDate" type="date"><button class="button primary" type="submit">Aufgabe anlegen</button></form>
    <div class="action-list">${actions.length?actions.map(a=>`<article class="action-item ${a.status==='done'?'done':''} ${a.priority==='high'?'high':''}"><button type="button" class="action-check" data-toggle-action="${a.id}" aria-label="Status ändern">${a.status==='done'?'✓':'○'}</button><div><strong>${esc(a.title)}</strong><small>${a.component?esc(a.component):'Allgemein'}${a.dueDate?` · fällig ${new Date(a.dueDate+'T00:00:00').toLocaleDateString('de-DE')}`:''}</small></div><button type="button" class="action-delete" data-delete-action="${a.id}" aria-label="Aufgabe löschen">×</button></article>`).join(''):`<div class="empty-panel compact"><p>Noch keine Aufgaben angelegt.</p></div>`}</div>
  </section>`;
}
function renderPlantTimeline(plant){
  const entries=[];
  (plant.visits||[]).forEach(v=>entries.push({date:v.completedAt||v.start||v.startedAt,type:"visit",title:v.title||"Besuch",text:v.summary||v.purpose||`${v.findings?.length||0} Auffälligkeiten · ${v.photos?.length||0} Fotos`}));
  (plant.actions||[]).filter(a=>a.status==="done").forEach(a=>entries.push({date:a.completedAt||a.createdAt,type:"action",title:"Aufgabe erledigt",text:a.title}));
  (plant.communications||[]).forEach(c=>entries.push({date:c.createdAt,type:c.type==="phone"?"phone":"mail",title:c.title,text:[c.recipient,c.subject,c.employee].filter(Boolean).join(" · ")}));
  entries.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return `<section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Entwicklung der Anlage</p><h2>Zeitleiste</h2></div></div><div class="plant-timeline">${entries.length?entries.slice(0,12).map(e=>`<article><div class="timeline-dot ${e.type}"></div><div><time>${formatDateTime(e.date)}</time><strong>${esc(e.title)}</strong><p>${esc(e.text)}</p></div></article>`).join(''):`<div class="empty-panel compact"><p>Noch keine Ereignisse vorhanden.</p></div>`}</div></section>`;
}


function hasValue(value){
  if(Array.isArray(value))return value.length>0;
  if(typeof value==="boolean")return value;
  return String(value??"").trim()!=="";
}
function scoreFields(fields){
  const total=fields.length||1;
  const done=fields.filter(([value])=>hasValue(value)).length;
  return {done,total,percent:Math.round(done/total*100),missing:fields.filter(([value])=>!hasValue(value)).map(([,label])=>label)};
}
function plantPassData(plant){
  const completedVisits=(plant.visits||[]).filter(v=>v.modeStatus==="completed"||v.status==="done");
  const visitPhotos=(plant.visits||[]).reduce((sum,v)=>sum+(v.photos?.length||0),0);
  const technicalCount=(plant.sludgeDewatering?.enabled?1:0)+(plant.dosingSystems?.length||0)+(plant.tankSystems?.length||0);
  const technicalDetails=[
    [hasValue(plant.master.mainProcess)||hasValue(plant.master.process),"Hauptverfahren"],
    [technicalCount>0,"Mindestens eine technische Komponente"],
    [!plant.sludgeDewatering?.enabled||hasValue(plant.sludgeDewatering.manufacturer),"Hersteller Schlammentwässerung"],
    [!(plant.dosingSystems||[]).length||(plant.dosingSystems||[]).every(x=>hasValue(x.name)&&hasValue(x.purpose)),"Bezeichnung und Zweck der Dosierstationen"],
    [!(plant.tankSystems||[]).length||(plant.tankSystems||[]).every(x=>hasValue(x.name)&&hasValue(x.capacity)),"Bezeichnung und Volumen der Tankanlagen"]
  ];
  const sections=[
    {key:"master",label:"Stammdaten",weight:24,score:scoreFields([[plant.master.name,"Anlagenname"],[plant.master.internalNumber,"Anlagennummer"],[plant.master.type,"Anlagentyp"],[plant.master.capacityPE,"Ausbaugröße"],[plant.master.actualPE,"tatsächliche Belastung"],[plant.master.mainProcess||plant.master.process,"Hauptverfahren"]])},
    {key:"location",label:"Standort & Zugang",weight:16,score:scoreFields([[plant.address.street,"Straße"],[plant.address.postalCode,"Postleitzahl"],[plant.address.city,"Ort"],[plant.address.latitude||plant.address.gps,"GPS-Koordinaten"],[plant.access.parking,"Parkhinweis"],[plant.access.registration,"Anmeldung vor Ort"]])},
    {key:"contacts",label:"Betreiber & Kontakte",weight:16,score:scoreFields([[plant.operator.name,"Betreiber"],[plant.operator.customerNumber,"Kundennummer"],[plant.operator.phone||plant.operator.email,"Kontakt Betreiber"],[plant.contacts?.[0]?.name,"Hauptansprechpartner"],[plant.contacts?.[0]?.mobile||plant.contacts?.[0]?.phone||plant.contacts?.[0]?.email,"Kontaktdaten Ansprechpartner"]])},
    {key:"technology",label:"Technik",weight:22,score:scoreFields(technicalDetails)},
    {key:"operations",label:"Betriebswerte",weight:12,score:scoreFields([[plant.parameters.flow,"Volumenstrom"],[plant.parameters.pOut,"Pges Ablauf"],[plant.parameters.nh4Out,"NH₄-N Ablauf"],[plant.parameters.svi,"SVI"],[plant.parameters.cakeTs,"Kuchen-TS"],[plant.parameters.polymer,"Polymerverbrauch"]])},
    {key:"history",label:"Dokumentation",weight:10,score:scoreFields([[completedVisits.length,"abgeschlossener Besuch"],[visitPhotos,"Fotodokumentation"],[(plant.actions||[]).length,"Aufgabenhistorie"]])}
  ];
  const overall=Math.round(sections.reduce((sum,s)=>sum+s.score.percent*s.weight,0)/sections.reduce((sum,s)=>sum+s.weight,0));
  const missing=sections.flatMap(s=>s.score.missing.map(item=>({section:s.label,item}))).slice(0,8);
  const diagnostics=plantDiagnostics(plant);
  return {overall,sections,missing,diagnostics,technicalCount,completedVisits:completedVisits.length,visitPhotos};
}
function passStatus(percent){
  if(percent>=85)return {label:"sehr gut dokumentiert",tone:"green"};
  if(percent>=65)return {label:"gut nutzbar",tone:"blue"};
  if(percent>=40)return {label:"Ausbau empfohlen",tone:"yellow"};
  return {label:"Grunddaten ergänzen",tone:"red"};
}
function renderDigitalPlantPass(plant){
  const pass=plantPassData(plant),status=passStatus(pass.overall);
  return `<section class="plant-pass">
    <div class="section-heading"><div><p class="eyebrow">Digitaler Anlagenpass</p><h2>Dokumentationsstatus</h2><p class="form-note">Bewertet die Vollständigkeit der Anlagenakte, nicht die technische Leistung der Anlage.</p></div><button class="button secondary" id="completePlantPass" type="button">Fehlende Daten ergänzen</button></div>
    <div class="plant-pass-layout">
      <article class="pass-overall ${status.tone}"><div class="pass-ring" style="--pass:${pass.overall}"><span><strong>${pass.overall}%</strong><small>Gesamtstatus</small></span></div><div><span class="status-chip ${status.tone}">${status.label}</span><p>${pass.technicalCount} Technikkomponenten · ${pass.completedVisits} abgeschlossene Besuche · ${pass.visitPhotos} Fotos</p></div></article>
      <div class="pass-sections">${pass.sections.map(s=>`<article class="pass-section"><div><strong>${s.label}</strong><span>${s.score.done}/${s.score.total}</span></div><div class="pass-bar"><i style="width:${s.score.percent}%"></i></div><small>${s.score.percent}% vollständig</small></article>`).join("")}</div>
    </div>
    <div class="pass-detail-grid">
      <article class="pass-missing"><h3>Nächste sinnvolle Ergänzungen</h3>${pass.missing.length?`<ul>${pass.missing.map(x=>`<li><span>${esc(x.section)}</span><strong>${esc(x.item)}</strong></li>`).join("")}</ul>`:"<div class=\"empty-panel compact\"><p>Die wichtigsten Angaben sind vollständig.</p></div>"}</article>
      <article class="pass-diagnostics"><h3>Wartung und Hinweise</h3>${pass.diagnostics.length?`<ul>${pass.diagnostics.slice(0,6).map(x=>`<li class="${x.level}"><span>${esc(x.component)}</span><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></li>`).join("")}</ul>`:"<div class=\"empty-panel compact\"><p>Aktuell keine automatischen Hinweise.</p></div>"}</article>
    </div>
  </section>`;
}

function plantHeader(plant){
  const type=plant.master.type==="industrial"?"Industrielle Kläranlage":plant.master.type==="mixed"?"Kommunale Kläranlage mit Industrieanteil":"Kommunale Kläranlage";
  return `<section class="plant-hero plant-shell-header">
    <div><p class="eyebrow">Digitale Anlagenakte</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1>
    <p class="subtitle">${esc(plant.master.internalNumber||"")} · ${type}${plant.master.capacityPE?` · ${fmtInteger(plant.master.capacityPE)} EW Ausbaugröße`:""}${plant.master.actualPE?` · ${fmtInteger(plant.master.actualPE)} EW Belastung`:""}</p></div>
    <div class="hero-actions"><button class="button visit-start" id="startVisit" type="button">▶ Besuch starten</button><button class="button secondary" id="openNavigation" type="button">Navigation</button><button class="button secondary" id="editPlant" type="button">Bearbeiten</button></div>
  </section>`;
}
function plantPageNavigation(active){
  const pages=[["overview","Übersicht"],["technology","Technik"],["visits","Einsätze"],["sales","Vertrieb"],["tasks","Aufgaben"],["record","Akte"]];
  return `<nav class="plant-subnav" aria-label="Bereiche der Anlagenakte">${pages.map(([id,label],i)=>`<button type="button" data-plant-page="${id}" class="${active===id?'active':''} ${i>3?'plant-subnav-more':''}">${label}</button>`).join('')}</nav>`;
}
function formatShortDate(value){
  const date=new Date(value||"");
  return Number.isNaN(date.getTime())?"–":date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function missingRecordFields(plant){
  const primary=plant.contacts?.[0]||{};
  const checks=[
    [plant.master?.internalNumber,"Anlagennummer"],
    [plant.master?.mainProcess,"Hauptverfahren"],
    [plant.address?.street,"Straße"],
    [plant.address?.postalCode,"Postleitzahl"],
    [plant.address?.city,"Ort"],
    [plant.operator?.name,"Betreibername"],
    [plant.operator?.association,"Zweckverband"],
    [plant.operator?.email,"Betreiber E-Mail"],
    [plant.operator?.phone,"Betreiber Telefon"],
    [primary?.name,"Hauptansprechpartner"],
    [primary?.mobile||primary?.phone,"Ansprechpartner Telefon"],
    [plant.access?.gate,"Tor / Zugang"],
    [plant.access?.openingHours,"Besuchszeiten"],
    [plant.access?.ppe,"PSA Hinweise"]
  ];
  return checks.filter(([value])=>!String(value||"").trim()).map(([,label])=>label);
}
function renderOverviewRecordSnapshot(plant){
  const primary=plant.contacts?.[0]||{};
  const missing=missingRecordFields(plant);
  const mapUrls=googleMapsUrls(plant);
  const hasLocation=Boolean(locationQuery(plant));
  const lookupStatus=plant.operator?.lookupStatus||"IDLE";
  return `<section class="dashboard-section compact-section"><div class="section-heading"><div><p class="eyebrow">Akte-Kompakt</p><h2>Wichtige Stammdaten auf einen Blick</h2><p class="form-note">Kompaktauszug aus der Akte für schnelle Orientierung in der Übersicht.</p></div><div class="plant-overview-actions"><button type="button" class="button secondary" data-jump-page="record">Akte öffnen</button><button type="button" class="button secondary" data-jump-page="tasks">Aufgaben ${openPlantActions(plant).length}</button></div></div>
  <div class="record-grid plant-overview-record-grid">
    <article class="record-card"><h2>Anlage</h2><dl><div><dt>Anlagennummer</dt><dd>${esc(plant.master?.internalNumber||"–")}</dd></div><div><dt>Anlagentyp</dt><dd>${esc(plant.master?.type==="industrial"?"Industriell":plant.master?.type==="mixed"?"Kommunal + Industrie":"Kommunal")}</dd></div><div><dt>Ausbaugröße</dt><dd>${plant.master?.capacityPE?`${fmtInteger(plant.master.capacityPE)} EW`:"–"}</dd></div><div><dt>Hauptverfahren</dt><dd>${esc(processLabel(plant.master?.mainProcess||plant.master?.process))}</dd></div><div><dt>Weitere Stufen</dt><dd>${esc(processStageLabels(plant.master?.processStages).slice(0,2).join(", ")||"–")}</dd></div></dl></article>
    <article class="record-card"><h2>Betreiber & Kontakt</h2><dl><div><dt>Betreiber</dt><dd>${esc(plant.operator?.name||"–")}</dd></div><div><dt>Zweckverband</dt><dd>${esc(plant.operator?.association||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(plant.operator?.phone||"")}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(plant.operator?.email||"")}</dd></div><div><dt>Hauptansprechpartner</dt><dd>${esc(primary?.name||"–")}</dd></div><div><dt>Kontakt Person</dt><dd>${telLink(primary?.mobile||primary?.phone||"")} · ${mailLink(primary?.email||"")}</dd></div></dl></article>
    <article class="record-card"><h2>Standort & Zugang</h2><dl><div><dt>Adresse</dt><dd>${esc([plant.address?.street,[plant.address?.postalCode,plant.address?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"–")}</dd></div><div><dt>Koordinaten</dt><dd>${plant.address?.latitude&&plant.address?.longitude?`${esc(plant.address.latitude)}, ${esc(plant.address.longitude)}`:"–"}</dd></div><div><dt>Tor / Zugang</dt><dd>${esc(plant.access?.gate||"–")}</dd></div><div><dt>Besuchszeiten</dt><dd>${esc(plant.access?.openingHours||"–")}</dd></div><div><dt>PSA</dt><dd>${esc(plant.access?.ppe||"–")}</dd></div><div><dt>Letzte Aktualisierung</dt><dd>${formatShortDate(plant.updatedAt)}</dd></div></dl>${hasLocation?`<div class="plant-overview-link-row"><a class="button secondary" href="${mapUrls.navigate}" target="_blank" rel="noopener">Navigation</a><a class="button secondary" href="${mapUrls.show}" target="_blank" rel="noopener">Karte</a></div>`:""}</article>
    <article class="record-card"><h2>Datenqualität Akte</h2><p class="form-note">Status Betreiberermittlung: <strong>${esc(lookupStatus)}</strong></p>${missing.length?`<ul class="plant-missing-list">${missing.slice(0,6).map(label=>`<li>${esc(label)}</li>`).join("")}</ul><button type="button" class="button primary" data-jump-page="record">Fehlende Daten ergänzen</button>`:`<div class="empty-panel compact"><p>Die wichtigsten Akte-Daten sind vorhanden.</p></div>`}</article>
  </div></section>`;
}
function renderPlantOverviewPage(plant){
  return `<div class="plant-overview-schema">${renderProcessSchema3D(plant)}</div>${renderOverviewRecordSnapshot(plant)}${renderOperationsDataSection(plant)}${renderCommercialMailActions(plant)}${renderTodayCockpit(plant)}${renderDigitalPlantPass(plant)}
    <section class="dashboard-section compact-section"><div class="section-heading"><div><p class="eyebrow">Schnellzugriff</p><h2>Wichtige Bereiche</h2></div></div>
    <div class="plant-jump-grid">
      <button type="button" data-jump-page="technology"><strong>Technik</strong><span>Komponenten und Zulassungs-Check</span></button>
      <button type="button" data-jump-page="visits"><strong>Einsätze</strong><span>Besuche, Messungen und Historie</span></button>
      <button type="button" data-jump-page="tasks"><strong>Aufgaben</strong><span>${openPlantActions(plant).length} offene Punkte</span></button>
      <button type="button" data-jump-page="record"><strong>Akte</strong><span>Stammdaten, Kontakte und Standort</span></button>
    </div></section>`;
}
function renderPlantTechnologyPage(plant){
  return `${procedureCard(plant)}${renderTechnicalAssets(plant)}
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Kontextbezogene Werkzeuge</p><h2>Berechnungen für diese Anlage</h2><p class="form-note">Technik ohne Ampelansicht: Fokus auf Komponenten, Prüfstatus und Angebotschancen.</p></div></div>
  <div class="dashboard-grid">${["Phosphor","Biologie","Schlammentwässerung","Wirtschaftlichkeit"].map(category=>{const meta=categoryMeta[category];return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:"Rechner öffnen"})}).join("")}</div></section>`;
}
function requestProductFilterOptions(query="",productType=""){
  const q=String(query||"").trim().toLowerCase();
  return products.filter(p=>{
    if(!p.isActive) return false;
    if(productType&&p.productType!==productType) return false;
    if(!q) return true;
    return [p.name,p.materialNumber,p.category,p.shortDescription,...p.applications,...p.problems].join(" ").toLowerCase().includes(q);
  });
}
function formatRequestProductType(type){
  return type==="technical"?"Technisches Produkt":"Chemisches Produkt";
}
function detectPackageSizeType(size=""){
  const label=String(size||"").toLowerCase();
  if(/ibc/.test(label)) return "ibc";
  if(/tank(last)?zug|tankwagen|tanker|tank truck/.test(label)) return "tanker";
  if(/fass|drum|barrel/.test(label)) return "drum";
  if(/kanister|jerry|kanister/.test(label)) return "jerrycan";
  if(/sack|bag/.test(label)) return "bag";
  return "box";
}
function packageSizeIconSvg(type){
  const icons={
    bag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v1h1.5c.83 0 1.5.67 1.5 1.5v2.5c0 3.03-2.47 5.5-5.5 5.5h-3c-3.03 0-5.5-2.47-5.5-5.5V8.5c0-.83.67-1.5 1.5-1.5H8V7z"/><path d="M9 8h6"/></svg>`,
    drum:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 8c0 1.1 3.58 2 8 2s8-.9 8-2"/><path d="M4 16c0-1.1 3.58-2 8-2s8 .9 8 2"/></svg>`,
    jerrycan:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 5v4"/><path d="M15 5v4"/><path d="M9 14h6"/><path d="M7 9h2"/><path d="M17 9h2"/></svg>`,
    ibc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20h12V8H6v12z"/><path d="M6 8l6-4 6 4"/><path d="M9 8v12"/><path d="M15 8v12"/><path d="M6 12h12"/></svg>`,
    tanker:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h13l4 4v-8l-4-4H3v8z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 5V3h6v2"/></svg>`,
    box:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l8-4 8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4"/><path d="M12 3v14"/></svg>`
  };
  return icons[type]||icons.box;
}
function renderPackageSizePreview(size,imageUrl=""){
  if(!size) return "";
  const type=detectPackageSizeType(size);
  const visual=imageUrl?`<img src="${esc(imageUrl)}" alt="Produktbild">`:packageSizeIconSvg(type);
  return `<div class="package-size-preview"><span class="package-size-icon">${visual}</span><span>${esc(size)}</span></div>`;
}
function productPreviewVisual(p,contextClass=""){
  return renderProductImage(p,{contextClass});
}
function renderRequestPositionList(positions=[]){
  if(!positions.length) return `<div class="empty-panel compact"><p>Keine Positionen hinzugefügt.</p></div>`;
  return `<div class="request-position-list">${positions.map((position,index)=>{
    const visual=productPreviewVisual({
      name:position.productName,
      productName:position.productName,
      productType:position.productType,
      imageUrl:position.productImageUrl
    },"request-position");
    return `<article><div class="request-position-heading"><span class="request-position-icon">${visual}</span><div><strong>${esc(position.productName)}</strong><p>${position.productType==="chemical"?`Gebinde: ${esc(position.packageSize||"–")}`:"Technisches Produkt"}</p></div></div><div class="request-position-meta"><span>${esc(String(position.quantity))}${position.productType==="technical"?" Stück":""}</span><button class="button compact secondary" type="button" data-remove-request-position="${index}">Entfernen</button></div></article>`;
  }).join("")}</div>`;
}
function renderProductRequestSection(plant){
  const filteredProducts=requestProductFilterOptions(productRequestState.search,productRequestState.productTypeFilter);
  const selectedProduct=productById(productRequestState.selectedProductId)||filteredProducts[0]||null;
  const availableProducts=selectedProduct&&selectedProduct.id&&!filteredProducts.some(p=>p.id===selectedProduct.id)?[selectedProduct,...filteredProducts]:filteredProducts;
  const productOptions=availableProducts.length?availableProducts.map(p=>`<option value="${esc(p.id)}" ${p.id===productRequestState.selectedProductId?"selected":""}>${esc(p.name)}${p.materialNumber?` · ${esc(p.materialNumber)}`:""} (${formatRequestProductType(p.productType)})</option>`).join(""):`<option value="">Keine passenden Produkte</option>`;
  const packageSizeField=selectedProduct&&selectedProduct.productType==="chemical"?`<label class="field-label">Gebindegröße<select name="requestPackageSize" id="requestPackageSize"><option value="">Bitte wählen</option>${selectedProduct.packageSizes.map(size=>`<option value="${esc(size)}" ${size===productRequestState.packageSize?"selected":""}>${esc(size)}</option>`).join("")}</select></label>`:"";
  const selectedProductPreview=selectedProduct?`<div class="request-product-preview"><div class="request-product-image">${productPreviewVisual(selectedProduct,"request-preview")}</div><div><strong>${esc(selectedProduct.name)}</strong><p>${formatRequestProductType(selectedProduct.productType)}</p></div></div>`:"";
  const packagePreview=selectedProduct&&selectedProduct.productType==="chemical"&&productRequestState.packageSize?renderPackageSizePreview(productRequestState.packageSize,selectedProduct.imageUrl):"";
  return `<section class="dashboard-section request-builder"><div class="section-heading"><div><p class="eyebrow">Interne Anfrage</p><h2>Interne Angebots- / Bestellanforderung</h2><p>Öffnet eine E-Mail an ${esc(requestModule.INTERNAL_REQUEST_EMAIL)} mit Anlagen- und Produktpositionen. Es handelt sich um eine interne Anfrage, kein direkter Lieferauftrag.</p></div></div>
    <form id="productRequestForm"><div class="request-grid"><div>${selectField("requestType","Anfragetyp",productRequestState.type,Object.entries(requestModule.REQUEST_TYPES).map(([k,v])=>[k,v.label]))}${selectField("requestUrgency","Dringlichkeit",productRequestState.urgency,requestModule.URGENCIES.map(v=>[v,v]))}${field("requestDesiredDate","Gewünschter Termin",productRequestState.desiredDate,"date")}</div><div>${productTypeFilterField(productRequestState.productTypeFilter)}${field("requestSearch","Produkt suchen",productRequestState.search)}<label class="field-label">Produkt auswählen<select name="requestProductId" id="requestProductId">${productOptions}</select></label>${selectedProductPreview}${packageSizeField}${packagePreview}${field("requestQuantity","Anzahl",productRequestState.quantity,"number")}</div></div>
      <div class="sticky-form-actions"><button class="button secondary" type="button" id="addRequestPosition">Position hinzufügen</button><button class="button primary" type="submit">E-Mail-Vorlage öffnen</button></div>
      <section class="form-section"><h2>Positionen</h2>${renderRequestPositionList(productRequestState.positions)}</section>
      <section class="form-section"><h2>Zusätzliche Hinweise</h2><label class="field-label span-2">Bemerkung<textarea name="requestRemark" id="requestRemark">${esc(productRequestState.remark)}</textarea></label></section>
    </form></section>`;
}
function productTypeFilterField(value=""){return selectField("requestProductTypeFilter","Produktart",value,[["","Alle"],["chemical","Chemie"],["technical","Technik"]]);}
function bindProductRequestForm(plant){
  const form=document.querySelector("#productRequestForm");
  if(!form) return;
  const updateModal=()=>{
    const content=document.querySelector("#requestModalContent");
    if(!content) return;
    content.innerHTML=renderProductRequestSection(plant);
    bindProductRequestForm(plant);
  };
  form.querySelector("[name=requestType]")?.addEventListener("change",event=>{productRequestState.type=event.target.value;});
  form.querySelector("[name=requestUrgency]")?.addEventListener("change",event=>{productRequestState.urgency=event.target.value;});
  form.querySelector("[name=requestDesiredDate]")?.addEventListener("change",event=>{productRequestState.desiredDate=event.target.value;});
  form.querySelector("[name=requestSearch]")?.addEventListener("input",event=>{productRequestState.search=event.target.value;updateModal();});
  form.querySelector("[name=requestProductTypeFilter]")?.addEventListener("change",event=>{productRequestState.productTypeFilter=event.target.value;updateModal();});
  form.querySelector("[name=requestProductId]")?.addEventListener("change",event=>{productRequestState.selectedProductId=event.target.value;productRequestState.packageSize="";updateModal();});
  form.querySelector("[name=requestPackageSize]")?.addEventListener("change",event=>{productRequestState.packageSize=event.target.value;updateModal();});
  form.querySelector("[name=requestQuantity]")?.addEventListener("input",event=>{productRequestState.quantity=Math.max(1,Number(event.target.value)||1);});
  form.querySelector("#requestRemark")?.addEventListener("input",event=>{productRequestState.remark=event.target.value;});
  form.querySelector("#addRequestPosition")?.addEventListener("click",()=>{
    const productId=String(form.querySelector("[name=requestProductId]")?.value||"").trim();
    const product=productById(productId);
    if(!product){alert("Bitte ein Produkt auswählen.");return;}
    const position=requestModule.normalizeRequestPosition({
      productId,productName:product.name,productType:product.productType,packageSize:productRequestState.packageSize,quantity:productRequestState.quantity,productImageUrl:product.imageUrl
    });
    const validation=requestModule.validateRequestPosition(position);
    if(!validation.valid){alert(validation.errors.join("\n"));return;}
    productRequestState.positions=[...productRequestState.positions,position];
    productRequestState.quantity=1;productRequestState.packageSize="";
    updateModal();
  });
  form.addEventListener("submit",event=>{event.preventDefault();
    if(!productRequestState.positions.length){alert("Füge mindestens eine Position zur Anfrage hinzu.");return;}
    const mailData=requestModule.buildRequestMail({
      type:productRequestState.type,plant,urgency:productRequestState.urgency,desiredDate:productRequestState.desiredDate,remark:productRequestState.remark,positions:productRequestState.positions
    });
    addCommunicationEntry(plant,{type:"mail",title:productRequestState.type==="offer"?"Interne Angebotsanfrage geöffnet":"Interne Bestellanforderung geöffnet",recipient:mailData.to,subject:mailData.subject,note:`${productRequestState.positions.length} Positionen`});
    closeProductRequestModal();
    openMailClient(mailData);
  });
  $$('[data-remove-request-position]').forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.removeRequestPosition);
    if(Number.isNaN(index)) return;
    productRequestState.positions=productRequestState.positions.filter((_,i)=>i!==index);
    updateModal();
  }));
}
function renderProductRequestModal(){
  return `<div class="request-modal-backdrop" id="requestModalBackdrop" hidden></div>
    <section class="request-modal" id="requestModal" role="dialog" aria-modal="true" aria-labelledby="requestModalTitle" hidden>
      <header class="request-modal-header"><div><p class="eyebrow">Interne Anfrage</p><h2 id="requestModalTitle">Produkte auswählen</h2></div><button type="button" class="button secondary compact" id="closeRequestModal">Schließen</button></header>
      <div id="requestModalContent"></div>
    </section>`;
}
function openProductRequestModal(plant){
  const backdrop=document.querySelector("#requestModalBackdrop");
  const modal=document.querySelector("#requestModal");
  const content=document.querySelector("#requestModalContent");
  if(!backdrop||!modal||!content) return;
  content.innerHTML=renderProductRequestSection(plant);
  bindProductRequestForm(plant);
  modal.hidden=false;backdrop.hidden=false;
  requestAnimationFrame(()=>{backdrop.classList.add("open");modal.classList.add("open");});
  document.body.classList.add("modal-open");
  const closeButton=document.querySelector("#closeRequestModal");
  if(closeButton) closeButton.onclick = closeProductRequestModal;
  backdrop.onclick = closeProductRequestModal;
}
function closeProductRequestModal(){
  const backdrop=document.querySelector("#requestModalBackdrop");
  const modal=document.querySelector("#requestModal");
  if(!backdrop||!modal||modal.hidden) return;
  modal.classList.remove("open");backdrop.classList.remove("open");
  document.body.classList.remove("modal-open");
  backdrop.onclick = null;
  setTimeout(()=>{modal.hidden=true;backdrop.hidden=true;},220);
}
function bindProductRequestActions(plant){
  const openButtons=$$("#openRequestModal");
  if(!openButtons.length) return;
  openButtons.forEach(button=>button.addEventListener("click",()=>openProductRequestModal(plant)));
}
function salesStageLabel(stage){
  return SALES_FUNNEL_STAGES.find(([id])=>id===stage)?.[1]||stage;
}
function parsePotentialValue(value=""){
  const normalized=String(value||"").replace(/\./g,"").replace(",", ".").replace(/[^0-9.-]/g,"");
  const num=Number(normalized);
  return Number.isFinite(num)?num:0;
}
function moneyLabel(value){
  return Number(value||0).toLocaleString("de-DE",{maximumFractionDigits:0});
}
function validDate(value){
  const date=new Date(value||"");
  return Number.isNaN(date.getTime())?null:date;
}
function daysSinceDate(value){
  const date=validDate(value);
  if(!date) return null;
  const now=new Date();
  return Math.max(0,Math.floor((now.getTime()-date.getTime())/86400000));
}
function salesReminderAlerts(limit=4){
  const reminders=[];
  plants.forEach(plant=>{
    const pipeline=normalizeSalesPipeline(plant.salesPipeline||{},plant.salesFunnel||{});
    (pipeline.opportunities||[]).forEach(opportunity=>{
      const orderAge=daysSinceDate(opportunity.lastOrderDate);
      const deliveryAge=daysSinceDate(opportunity.lastDeliveryDate);
      const maxAge=Math.max(orderAge??-1,deliveryAge??-1);
      if(maxAge<SALES_REMINDER_WARNING_DAYS) return;
      const orderDominant=orderAge!==null&&(deliveryAge===null||orderAge>=deliveryAge);
      const referenceLabel=orderDominant?"Bestellung":"Belieferung";
      const referenceDate=orderDominant?opportunity.lastOrderDate:opportunity.lastDeliveryDate;
      const referenceDays=orderDominant?orderAge:deliveryAge;
      reminders.push({
        level:maxAge>=SALES_REMINDER_CRITICAL_DAYS?"red":"yellow",
        maxAge,
        plantId:plant.id,
        plantName:plant.master?.name||"Unbenannte Anlage",
        opportunityTitle:opportunity.title||"Unbenannte Chance",
        referenceLabel,
        referenceDateLabel:formatShortDate(referenceDate),
        referenceDaysLabel:`vor ${referenceDays} Tagen`
      });
    });
  });
  return reminders
    .sort((a,b)=>{
      const levelWeight=x=>x.level==="red"?2:1;
      return levelWeight(b)-levelWeight(a)||b.maxAge-a.maxAge;
    })
    .slice(0,limit);
}
function salesRecencySnapshot(value){
  const date=validDate(value);
  if(!date) return {dateLabel:"–",ageLabel:"Noch nicht erfasst",toneClass:"gray",statusLabel:"Unbekannt"};
  const days=daysSinceDate(value);
  if(days<=35) return {dateLabel:formatShortDate(value),ageLabel:`vor ${days} Tagen`,toneClass:"green",statusLabel:"Aktuell"};
  if(days<=70) return {dateLabel:formatShortDate(value),ageLabel:`vor ${days} Tagen`,toneClass:"yellow",statusLabel:"Beobachten"};
  return {dateLabel:formatShortDate(value),ageLabel:`vor ${days} Tagen`,toneClass:"red",statusLabel:"Abwanderungsrisiko"};
}
function latestPipelineDate(opportunities,key){
  const entries=(opportunities||[])
    .map(item=>item?.[key])
    .map(value=>({value,date:validDate(value)}))
    .filter(entry=>entry.date)
    .sort((a,b)=>b.date.getTime()-a.date.getTime());
  return entries[0]?.value||"";
}
function suggestedSalesStage(plant,opportunity){
  const communications=plant.communications||[];
  const offers=communications.filter(entry=>/angebot/i.test(entry.title||"")).length;
  const orders=communications.filter(entry=>/bestell|auftrag/i.test(entry.title||"")).length;
  const doneVisits=(plant.visits||[]).filter(visit=>visit.status==="done").length;
  const orderAge=daysSinceDate(opportunity?.lastOrderDate);
  if(orderAge!==null&&orderAge>120){
    return {stage:"offer",reason:`Letzte Bestellung liegt ${orderAge} Tage zurück. Reaktivierung über neues Angebot empfohlen.`};
  }
  if(orders>0) return {stage:"order",reason:"Mindestens ein Auftrag/Bestellkontakt dokumentiert."};
  if(offers>0) return {stage:"offer",reason:"Mindestens ein Angebotskontakt dokumentiert."};
  if(doneVisits>0) return {stage:"trial",reason:"Abgeschlossene Einsätze deuten auf eine aktive Erprobung hin."};
  if(communications.length>0) return {stage:"analysis",reason:"Es gibt Kommunikation, aber noch keine Angebots-/Auftragsaktivität."};
  if(String(opportunity?.nextStep||"").trim()) return {stage:"analysis",reason:"Nächster Schritt ist gesetzt, die Chance ist in Bearbeitung."};
  return {stage:"analysis",reason:"Keine verwertbaren Vertriebssignale erkannt."};
}
function salesFunnelMetrics(plant,pipeline){
  const opportunities=Array.isArray(pipeline?.opportunities)?pipeline.opportunities:[];
  const openDeals=opportunities.filter(item=>item.stage!=="aftercare").length;
  const totalPotential=opportunities.reduce((sum,item)=>sum+parsePotentialValue(item.potentialValue),0);
  const weightedForecast=opportunities.reduce((sum,item)=>sum+parsePotentialValue(item.potentialValue)*(SALES_STAGE_PROBABILITY[item.stage]||0),0);
  const atRiskDeals=opportunities.filter(item=>{
    const age=daysSinceDate(item.lastOrderDate);
    return age===null||age>70;
  }).length;
  const latestOrderDate=latestPipelineDate(opportunities,"lastOrderDate");
  const latestDeliveryDate=latestPipelineDate(opportunities,"lastDeliveryDate");
  const communications=plant.communications||[];
  const offers=communications.filter(entry=>/angebot/i.test(entry.title||"")).length;
  const orders=communications.filter(entry=>/bestell|auftrag/i.test(entry.title||"")).length;
  const lastVisit=(plant.visits||[]).filter(v=>v.start).sort((a,b)=>new Date(b.start).getTime()-new Date(a.start).getTime())[0];
  return {
    opportunities:opportunities.length,
    openDeals,
    totalPotential,
    weightedForecast,
    atRiskDeals,
    communications:communications.length,
    offers,
    orders,
    latestOrderDate:latestOrderDate?formatShortDate(latestOrderDate):"–",
    latestDeliveryDate:latestDeliveryDate?formatShortDate(latestDeliveryDate):"–",
    lastVisitDate:lastVisit?.start?formatShortDate(lastVisit.start):"–"
  };
}
function notifyActiveSalesRemindersOnStartup(){
  const reminders=salesReminderAlerts(3);
  if(!reminders.length) return;
  const dayKey=new Date().toISOString().slice(0,10);
  try{
    const previous=JSON.parse(localStorage.getItem(STORAGE_SALES_REMINDER_NOTICE)||"null");
    if(previous?.dayKey===dayKey&&previous?.count===reminders.length) return;
  }catch{}
  localStorage.setItem(STORAGE_SALES_REMINDER_NOTICE,JSON.stringify({dayKey,count:reminders.length}));
  const top=reminders[0];
  const shouldOpen=confirm(`${reminders.length} Wiederbestell-Reminder aktiv.\n\nDringend: ${top.plantName} · ${top.opportunityTitle}\nLetzte ${top.referenceLabel}: ${top.referenceDateLabel} (${top.referenceDaysLabel})\n\nJetzt im Vertrieb öffnen?`);
  if(!shouldOpen) return;
  activePlantId=top.plantId;
  savePlants();
  showPlantDashboard("sales");
}
function renderSalesFunnelSection(plant){
  const pipeline=normalizeSalesPipeline(plant.salesPipeline||{},plant.salesFunnel||{});
  const opportunities=pipeline.opportunities;
  const active=opportunities.find(item=>item.id===pipeline.activeOpportunityId)||opportunities[0];
  const activeIndex=Math.max(0,SALES_FUNNEL_STAGES.findIndex(([id])=>id===active.stage));
  const history=(active.history||[]).slice(-5).reverse();
  const suggestion=suggestedSalesStage(plant,active);
  const metrics=salesFunnelMetrics(plant,pipeline);
  const orderRecency=salesRecencySnapshot(active.lastOrderDate);
  const deliveryRecency=salesRecencySnapshot(active.lastDeliveryDate);
  return `<section class="dashboard-section sales-funnel-section"><div class="section-heading"><div><p class="eyebrow">Pipeline</p><h2>Sales Funnel</h2><p class="form-note">Mehrere Chancen pro Anlage inklusive Forecast und Stage-Empfehlung.</p></div><span class="status-chip blue">Aktuell: ${esc(salesStageLabel(active.stage))}</span></div>
    <div class="sales-opportunity-bar"><div class="sales-opportunity-list">${opportunities.map((item,index)=>`<button type="button" class="sales-opportunity-chip ${item.id===active.id?"active":""}" data-sales-opp="${esc(item.id)}"><strong>${esc(item.title||`Chance ${index+1}`)}</strong><small>${esc(salesStageLabel(item.stage))}</small></button>`).join("")}</div><div class="sales-opportunity-actions"><button type="button" class="button secondary compact" id="addSalesOpportunity">+ Chance</button><button type="button" class="button secondary compact" id="duplicateSalesOpportunity">Duplizieren</button><button type="button" class="button secondary compact" id="deleteSalesOpportunity" ${opportunities.length<=1?"disabled":""}>Löschen</button></div></div>
    <div class="sales-funnel-track">${SALES_FUNNEL_STAGES.map(([id,label],index)=>`<button type="button" class="sales-funnel-step ${index===activeIndex?"active":""} ${index<activeIndex?"done":""}" data-funnel-stage="${id}" aria-pressed="${index===activeIndex?"true":"false"}"><small>Stufe ${index+1}</small><strong>${esc(label)}</strong></button>`).join("")}</div>
    <div class="info-box"><strong>Automatische Empfehlung:</strong> ${esc(salesStageLabel(suggestion.stage))} · ${esc(suggestion.reason)} ${suggestion.stage!==active.stage?`<button type="button" class="button secondary compact" id="applySuggestedStage" data-suggested-stage="${esc(suggestion.stage)}">Vorschlag übernehmen</button>`:""}</div>
    <div class="sales-funnel-metrics"><article><span>Chancen gesamt</span><strong>${metrics.opportunities}</strong></article><article><span>Offene Chancen</span><strong>${metrics.openDeals}</strong></article><article><span>Pipeline-Wert</span><strong>${moneyLabel(metrics.totalPotential)} EUR</strong></article><article><span>Gewichteter Forecast</span><strong>${moneyLabel(metrics.weightedForecast)} EUR</strong></article><article><span>Reaktivierung nötig</span><strong>${metrics.atRiskDeals}</strong></article><article><span>Kommunikation</span><strong>${metrics.communications}</strong></article><article><span>Angebote</span><strong>${metrics.offers}</strong></article><article><span>Aufträge</span><strong>${metrics.orders}</strong></article><article><span>Letzte Bestellung</span><strong>${esc(metrics.latestOrderDate)}</strong></article><article><span>Letzte Belieferung</span><strong>${esc(metrics.latestDeliveryDate)}</strong></article><article><span>Letzter Besuch</span><strong>${esc(metrics.lastVisitDate)}</strong></article></div>
    <div class="sales-recency-grid"><article class="sales-recency-card"><span>Aktive Chance: letzte Bestellung</span><strong>${esc(orderRecency.dateLabel)}</strong><small>${esc(orderRecency.ageLabel)}</small><div class="status-chip ${orderRecency.toneClass}">${esc(orderRecency.statusLabel)}</div></article><article class="sales-recency-card"><span>Aktive Chance: letzte Belieferung</span><strong>${esc(deliveryRecency.dateLabel)}</strong><small>${esc(deliveryRecency.ageLabel)}</small><div class="status-chip ${deliveryRecency.toneClass}">${esc(deliveryRecency.statusLabel)}</div></article></div>
    <form id="salesFunnelForm" class="record-form"><input type="hidden" name="salesOpportunityId" value="${esc(active.id)}"><div class="form-grid">${field("salesOpportunityTitle","Chancentitel",active.title)}${field("salesFunnelPotentialValue","Potenzialwert (EUR)",active.potentialValue,"number")}${field("salesFunnelNextStep","Nächster Schritt",active.nextStep)}${field("salesFunnelLastContact","Letzter Kontakt",active.lastContactDate,"date")}${field("salesFunnelLastOrder","Letzte Bestellung",active.lastOrderDate,"date")}${field("salesFunnelLastDelivery","Letzte Belieferung",active.lastDeliveryDate,"date")}${field("salesFunnelTargetClose","Zielabschluss",active.targetCloseDate,"date")}<label class="field-label span-2">Notizen zum Stand<textarea name="salesFunnelNotes">${esc(active.notes||"")}</textarea></label></div><div class="section-actions"><button type="submit" class="button primary">Chance speichern</button><button type="button" class="button secondary" id="openRequestModal">Anfrage vorbereiten</button></div></form>
    <article class="record-card sales-funnel-history"><h2>Letzte Phasenwechsel (${esc(active.title||"Chance")})</h2>${history.length?`<ul>${history.map(item=>`<li><strong>${esc(salesStageLabel(item.stage))}</strong><span>${esc(formatShortDate(item.changedAt))}</span><small>${esc(item.note||"Phasenwechsel")}</small></li>`).join("")}</ul>`:`<div class="empty-panel compact"><p>Noch keine Phasenwechsel dokumentiert.</p></div>`}</article>
  </section>`;
}
function bindSalesFunnelActions(plant){
  const pipeline=normalizeSalesPipeline(plant.salesPipeline||{},plant.salesFunnel||{});
  const getActiveOpportunity=()=>pipeline.opportunities.find(item=>item.id===pipeline.activeOpportunityId)||pipeline.opportunities[0];
  const persist=()=>{
    plant.salesPipeline=pipeline;
    const active=getActiveOpportunity();
    // Legacy mirror keeps backward compatibility for previously stored single-funnel consumers.
    plant.salesFunnel=normalizeSalesFunnel(active||{});
    plant.updatedAt=new Date().toISOString();
    return savePlants();
  };
  $$('[data-sales-opp]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.salesOpp;
    if(!id||id===pipeline.activeOpportunityId) return;
    pipeline.activeOpportunityId=id;
    if(persist())showPlantDashboard("sales");
  }));
  $("#addSalesOpportunity")?.addEventListener("click",()=>{
    const nextIndex=pipeline.opportunities.length+1;
    const created=normalizeSalesOpportunity({title:`Chance ${nextIndex}`});
    pipeline.opportunities=[...pipeline.opportunities,created];
    pipeline.activeOpportunityId=created.id;
    if(persist())showPlantDashboard("sales");
  });
  $("#duplicateSalesOpportunity")?.addEventListener("click",()=>{
    const active=getActiveOpportunity();
    if(!active) return;
    const duplicate=normalizeSalesOpportunity({...active,id:makeId(),title:`${active.title} (Kopie)`,history:[]});
    pipeline.opportunities=[...pipeline.opportunities,duplicate];
    pipeline.activeOpportunityId=duplicate.id;
    if(persist())showPlantDashboard("sales");
  });
  $("#deleteSalesOpportunity")?.addEventListener("click",()=>{
    if(pipeline.opportunities.length<=1){alert("Mindestens eine Chance muss erhalten bleiben.");return;}
    const active=getActiveOpportunity();
    if(!active) return;
    if(!confirm(`Chance „${active.title}“ wirklich löschen?`)) return;
    pipeline.opportunities=pipeline.opportunities.filter(item=>item.id!==active.id);
    pipeline.activeOpportunityId=pipeline.opportunities[0]?.id||"";
    if(persist())showPlantDashboard("sales");
  });
  $$('[data-funnel-stage]').forEach(button=>button.addEventListener('click',()=>{
    const active=getActiveOpportunity();
    if(!active) return;
    const nextStage=button.dataset.funnelStage;
    if(!nextStage||nextStage===active.stage) return;
    active.history=[...(active.history||[]),{stage:nextStage,changedAt:new Date().toISOString(),note:`Wechsel von ${salesStageLabel(active.stage)} zu ${salesStageLabel(nextStage)}`}].slice(-20);
    active.stage=nextStage;
    active.updatedAt=new Date().toISOString();
    if(persist())showPlantDashboard("sales");
  }));
  $("#applySuggestedStage")?.addEventListener("click",event=>{
    const stage=event.currentTarget.dataset.suggestedStage;
    const active=getActiveOpportunity();
    if(!stage||!active||stage===active.stage) return;
    active.history=[...(active.history||[]),{stage,changedAt:new Date().toISOString(),note:`Vorschlag übernommen: ${salesStageLabel(stage)}`}].slice(-20);
    active.stage=stage;
    active.updatedAt=new Date().toISOString();
    if(persist())showPlantDashboard("sales");
  });
  const form=$("#salesFunnelForm");
  if(!form) return;
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const active=getActiveOpportunity();
    if(!active) return;
    const fd=new FormData(form);
    active.title=String(fd.get("salesOpportunityTitle")||"").trim()||active.title;
    active.potentialValue=String(fd.get("salesFunnelPotentialValue")||"").trim();
    active.nextStep=String(fd.get("salesFunnelNextStep")||"").trim();
    active.lastContactDate=String(fd.get("salesFunnelLastContact")||"").trim();
    active.lastOrderDate=String(fd.get("salesFunnelLastOrder")||"").trim();
    active.lastDeliveryDate=String(fd.get("salesFunnelLastDelivery")||"").trim();
    active.targetCloseDate=String(fd.get("salesFunnelTargetClose")||"").trim();
    active.notes=String(fd.get("salesFunnelNotes")||"").trim();
    active.updatedAt=new Date().toISOString();
    if(persist())showPlantDashboard("sales");
  });
}
function renderPlantSchemaPage(plant){return renderProcessSchema3D(plant);}
function renderPlantVisitsPage(plant){return `${renderVisits(plant)}${renderPlantTimeline(plant)}`;}
function renderPlantTasksPage(plant){return renderActionCenter(plant);}
function renderPlantSalesPage(plant){
  return `${renderSalesFunnelSection(plant)}
    <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Technischer Vertrieb</p><h2>Interne Anfrage erstellen</h2><p class="form-note">Öffne die Produkt-Auswahl, wähle Positionen und sende dann die interne Anfrage-Mail.</p></div></div>
      <div class="info-box"><strong>Schritt 1:</strong> Produkte wählen und Positionen in der Anfrage zusammenstellen.</div>
      <div class="section-actions"><button class="button primary" type="button" id="openRequestModal">Anfrage vorbereiten</button></div>
    </section>
    <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Produktdaten</p><h2>Produktaktesammlung</h2><p>Produkte werden global gepflegt. Hier können chemische und technische Produkte zentral verwaltet werden.</p></div></div>
    <div class="sales-foundation-grid"><article><span>Produkte</span><strong>Produktakte vorbereiten</strong><p>Eingesetzte, geplante und historische Produkte werden hier mit der Anlage verknüpft.</p></article><article><span>Dokumente</span><strong>Dokumentenbibliothek folgt</strong><p>Produktdatenblätter, Sicherheitsdatenblätter, Angebote und Aufträge werden offline verwaltet.</p></article><article><span>Optimierungsprojekte</span><strong>Sales Funnel im Anlagenkontext</strong><p>Analyse, Versuch, Angebot, Auftrag und Nachbetreuung werden als fachliches Projekt abgebildet.</p></article></div>
    <div class="info-box"><strong>Nächster Ausbauschritt:</strong> IndexedDB-Dokumentenspeicher und globale Produktbibliothek.</div></section>
    ${renderProductRequestModal()}`;
}
function renderPlantRecordPage(plant){
  const primary=plant.contacts?.[0],mapUrls=googleMapsUrls(plant);
  const operatorLookupNote = plant.operatorLookup?.status
    ? plant.operatorLookup.status === "found"
      ? `Betreiber/Verband automatisch gefunden${plant.operatorLookup.operator?.name?`: ${plant.operatorLookup.operator.name}`:""}`
      : plant.operatorLookup.status === "not-found"
        ? "Kein Betreiber/Verband automatisch gefunden."
        : plant.operatorLookup.status === "error"
          ? `Betreiber-Suche fehlgeschlagen: ${plant.operatorLookup.error||"Bitte manuell prüfen."}`
          : "Betreiber-Suche ausgeführt."
    : "Automatische Betreiber-Suche noch nicht ausgeführt.";
  return `<section class="map-section"><div class="map-frame-wrap">${locationQuery(plant)?`<iframe class="map-frame" title="Standort der Anlage" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapUrls.embed}"></iframe>`:`<div class="map-placeholder"><strong>Kein Standort hinterlegt</strong><span>Adresse oder GPS-Koordinaten ergänzen.</span></div>`}</div>
  <article class="map-info-card"><p class="eyebrow">Standort und Anfahrt</p><h2>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"Adresse fehlt")}</h2><p>${plant.address.latitude&&plant.address.longitude?`Breitengrad: ${esc(plant.address.latitude)} · Längengrad: ${esc(plant.address.longitude)}`:plant.address.gps?`GPS: ${esc(plant.address.gps)}`:"Navigation erfolgt über die hinterlegte Anlagenadresse."}</p>${locationQuery(plant)?mapsButtons(plant):""}<p class="form-note">${esc(operatorLookupNote)}</p><div class="access-quick"><div><span>Parken</span><strong>${esc(plant.access?.parking||"–")}</strong></div><div><span>Zufahrt</span><strong>${esc(plant.access?.gate||"–")}</strong></div><div><span>Anmeldung</span><strong>${esc(plant.access?.registration||"–")}</strong></div><div><span>PSA</span><strong>${esc(plant.access?.ppe||"–")}</strong></div></div></article></section>
  <div class="record-grid"><article class="record-card"><h2>Anlage</h2><dl><div><dt>Anlagennummer</dt><dd>${esc(plant.master.internalNumber||"–")}</dd></div><div><dt>Adresse</dt><dd>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"–")}</dd></div><div><dt>Ausbaugröße</dt><dd>${plant.master.capacityPE?`${fmtInteger(plant.master.capacityPE)} EW`:"–"}</dd></div><div><dt>Tatsächliche Belastung</dt><dd>${plant.master.actualPE?`${fmtInteger(plant.master.actualPE)} EW`:"–"}</dd></div><div><dt>Hauptverfahren</dt><dd>${esc(processLabel(plant.master.mainProcess||plant.master.process))}</dd></div><div><dt>Weitere Stufen</dt><dd>${esc(processStageLabels(plant.master.processStages).join(", ")||"–")}</dd></div></dl></article>
  <article class="record-card"><h2>Betreiber</h2><dl><div><dt>Name</dt><dd>${esc(plant.operator.name||"–")}</dd></div><div><dt>Zweckverband</dt><dd>${esc(plant.operator.association||"–")}</dd></div><div><dt>Kundennummer</dt><dd>${esc(plant.operator.customerNumber||"–")}</dd></div><div><dt>Gemeinde</dt><dd>${esc(plant.operator.municipality||"–")}</dd></div><div><dt>Landkreis</dt><dd>${esc(plant.operator.district||"–")}</dd></div><div><dt>Bundesland</dt><dd>${esc(plant.operator.state||"–")}</dd></div><div><dt>Gemeindeschlüssel</dt><dd>${esc(plant.operator.municipalityKey||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(plant.operator.phone)}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(plant.operator.email)}</dd></div><div><dt>Quelle</dt><dd>${esc(plant.operator.lookupSource||"–")}</dd></div><div><dt>Ermittelt am</dt><dd>${esc(plant.operator.lookupDate||"–")}</dd></div><div><dt>Status</dt><dd>${esc(plant.operator.lookupStatus||"IDLE")}</dd></div></dl></article>
  <article class="record-card"><h2>Hauptansprechpartner</h2><dl><div><dt>Name</dt><dd>${esc(primary?.name||"–")}</dd></div><div><dt>Funktion</dt><dd>${esc(primary?.role||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(primary?.mobile||primary?.phone||"")}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(primary?.email||"")}</dd></div></dl></article>
  <article class="record-card"><h2>Zufahrt und Besuch</h2><dl><div><dt>Parken</dt><dd>${esc(plant.access?.parking||"–")}</dd></div><div><dt>Tor / Zugang</dt><dd>${esc(plant.access?.gate||"–")}</dd></div><div><dt>Zugangscode</dt><dd>${esc(plant.access?.accessCode||"–")}</dd></div><div><dt>Besuchszeiten</dt><dd>${esc(plant.access?.openingHours||"–")}</dd></div><div><dt>Hinweise</dt><dd>${esc(plant.access?.siteNotes||"–")}</dd></div></dl></article></div>`;
}
function renderPlantSystemPage(plant){
  const visits=(plant.visits||[]).length,actions=(plant.actions||[]).length;
  return `<section class="dashboard-section system-page"><div class="section-heading"><div><p class="eyebrow">Info & System</p><h2>Abwasser-Rechner</h2></div></div>
  <div class="system-grid"><article><span>Version</span><strong>${VERSION}</strong><small>Foundation Release · Beta</small></article><article><span>Datenbestand</span><strong>${plants.length} Anlagen</strong><small>${visits} Besuche · ${actions} Aufgaben in dieser Anlage</small></article><article><span>Offline-Modus</span><strong>${navigator.onLine?'Online / offlinefähig':'Offline'}</strong><small>Lokale Speicherung im Browser</small></article><article><span>Datenmodell</span><strong>Schema ${plant.schemaVersion||'–'}</strong><small>Bestehende Daten werden weiterverwendet</small></article></div>
  <div class="record-grid"><article class="record-card"><h2>Copyright</h2><p><strong>© 2026 Mirco Krause & Sebastian Steinkohl</strong></p><p>Alle Rechte vorbehalten.</p><p>Diese Software wurde für den professionellen Einsatz im technischen Außendienst der Wasser- und Abwassertechnik entwickelt.</p></article><article class="record-card"><h2>Datenschutz</h2><p>Anlagen-, Kontakt- und Profildaten werden lokal im Browser gespeichert. Eine Übertragung an Dritte oder Cloud-Synchronisation findet in dieser Version nicht statt.</p><p>Exporte erfolgen ausschließlich durch eine bewusste Benutzeraktion.</p></article></div>
  <article class="release-notes"><h2>Release Notes 0.9.1a</h2><h3>Neu</h3><ul><li>Unterseiten für Übersicht, Technik, Einsätze, Vertrieb, Aufgaben und Akte</li><li>Persistente Anlagen-Navigation mit mobilem horizontalem Scrollen</li><li>Info-&-System-Bereich mit Copyright und Datenschutz</li></ul><h3>Verbessert</h3><ul><li>Deutlich kürzere Seiten und weniger Scrollen</li><li>Klare Trennung von Überblick, Bearbeitung und Historie</li><li>Vorbereitung für Dokumenten- und Produktbibliothek</li></ul></article></section>`;
}
function renderPlantPage(plant,page){
  const renderers={overview:renderPlantOverviewPage,schema:renderPlantSchemaPage,technology:renderPlantTechnologyPage,visits:renderPlantVisitsPage,sales:renderPlantSalesPage,tasks:renderPlantTasksPage,record:renderPlantRecordPage};
  return (renderers[page]||renderers.overview)(plant);
}
function showPlantDashboard(page){
  const plant=activePlant();if(!plant)return showPlantForm();
  const createdTankFollowUps=ensureTankOfferFollowUps(plant);
  if(createdTankFollowUps) savePlants();
  const valid=new Set(["overview","schema","technology","visits","sales","tasks","record"]);
  page=valid.has(page)?page:(valid.has(localStorage.getItem(STORAGE_PLANT_PAGE))?localStorage.getItem(STORAGE_PLANT_PAGE):"overview");
  localStorage.setItem(STORAGE_PLANT_PAGE,page);
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"}`);
  appView.innerHTML=`${plantHeader(plant)}${plantPageNavigation(page)}<div class="plant-page" data-current-page="${page}">${renderPlantPage(plant,page)}</div>`;
  $$('[data-plant-page]').forEach(b=>b.onclick=()=>showPlantDashboard(b.dataset.plantPage));
  $$('[data-jump-page]').forEach(b=>b.onclick=()=>showPlantDashboard(b.dataset.jumpPage));
  $("#editPlant")?.addEventListener("click",()=>showPlantForm(plant.id));
  $("#startVisit")?.addEventListener("click",()=>showVisitMode());
  $("#openNavigation")?.addEventListener("click",()=>{const url=googleMapsUrls(plant).directions;if(locationQuery(plant))window.open(url,"_blank","noopener");else alert("Bitte zuerst eine Adresse oder GPS-Koordinaten hinterlegen.");});
  if(page==="overview"||page==="schema")bindProcessSchema3D(appView,plant,()=>{plant.updatedAt=new Date().toISOString();savePlants();});
  $("#startVisitCockpit")?.addEventListener("click",()=>showVisitMode());
  $("#completePlantPass")?.addEventListener("click",()=>showPlantForm(plant.id));
  $("#editDewatering")?.addEventListener("click",showDewateringForm);$("#editDosing")?.addEventListener("click",showDosingForm);$("#editTanks")?.addEventListener("click",showTankForm);
  $("#editParameters")?.addEventListener("click",()=>showPlantForm(plant.id));
  $("#addVisit")?.addEventListener("click",()=>showVisitForm());
  $("#quickActionForm")?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget),title=String(fd.get("title")||"").trim();if(!title)return;plant.actions=[...(plant.actions||[]),{id:makeId(),title,status:"open",priority:fd.get("priority")||"normal",dueDate:fd.get("dueDate")||"",component:"",sourceVisitId:"",createdAt:new Date().toISOString(),completedAt:"",autoGenerated:false,followUpType:"",followUpSourceId:""}];if(savePlants())showPlantDashboard("tasks");});
  $$(`[data-toggle-action]`).forEach(b=>b.onclick=()=>{const a=(plant.actions||[]).find(x=>x.id===b.dataset.toggleAction);if(!a)return;const wasDone=a.status==="done";a.status=a.status==="done"?"open":"done";a.completedAt=a.status==="done"?new Date().toISOString():"";if(a.status==="done"&&!wasDone)ensureTaskCompletionFollowUp(plant,a);if(savePlants())showPlantDashboard("tasks");});
  $$(`[data-delete-action]`).forEach(b=>b.onclick=()=>{if(!confirm("Aufgabe wirklich löschen?"))return;plant.actions=(plant.actions||[]).filter(a=>a.id!==b.dataset.deleteAction);if(savePlants())showPlantDashboard("tasks");});
  $$('[data-open-visit]').forEach(b=>b.onclick=()=>showVisitMode(b.dataset.openVisit));$$('[data-edit-visit]').forEach(b=>b.onclick=()=>showVisitForm(b.dataset.editVisit));
  $$('[data-ics-visit]').forEach(b=>b.onclick=()=>{const v=(plant.visits||[]).find(x=>x.id===b.dataset.icsVisit);if(v)exportVisitIcs(plant,v)});
  $$('[data-delete-visit]').forEach(b=>b.onclick=()=>{const v=(plant.visits||[]).find(x=>x.id===b.dataset.deleteVisit);if(confirm(`Termin „${v?.title||"Besuch"}“ wirklich löschen?`)){plant.visits=(plant.visits||[]).filter(x=>x.id!==b.dataset.deleteVisit);savePlants();showPlantDashboard("visits");}});
  if(page==="technology")bindProcedureCard(appView);
  if(page==="overview")bindCommercialMailActions(plant);
  if(page==="sales"){bindSalesFunnelActions(plant);bindProductRequestActions(plant);} 
  bindCommunicationLinks(plant);
  bindDashboardActions();
}

function showLimits(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("limits");setBreadcrumb("Grenz- und Zielwerte");
  const limits=plant.limits||structuredClone(defaultLimits);
  appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">Bewertungslogik</p><h1>Grenz- und Zielwerte</h1><p class="subtitle">Anlagenspezifische Ampelgrenzen. Rechtliche Werte sind vom Nutzer anhand des Bescheids zu prüfen.</p></div></section>
  <form id="limitsForm" class="limits-list">${limits.map((l,i)=>`<article class="limit-card">
    <div><h3>${l.label}</h3><p>${l.unit} · ${l.direction==="max"?"kleiner ist besser":l.direction==="min"?"größer ist besser":"Zielbereich"}</p></div>
    ${l.direction==="range"?`
      ${field(`limit.${i}.greenMin`,"Grün von",l.greenMin,"number")}${field(`limit.${i}.greenMax`,"Grün bis",l.greenMax,"number")}
      ${field(`limit.${i}.warningMin`,"Warnbereich von",l.warningMin,"number")}${field(`limit.${i}.warningMax`,"Warnbereich bis",l.warningMax,"number")}
    `:`
      ${field(`limit.${i}.target`,"Betriebsziel",l.target,"number")}${field(`limit.${i}.warning`,"Warnschwelle",l.warning,"number")}
      ${field(`limit.${i}.legal`,"Genehmigungswert optional",l.legal??"","number")}
    `}
  </article>`).join("")}<div class="sticky-form-actions"><button type="button" class="button secondary" id="resetLimits">Standardwerte</button><button class="button primary" type="submit">Grenzen speichern</button></div></form>`;
  enableDecimalInputs(appView);
  $("#resetLimits").onclick=()=>{plant.limits=structuredClone(defaultLimits);savePlants();showLimits()};
  $("#limitsForm").onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    limits.forEach((l,i)=>{
      const props=l.direction==="range"?["greenMin","greenMax","warningMin","warningMax"]:["target","warning","legal"];
      props.forEach(prop=>{const v=fd.get(`limit.${i}.${prop}`);l[prop]=v===""?null:Number(v)});
    });
    plant.limits=limits;plant.updatedAt=new Date().toISOString();savePlants();showTraffic();
  };
}
function showTraffic(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("traffic");setBreadcrumb("Ampelübersicht");
  const evals=evaluations(plant);
  appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">Anlagenbewertung</p><h1>Ampelübersicht</h1><p class="subtitle">${esc(plant.master.name||"Unbenannte Anlage")} · Bewertung anhand der hinterlegten anlagenspezifischen Grenzen.</p></div><button class="button secondary" id="configureLimits">Grenzen konfigurieren</button></section>
  ${renderTechnicalAssets(plant)}
  ${renderTrafficSummary(plant)}
  <div class="traffic-grid">${evals.map(item=>`<article class="traffic-card ${item.evaluation.level}">
    <div class="traffic-card-head"><span class="traffic-light ${item.evaluation.level}"></span><span>${item.label}</span></div>
    <strong>${fmt(item.value)} <small>${item.unit}</small></strong>
    <p>${item.evaluation.label}</p><small>${item.evaluation.reason}</small>
  </article>`).join("")}</div>
  <div class="info-box"><strong>Hinweis:</strong> Die Ampel ist eine betriebliche Orientierung. Genehmigungswerte, Messunsicherheiten, Messstellen, Temperatur, Verfahren und weitere Randbedingungen sind separat zu berücksichtigen.</div>`;
  $("#configureLimits").onclick=showLimits;
}

function showProfile(){
  setView("profile");setBreadcrumb("Mitarbeiterprofil");
  const p=employeeProfile,full=employeeDisplayName();
  appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">Außendienst</p><h1>Mitarbeiterprofil</h1><p class="subtitle">Persönliche Kontaktdaten, digitale Visitenkarte und lokale Datensicherung.</p></div><button class="button primary" id="editEmployeeProfile">Profil bearbeiten</button></section>
  <section class="employee-profile-layout"><article class="employee-card"><div class="employee-card-head"><div class="employee-large-avatar">${esc((p.firstName?.[0]||p.lastName?.[0]||"P").toUpperCase())}</div><div><h2>${esc(full)}</h2><p>${esc(p.jobTitle||"Funktion nicht hinterlegt")}</p><strong>${esc(p.company||"")}</strong></div></div>
  <dl class="employee-contact-list"><div><dt>Mobil</dt><dd>${telLink(p.mobile)}</dd></div><div><dt>Telefon</dt><dd>${telLink(p.phone)}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(p.email)}</dd></div><div><dt>Region</dt><dd>${esc(p.region||"–")}</dd></div><div><dt>Niederlassung</dt><dd>${esc(p.branch||"–")}</dd></div><div><dt>Personalnummer</dt><dd>${esc(p.employeeNumber||"–")}</dd></div></dl></article>
  <article class="qr-profile-card"><p class="eyebrow">Digitale Visitenkarte</p><h2>Kontakt-QR-Code</h2><div class="qr-code">${qrSvg(employeeVCard())}</div><p>Der QR-Code enthält eine vCard und kann mit der Smartphone-Kamera gescannt werden.</p><button class="button secondary" id="downloadVCard">Kontaktdatei herunterladen</button></article></section>
  <section class="profile-dashboard-grid"><article class="cockpit-panel"><div class="panel-title"><div><p class="eyebrow">Arbeitsübersicht</p><h2>Mein Dashboard</h2></div></div><div class="cockpit-metrics"><div><strong>${plants.length}</strong><span>Anlagen lokal</span></div><div><strong>${upcomingVisits(99).length}</strong><span>Kommende Termine</span></div><div><strong>${plants.reduce((n,x)=>n+(x.visits||[]).filter(v=>v.status!=="done"&&v.status!=="cancelled").length,0)}</strong><span>Offene Besuche</span></div></div></article>
  <article class="cockpit-panel"><div class="panel-title"><div><p class="eyebrow">Datenschutz & Offline</p><h2>Lokale Datensicherung</h2></div></div><p>Profil und Anlagen liegen ausschließlich in diesem Browser. Exportiere regelmäßig eine Sicherungsdatei.</p><div class="profile-backup-actions"><button class="button secondary" id="exportFullBackup">Gesamtsicherung exportieren</button><label class="button secondary file-label-inline">Sicherung importieren<input id="importFullBackup" type="file" accept=".json,application/json"></label></div><p class="muted-small">Beim Import werden vorhandene Daten erst nach Bestätigung ersetzt.</p></article></section>`;
  $("#editEmployeeProfile").onclick=showProfileForm;$("#downloadVCard").onclick=downloadVCard;$("#exportFullBackup").onclick=()=>downloadJson(`abwasser-rechner-sicherung-${new Date().toISOString().slice(0,10)}.json`,{schema:"abwasser-rechner-backup-v1",version:VERSION,exportedAt:new Date().toISOString(),employeeProfile,plants,products,activePlantId});
  $("#importFullBackup").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.plants)||!data.employeeProfile)throw new Error("Keine gültige Gesamtsicherung");if(!confirm("Vorhandene Profil- und Anlagendaten durch diese Sicherung ersetzen?"))return;plants=data.plants.map(normalizePlant);products=Array.isArray(data.products)?data.products.map(normalizeProduct):products;saveProducts();employeeProfile=normalizeEmployeeProfile(data.employeeProfile);activePlantId=data.activePlantId&&plants.some(x=>x.id===data.activePlantId)?data.activePlantId:plants[0]?.id||"";if(savePlants()&&saveEmployeeProfile())showProfile();}catch(err){alert(`Import nicht möglich: ${err.message}`)}finally{e.target.value="";}};
}
function showProfileForm(){
  setView("profileForm");setBreadcrumb("Mitarbeiterprofil › Bearbeiten");const p=employeeProfile;
  appView.innerHTML=`<form id="employeeProfileForm" class="record-form"><section class="page-header"><div><p class="eyebrow">Außendienst</p><h1>Profil bearbeiten</h1><p class="subtitle">Diese Daten werden lokal gespeichert und für die digitale Visitenkarte verwendet.</p></div></section><section class="form-section"><div class="form-grid">${field("firstName","Vorname",p.firstName)}${field("lastName","Nachname",p.lastName)}${field("jobTitle","Funktion",p.jobTitle)}${field("company","Unternehmen",p.company)}${field("department","Abteilung",p.department)}${field("employeeNumber","Personalnummer",p.employeeNumber)}${field("region","Vertriebsgebiet / Region",p.region)}${field("branch","Niederlassung",p.branch)}${field("email","E-Mail",p.email,"email")}${phoneField("mobile","Mobiltelefon",p.mobile)}${phoneField("phone","Festnetz",p.phone)}${field("website","Webseite",p.website,"url")}${field("street","Straße und Hausnummer",p.street)}${field("postalCode","PLZ",p.postalCode)}${field("city","Ort",p.city)}${field("country","Land",p.country)}<label class="field-label span-2">Bemerkungen<textarea name="notes">${esc(p.notes)}</textarea></label></div></section><div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelEmployeeProfile">Abbrechen</button><button type="submit" class="button primary">Profil speichern</button></div></form>`;
  const form=$("#employeeProfileForm");$("#cancelEmployeeProfile").onclick=showProfile;form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),next=normalizeEmployeeProfile();for(const key of Object.keys(next)){if(key==="schemaVersion"||key==="mobile"||key==="phone")continue;if(fd.has(key))next[key]=String(fd.get(key)||"").trim();}next.mobile=combinePhone(fd,"mobile");next.phone=combinePhone(fd,"phone");employeeProfile=next;if(saveEmployeeProfile())showProfile();};
}

function openMobileSidebar(){$("#sidebar").classList.add("mobile-open");$("#sidebarBackdrop").classList.add("visible");document.body.classList.add("menu-open")}
function closeMobileSidebar(){$("#sidebar").classList.remove("mobile-open");$("#sidebarBackdrop").classList.remove("visible");document.body.classList.remove("menu-open")}
function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

$$('[data-primary-view]').forEach(button=>button.onclick=()=>{
  const target=button.dataset.primaryView;
  if(target==="plants")showApplication("plants");
  else if(target==="calculators")showAllCalculators();
  closeMobileSidebar();
});
$$('[data-global-view]').forEach(button=>button.onclick=()=>{showGlobalPage(button.dataset.globalView);closeMobileSidebar();});
const showAllButton=$("#showAllCalculators");if(showAllButton)showAllButton.onclick=()=>{showAllCalculators();closeMobileSidebar()};
$("#homeButton").onclick=()=>showGlobalPage("today");
$("#breadcrumbHome").onclick=()=>showGlobalPage("today");$("#profileButton").onclick=showProfile;$("#profileMenuButton").onclick=()=>{showProfile();closeMobileSidebar()};$("#sidebarOpen").onclick=openMobileSidebar;$("#sidebarClose").onclick=closeMobileSidebar;$("#sidebarBackdrop").onclick=closeMobileSidebar;$("#printButton").onclick=()=>window.print();
$("#activePlantSelect").onchange=e=>{activePlantId=e.target.value;savePlants();showPlantDashboard()};
$("#managePlantsButton").onclick=()=>{showApplication("plants");closeMobileSidebar()};
$("#newPlantButton").onclick=()=>{showPlantForm();closeMobileSidebar()};
$$("[data-view]").forEach(b=>b.onclick=()=>{showApplication(b.dataset.view);closeMobileSidebar()});
$$("[data-static-toggle]").forEach(b=>b.onclick=()=>{
  const group=b.closest(".menu-group");group.classList.toggle("open");b.setAttribute("aria-expanded",group.classList.contains("open"));
});
$("#searchInput").oninput=e=>{state.query=e.target.value;if(state.query)showSearchResults();else if(state.view==="calculators")showSearchResults()};
$("#clearSearch").onclick=()=>{$("#searchInput").value="";state.query="";showGlobalPage("today")};
$("#favoriteFilter").onclick=()=>{state.favoritesOnly?showHome():showFavorites();closeMobileSidebar()};
$("#exportPlantButton").onclick=()=>{
  const plant=activePlant();if(!plant)return alert("Bitte zuerst eine Anlage auswählen.");
  const safe=(plant.master.name||"klaeranlage").toLowerCase().replace(/[^a-z0-9äöüß]+/gi,"-").replace(/^-|-$/g,"");
  downloadJson(`${safe||"klaeranlage"}-anlagenakte.json`,{schema:"abwasser-rechner-plant-v1",exportedAt:new Date().toISOString(),plant});
};
$("#importPlantInput").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());const imported=parsed.plant||parsed;
    if(!imported.master||!imported.address||!imported.operator)throw new Error("Ungültige Anlagenakte");
    imported.id=crypto.randomUUID();imported.createdAt=new Date().toISOString();imported.updatedAt=new Date().toISOString();
    imported.limits=imported.limits||structuredClone(defaultLimits);imported.contacts=imported.contacts||[];imported.parameters=imported.parameters||{};imported.access=imported.access||{};imported.visits=imported.visits||[];
    plants.push(imported);activePlantId=imported.id;savePlants();showPlantDashboard();
  }catch(err){alert(`Import nicht möglich: ${err.message}`)}
  e.target.value="";
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installButton").classList.remove("hidden")});
$("#installButton").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installButton").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"}));
window.addEventListener("popstate",event=>restoreNavigationFromHistory(event.state));

async function bootstrap(){
  try{
    const migration=await documentRepository.migrateLegacy(normalizeDocument);
    await loadDocumentsFromDatabase();
    if(migration.migrated) console.info(`Migration: ${migration.migrated} Dokumente, ${migration.files||0} PDFs`);
  }catch(error){console.error("Datenbankstart fehlgeschlagen",error);alert("Die lokale Datenbank konnte nicht initialisiert werden: "+(error?.message||error));}
  renderPlantSelector();renderCategoryMenu();updateProfileButton();showGlobalPage(localStorage.getItem(STORAGE_GLOBAL_PAGE)||"today");
  notifyActiveSalesRemindersOnStartup();
  refreshGlobalNavigationBadges();
  tenderScanService.runAutoSyncIfDue().then(refreshGlobalNavigationBadges).catch(error=>console.warn("Tender auto-sync fehlgeschlagen",error));
}
bootstrap();
