import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const VERSION="0.8.9";
const STORAGE_FAVORITES="abwasser-favorites-v07";
const STORAGE_MENU="abwasser-menu-v07";
const STORAGE_PLANTS="abwasser-plants-v07";
const STORAGE_ACTIVE_PLANT="abwasser-active-plant-v07";
const STORAGE_RECENT="abwasser-recent-v082";
const STORAGE_PROFILE="abwasser-employee-profile-v087";
const STORAGE_BACKUP="abwasser-plants-backup-v087";

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

const emptyPlant=()=>({
  schemaVersion:5,
  id:makeId(),
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  master:{
    name:"",internalNumber:"",type:"municipal",industry:"",capacityPE:"",actualPE:"",
    mainProcess:"activated-sludge",processStages:[],processOther:"",process:"",notes:""
  },
  address:{street:"",postalCode:"",city:"",state:"Brandenburg",country:"Deutschland",gps:"",latitude:"",longitude:"",accuracy:"",capturedAt:"",geocodedAt:"",deliveryAddress:""},
  access:{parking:"",gate:"",accessCode:"",openingHours:"",registration:"",ppe:"",truckAccess:"",deliveryNotes:"",siteNotes:""},
  operator:{name:"",legalForm:"",customerNumber:"",street:"",postalCode:"",city:"",phone:"",email:"",website:""},
  contacts:[],
  visits:[],
  sludgeDewatering:{
    enabled:false,status:"active",process:"screw-press",manufacturer:"",model:"",year:"",unitCount:"1",operationMode:"batch",
    throughputM3h:"",inletTsPercent:"",outletTsPercent:"",polymerKgPerTds:"",operatingHours:"",sludgeQuantity:"",
    polymerStation:false,feedPump:false,conveyor:false,container:false,filtrateRouting:"",notes:""
  },
  dosingSystems:[],
  tankSystems:[],
  parameters:{
    flow:"",pIn:"",pOut:"",pTarget:"",nh4Out:"",basinVolume:"",mlss:"",svi:"",
    sludgeAge:"",sludgeFlow:"",sludgeTs:"",cakeTs:"",retention:"",polymer:"",
    disposalPrice:"",precipitantPrice:"",operatingDays:"365"
  },
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
    schemaVersion:6,
    id:source.id||base.id,
    master:{...base.master,...(source.master||{})},
    address:{...base.address,...(source.address||{})},
    access:{...base.access,...(source.access||{})},
    operator:{...base.operator,...(source.operator||{})},
    parameters:{...base.parameters,...(source.parameters||{})},
    sludgeDewatering:dewateringDefaults(source.sludgeDewatering||{}),
    dosingSystems:Array.isArray(source.dosingSystems)?source.dosingSystems.map(dosingDefaults):[],
    tankSystems:Array.isArray(source.tankSystems)?source.tankSystems.map(tankDefaults):[],
    contacts:Array.isArray(source.contacts)?source.contacts:[],
    visits:Array.isArray(source.visits)?source.visits.map(normalizeVisit):[],
    actions:Array.isArray(source.actions)?source.actions.map(a=>({id:a.id||makeId(),title:a.title||"Aufgabe",status:a.status||"open",priority:a.priority||"normal",dueDate:a.dueDate||"",component:a.component||"",sourceVisitId:a.sourceVisitId||"",createdAt:a.createdAt||new Date().toISOString(),completedAt:a.completedAt||""})):[],
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

let plants=loadPlants();
let activePlantId=localStorage.getItem(STORAGE_ACTIVE_PLANT)||plants[0]?.id||"";
if(activePlantId&&!plants.some(p=>p.id===activePlantId))activePlantId=plants[0]?.id||"";

const state={
  view:"dashboard",category:null,query:"",selected:null,favoritesOnly:false,
  favorites:new Set(JSON.parse(localStorage.getItem(STORAGE_FAVORITES)||"[]")),
  openCategories:new Set(JSON.parse(localStorage.getItem(STORAGE_MENU)||"[]")),
  recent:JSON.parse(localStorage.getItem(STORAGE_RECENT)||"[]")
};

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
    const calculatorActive=target==="calculators"&&(state.view==="calculators"||state.view==="dashboard");
    const plantActive=target==="plants"&&["plants","plantForm","plantDashboard","limits","traffic"].includes(state.view);
    button.classList.toggle("active",calculatorActive||plantActive);
  });
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
  appView.classList.toggle("hidden",!["plants","plantForm","plantDashboard","limits","traffic","profile","profileForm"].includes(view));
  $("#dashboardNav").classList.toggle("active",view==="dashboard");
  $("#printButton").classList.toggle("hidden",view!=="calculators"||!state.selected);
  updatePrimaryNavigation();
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
  const recentList=state.recent.map(id=>calculators.find(item=>item.id===id)).filter(Boolean).slice(0,4);
  const favoriteList=calculators.filter(item=>state.favorites.has(item.id)).slice(0,4);
  const visits=upcomingVisits(4);
  const tally=dashboardTrafficTally();
  const totalStatus=Math.max(plants.length,1);
  const greenDeg=tally.green/totalStatus*360;
  const yellowDeg=(tally.green+tally.yellow)/totalStatus*360;
  const redDeg=(tally.green+tally.yellow+tally.red)/totalStatus*360;
  const capacity=plant?.master?.capacityPE?`${fmtInteger(plant.master.capacityPE)} EW`:"Ausbaugröße nicht hinterlegt";
  const plantType=plant?.master?.type==="industrial"?"Industrielle Kläranlage":plant?.master?.type==="mixed"?"Kommunale Anlage mit Industrieanteil":"Kommunale Kläranlage";
  $("#dashboard").innerHTML=`
    <section class="cockpit-heading">
      <div><h1>${greeting()}.</h1><p>Hier ist dein Überblick für den heutigen Arbeitstag.</p></div>
      <div class="cockpit-date"><span>${new Date().toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"long",year:"numeric"})}</span><strong>${new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</strong></div>
    </section>

    <section class="plant-visual-card">
      ${renderPlantAnimation()}
      <div class="active-plant-overlay">
        <div><p class="eyebrow">Aktive Anlage</p><h2>${esc(plant?.master?.name||"Noch keine Anlage ausgewählt")}</h2>
          <span>${esc(plant?.master?.internalNumber||"")}</span><p>${plant?plantType:"Lege eine Anlagenakte an, um das Cockpit zu aktivieren."}</p><strong>${plant?capacity:""}</strong></div>
        <div class="active-plant-buttons">
          <button class="button primary" data-dashboard-action="${plant?"plantDashboard":"plantForm"}" type="button">${plant?"Anlage öffnen":"Anlage anlegen"}</button>
          <button class="text-button" data-dashboard-action="plants" type="button">Anlage wechseln ↔</button>
        </div>
      </div>
    </section>

    <section class="quick-access-grid" aria-label="Schnellzugriff">
      <button data-dashboard-action="allCalculators" type="button"><span>∑</span><strong>Rechner</strong><small>Berechnungen durchführen</small></button>
      <button data-dashboard-action="${plant?"plantDashboard":"plantForm"}" type="button"><span>KA</span><strong>Anlagenakte</strong><small>Stammdaten bearbeiten</small></button>
      <button data-dashboard-action="${plant?"plantDashboard":"plants"}" type="button"><span>▣</span><strong>Termine</strong><small>Besuche und Notizen</small></button>
      <button data-dashboard-action="favorites" type="button"><span>★</span><strong>Favoriten</strong><small>Wichtige Rechner</small></button>
      <button data-dashboard-action="search" type="button"><span>⌕</span><strong>Suche</strong><small>Werkzeuge schnell finden</small></button>
    </section>

    <section class="cockpit-columns">
      <article class="cockpit-panel">
        <div class="panel-title"><div><p class="eyebrow">Schnellzugriff</p><h2>${recentList.length?"Zuletzt verwendete Rechner":"Favorisierte Rechner"}</h2></div><button data-dashboard-action="allCalculators" type="button">Alle Rechner →</button></div>
        <div class="compact-list">${(recentList.length?recentList:favoriteList).length?(recentList.length?recentList:favoriteList).map(item=>`<button data-dashboard-calculator="${item.id}" type="button"><span class="list-icon">${categoryMeta[item.category]?.icon||"∑"}</span><span><strong>${item.name}</strong><small>${item.category}</small></span><b>›</b></button>`).join(""):`<div class="dashboard-empty">Noch keine Rechner verwendet. Öffne einen Rechner über den Direktzugriff.</div>`}</div>
      </article>

      <article class="cockpit-panel">
        <div class="panel-title"><div><p class="eyebrow">Kalender</p><h2>Nächste Termine</h2></div><button data-dashboard-action="${plant?"plantDashboard":"plants"}" type="button">Alle Termine →</button></div>
        <div class="appointment-list">${visits.length?visits.map(({plant,visit,date})=>`<div><time>${date.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}<strong>${date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</strong></time><span><strong>${esc(plant.master.name||"Kläranlage")}</strong><small>${esc(visit.title||visit.purpose||"Besuchstermin")}</small></span></div>`).join(""):`<div class="dashboard-empty">Keine zukünftigen Termine hinterlegt.</div>`}</div>
      </article>
    </section>

    <section class="cockpit-columns lower">
      <article class="cockpit-panel status-panel">
        <div class="panel-title"><div><p class="eyebrow">Überwachung</p><h2>Anlagenstatus</h2></div><button data-dashboard-action="plants" type="button">Alle Anlagen →</button></div>
        <div class="status-overview"><div class="status-donut" style="--green:${greenDeg}deg;--yellow:${yellowDeg}deg;--red:${redDeg}deg"><span><strong>${plants.length}</strong><small>Anlagen</small></span></div>
          <div class="status-legend"><span><i class="green"></i><strong>${tally.green}</strong> im Ziel</span><span><i class="yellow"></i><strong>${tally.yellow}</strong> beobachten</span><span><i class="red"></i><strong>${tally.red}</strong> prüfen</span><span><i class="gray"></i><strong>${tally.gray}</strong> ohne Daten</span></div></div>
      </article>
      <article class="cockpit-panel metrics-panel">
        <div class="panel-title"><div><p class="eyebrow">Übersicht</p><h2>Kennzahlen</h2></div></div>
        <div class="cockpit-metrics"><div><strong>${plants.length}</strong><span>Anlagen gespeichert</span></div><div><strong>${calculators.length}</strong><span>Rechner verfügbar</span></div><div><strong>${plants.reduce((n,p)=>n+(p.visits||[]).length,0)}</strong><span>Besuche dokumentiert</span></div><div><strong>${state.favorites.size}</strong><span>Favoriten gespeichert</span></div></div>
      </article>
    </section>

    <section class="dashboard-section calculator-categories-home">
      <div class="section-heading"><div><p class="eyebrow">Direktzugriff</p><h2>Rechnerkategorien</h2></div><button class="text-button" data-dashboard-action="allCalculators" type="button">Alle Rechner</button></div>
      <div class="category-home-grid">${categories.map(category=>{const meta=categoryMeta[category]||{icon:"∑",description:""};return `<button type="button" data-dashboard-action="${category}"><span>${meta.icon}</span><strong>${category}</strong><small>${categoryCount(category)} Rechner</small></button>`}).join("")}</div>
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
    if(action==="favorites")showFavorites();
    else if(action==="allCalculators")showAllCalculators();
    else if(action==="search"){showAllCalculators();$("#searchInput").focus();}
    else if(["plants","plantForm","plantDashboard","limits","traffic"].includes(action))showApplication(action);
    else showCategory(action);
  });
  $$('[data-dashboard-calculator]').forEach(button=>button.onclick=()=>selectCalculator(button.dataset.dashboardCalculator));
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
function renderTechnicalAssets(plant){
  const d=dewateringDefaults(plant.sludgeDewatering||{});
  const systems=Array.isArray(plant.dosingSystems)?plant.dosingSystems:[];
  const tanks=Array.isArray(plant.tankSystems)?plant.tankSystems:[];
  return `<section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Technische Anlagenbereiche</p><h2>Technik separat verwalten</h2><p class="form-note">Schlammentwässerung, Dosierstationen und Tankanlagen besitzen jeweils eine eigene Bearbeitungsmaske.</p></div></div>
  <div class="technical-assets-grid three-columns">
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">▦</span><div><h3>Schlammentwässerung</h3><span class="status-chip ${d.enabled?'green':'gray'}">${d.enabled?statusText(d.status):'Nicht vorhanden'}</span></div></div>${d.enabled?`<dl><div><dt>Verfahren</dt><dd>${esc(dewateringProcessText(d.process))}</dd></div><div><dt>Fabrikat</dt><dd>${esc([d.manufacturer,d.model].filter(Boolean).join(' ')||'–')}</dd></div><div><dt>Baujahr</dt><dd>${esc(d.year||'–')}</dd></div></dl>`:'<p>Noch nicht erfasst.</p>'}<button type="button" class="button secondary asset-edit-button" id="editDewatering">Schlammentwässerung bearbeiten</button></article>
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">DS</span><div><h3>Dosiertechnik</h3><span class="status-chip ${systems.length?'blue':'gray'}">${systems.length} ${systems.length===1?'Station':'Stationen'}</span></div></div>${systems.length?`<div class="dosing-summary-list">${systems.map(x=>`<div><strong>${esc(x.name||dosingPurposeText(x.purpose))}</strong><span>${esc(dosingPurposeText(x.purpose))} · ${esc(statusText(x.status))}</span><small>${esc(x.productName||'Medium nicht hinterlegt')}</small></div>`).join('')}</div>`:'<p>Noch keine Dosierstation erfasst.</p>'}<button type="button" class="button secondary asset-edit-button" id="editDosing">Dosiertechnik bearbeiten</button></article>
    <article class="technical-summary-card"><div class="technical-card-head"><span class="asset-icon">TA</span><div><h3>Tankanlagen</h3><span class="status-chip ${tanks.length?'blue':'gray'}">${tanks.length} ${tanks.length===1?'Tank':'Tanks'}</span></div></div>${tanks.length?`<div class="dosing-summary-list">${tanks.map(x=>`<div><strong>${esc(x.name||'Tankanlage')}</strong><span>${esc(x.medium||'Medium nicht hinterlegt')} · ${esc(statusText(x.status))}</span><small>${x.volume?`${esc(x.volume)} l`: 'Volumen nicht hinterlegt'}${x.year?` · Baujahr ${esc(x.year)}`:''}</small></div>`).join('')}</div>`:'<p>Noch keine Tankanlage erfasst.</p>'}<button type="button" class="button secondary asset-edit-button" id="editTanks">Tankanlagen bearbeiten</button></article>
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
      ${field("operator.street","Straße und Hausnummer",p.operator.street)}
      ${field("operator.postalCode","Postleitzahl",p.operator.postalCode)}
      ${field("operator.city","Ort",p.operator.city)}
      ${phoneField("operator.phoneParts","Telefon",p.operator.phone||"")}
      ${field("operator.email","Zentrale E-Mail",p.operator.email,"email")}
      ${field("operator.website","Internetseite",p.operator.website,"url")}
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
  const formatCapturedAt=iso=>iso?new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short"}).format(new Date(iso)):"";
  const renderLocationPreview=()=>{
    const lat=Number(getInput("address.latitude").replace(",","."));
    const lon=Number(getInput("address.longitude").replace(",","."));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){locationPreview.hidden=true;locationPreview.innerHTML="";return;}
    const query=encodeURIComponent(`${lat},${lon}`);
    locationPreview.hidden=false;
    locationPreview.innerHTML=`<div class="location-preview-head"><div><strong>Standort prüfen</strong><span>${lat.toFixed(6)}, ${lon.toFixed(6)}</span></div><a class="button secondary" href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener">In Karte öffnen</a></div><iframe class="location-preview-map" title="Erfasster Anlagenstandort" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${query}&output=embed"></iframe><p class="location-attribution">Die automatisch ermittelte Adresse ist ein Vorschlag und sollte vor dem Speichern geprüft werden.</p>`;
  };
  const setLocationStatus=(message,kind="info")=>{
    locationStatus.className=`location-status ${kind}`;
    locationStatus.textContent=message;
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
        const data=await reverseGeocode(latitude,longitude);
        applyReverseAddress(data);
        p.address.geocodedAt=new Date().toISOString();
        setLocationStatus("Standort und Adresse wurden übernommen. Bitte die Angaben vor dem Speichern prüfen.","success");
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
  ["address.latitude","address.longitude"].forEach(name=>formInput(name)?.addEventListener("input",renderLocationPreview));
  renderLocationPreview();
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
      ${field("purpose","Anlass / Zweck",visit.purpose)}
      <label class="field-label">Ansprechpartner<select name="contact">
        <option value="">Kein Ansprechpartner</option>
        ${(plant.contacts||[]).map(c=>`<option value="${esc(c.name)}" ${visit.contact===c.name?"selected":""}>${esc(c.name)}${c.role?` – ${esc(c.role)}`:""}</option>`).join("")}
      </select></label>
      <label class="field-label span-2">Notizen<textarea name="notes">${esc(visit.notes||"")}</textarea></label>
    </div></section>
    <div class="sticky-form-actions"><button type="button" class="button secondary" id="cancelVisit">Abbrechen</button><button type="submit" class="button primary">Termin speichern</button></div>
  </form>`;
  $("#cancelVisit").onclick=showPlantDashboard;
  $("#visitForm").onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const saved=normalizeVisit(existing?{...existing,id:visit.id}:{id:visit.id});
    for(const key of ["title","status","start","end","purpose","contact","notes"])saved[key]=fd.get(key)||"";
    const start=isoLocalToDate(saved.start), end=isoLocalToDate(saved.end);
    if(!start||!end||end<=start)return alert("Das Terminende muss nach dem Beginn liegen.");
    plant.visits=plant.visits||[];
    plant.visits=existing?plant.visits.map(v=>v.id===saved.id?saved:v):[...plant.visits,saved];
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
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Heute aufgefallen</p><h2>Auffälligkeiten und Aufgaben</h2></div></div><form id="findingForm" class="finding-entry"><select name="severity"><option value="info">Hinweis</option><option value="warning">Beobachten</option><option value="critical">Handlungsbedarf</option><option value="task">Aufgabe</option></select><input name="text" required placeholder="Beobachtung oder Aufgabe eintragen"><button class="button primary" type="submit">Hinzufügen</button></form><div class="finding-list">${visit.findings.length?visit.findings.map(f=>`<article class="finding-item ${esc(f.severity)}"><div><span>${f.severity==="critical"?"Handlungsbedarf":f.severity==="warning"?"Beobachten":f.severity==="task"?"Aufgabe":"Hinweis"}</span><p>${esc(f.text)}</p><small>${formatDateTime(f.createdAt)}</small></div><button type="button" data-remove-finding="${f.id}" aria-label="Eintrag löschen">×</button></article>`).join(""):`<p class="muted-small">Noch keine Auffälligkeiten dokumentiert.</p>`}</div></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Fotos</p><h2>Fotodokumentation</h2></div><label class="button secondary file-label-inline">Fotos hinzufügen<input id="visitPhotoInput" type="file" accept="image/*" capture="environment" multiple></label></div><p class="muted-small">Fotos werden ausschließlich lokal in dieser App gespeichert. Maximal 6 Fotos pro Besuch.</p><div class="visit-photo-grid">${visit.photos.length?visit.photos.map(ph=>`<figure><img src="${ph.dataUrl}" alt="Besuchsfoto"><figcaption>${esc(ph.name||"Foto")}<button type="button" data-remove-photo="${ph.id}">Löschen</button></figcaption></figure>`).join(""):`<div class="empty-panel compact"><p>Noch keine Fotos hinterlegt.</p></div>`}</div></section>
      <section class="visit-panel span-full"><div class="section-heading"><div><p class="eyebrow">Zusammenfassung</p><h2>Besuchsnotiz</h2></div></div><textarea id="visitSummary" rows="6" placeholder="Gespräch, Empfehlungen, nächste Schritte …">${esc(visit.summary||visit.notes||"")}</textarea><button class="button secondary" id="saveVisitSummary" type="button">Notiz speichern</button></section>
    </div>`;
    enableDecimalInputs(appView);
    $("#leaveVisit").onclick=showPlantDashboard;
    $("#finishVisit").onclick=()=>{visit.modeStatus=visit.modeStatus==="completed"?"active":"completed";visit.status=visit.modeStatus==="completed"?"done":"planned";visit.completedAt=visit.modeStatus==="completed"?new Date().toISOString():"";if(persist())render();};
    $$('[data-check]').forEach(el=>el.onchange=()=>{visit.checklist[el.dataset.check]=el.checked;persist();render();});
    $("#saveMeasurements").onclick=()=>{for(const key of ["flow","pOut","nh4Out","cakeTs","polymer","custom"]){const el=appView.querySelector(`[name="vm.${key}"]`);visit.measurements[key]=el?.value||"";}visit.checklist.measurements=true;if(persist())render();};
    $("#findingForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),text=String(fd.get("text")||"").trim();if(!text)return;const severity=fd.get("severity")||"info";visit.findings.unshift({id:makeId(),severity,text,createdAt:new Date().toISOString(),resolved:false});if(severity==="task"){visit.checklist.tasks=true;plant.actions=[...(plant.actions||[]),{id:makeId(),title:text,status:"open",priority:"normal",dueDate:"",component:"Besuch",sourceVisitId:visit.id,createdAt:new Date().toISOString(),completedAt:""}];}if(persist())render();};
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
  entries.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return `<section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Entwicklung der Anlage</p><h2>Zeitleiste</h2></div></div><div class="plant-timeline">${entries.length?entries.slice(0,12).map(e=>`<article><div class="timeline-dot ${e.type}"></div><div><time>${formatDateTime(e.date)}</time><strong>${esc(e.title)}</strong><p>${esc(e.text)}</p></div></article>`).join(''):`<div class="empty-panel compact"><p>Noch keine Ereignisse vorhanden.</p></div>`}</div></section>`;
}

function showPlantDashboard(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"}`);
  const primary=plant.contacts?.[0];
  const mapUrls=googleMapsUrls(plant);
  appView.innerHTML=`<section class="plant-hero">
    <div><p class="eyebrow">Anlagenstartseite</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1>
    <p class="subtitle">${esc(plant.master.internalNumber||"")} · ${plant.master.type==="industrial"?"Industrielle Kläranlage":plant.master.type==="mixed"?"Kommunale Kläranlage mit Industrieanteil":"Kommunale Kläranlage"}${plant.master.capacityPE?` · ${fmtInteger(plant.master.capacityPE)} EW Ausbaugröße`:""}${plant.master.actualPE?` · ${fmtInteger(plant.master.actualPE)} EW Belastung`:""}</p></div>
    <div class="hero-actions"><button class="button visit-start" id="startVisit" type="button">▶ Besuch starten</button><button class="button secondary" id="editPlant">Bearbeiten</button><button class="button primary" id="openTraffic">Ampelübersicht</button></div>
  </section>
  ${renderTodayCockpit(plant)}
  ${procedureCard(plant)}
  ${renderTechnicalAssets(plant)}
  ${renderTrafficSummary(plant)}
  <section class="map-section">
    <div class="map-frame-wrap">
      ${locationQuery(plant)?`<iframe class="map-frame" title="Standort der Anlage" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapUrls.embed}"></iframe>`:`<div class="map-placeholder"><strong>Kein Standort hinterlegt</strong><span>Adresse oder GPS-Koordinaten ergänzen.</span></div>`}
    </div>
    <article class="map-info-card">
      <p class="eyebrow">Standort und Anfahrt</p>
      <h2>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"Adresse fehlt")}</h2>
      <p>${plant.address.latitude&&plant.address.longitude?`Breitengrad: ${esc(plant.address.latitude)} · Längengrad: ${esc(plant.address.longitude)}`:plant.address.gps?`GPS: ${esc(plant.address.gps)}`:"Navigation erfolgt über die hinterlegte Anlagenadresse."}</p>
      ${locationQuery(plant)?mapsButtons(plant):""}
      <div class="access-quick">
        <div><span>Parken</span><strong>${esc(plant.access?.parking||"–")}</strong></div>
        <div><span>Zufahrt</span><strong>${esc(plant.access?.gate||"–")}</strong></div>
        <div><span>Anmeldung</span><strong>${esc(plant.access?.registration||"–")}</strong></div>
        <div><span>PSA</span><strong>${esc(plant.access?.ppe||"–")}</strong></div>
      </div>
    </article>
  </section>
  <div class="record-grid">
    <article class="record-card"><h2>Anlage</h2><dl>
      <div><dt>Anlagennummer</dt><dd>${esc(plant.master.internalNumber||"–")}</dd></div>
      <div><dt>Adresse</dt><dd>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"–")}</dd></div>
      <div><dt>Ausbaugröße</dt><dd>${plant.master.capacityPE?`${fmtInteger(plant.master.capacityPE)} EW`:"–"}</dd></div>
      <div><dt>Tatsächliche Belastung</dt><dd>${plant.master.actualPE?`${fmtInteger(plant.master.actualPE)} EW`:"–"}</dd></div>
      <div><dt>Auslastung</dt><dd>${plant.master.capacityPE&&plant.master.actualPE?`${fmt(Number(plant.master.actualPE)/Number(plant.master.capacityPE)*100,1)} %`:"–"}</dd></div>
      <div><dt>Hauptverfahren</dt><dd>${esc(processLabel(plant.master.mainProcess||plant.master.process))}</dd></div>
      <div><dt>Weitere Stufen</dt><dd>${esc(processStageLabels(plant.master.processStages).join(", ")||"–")}</dd></div>
      <div><dt>Branche</dt><dd>${esc(plant.master.industry||"–")}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Betreiber</h2><dl>
      <div><dt>Name</dt><dd>${esc(plant.operator.name||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(plant.operator.phone)}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(plant.operator.email)}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Hauptansprechpartner</h2><dl>
      <div><dt>Name</dt><dd>${esc(primary?.name||"–")}</dd></div><div><dt>Funktion</dt><dd>${esc(primary?.role||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(primary?.mobile||primary?.phone||"")}</dd></div><div><dt>E-Mail</dt><dd>${mailLink(primary?.email||"")}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Zufahrt und Besuch</h2><dl>
      <div><dt>Parken</dt><dd>${esc(plant.access?.parking||"–")}</dd></div>
      <div><dt>Tor / Zugang</dt><dd>${esc(plant.access?.gate||"–")}</dd></div>
      <div><dt>Zugangscode</dt><dd>${esc(plant.access?.accessCode||"–")}</dd></div>
      <div><dt>Besuchszeiten</dt><dd>${esc(plant.access?.openingHours||"–")}</dd></div>
      <div><dt>LKW-Zufahrt</dt><dd>${esc(plant.access?.truckAccess||"–")}</dd></div>
      <div><dt>Hinweise</dt><dd>${esc(plant.access?.siteNotes||"–")}</dd></div>
    </dl></article>
  </div>
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Zentrale Datenbasis</p><h2>Betriebswerte</h2></div><button class="text-button" id="editParameters">Werte bearbeiten</button></div>
  <div class="kpi-grid">
    ${[["Volumenstrom",plant.parameters.flow,"m³/d"],["Pges Ablauf",plant.parameters.pOut,"mg/l"],["NH₄-N Ablauf",plant.parameters.nh4Out,"mg/l"],["SVI",plant.parameters.svi,"ml/g"],["Schlammalter",plant.parameters.sludgeAge,"d"],["Kuchen-TS",plant.parameters.cakeTs,"%"],["Feststoffrückhalt",plant.parameters.retention,"%"],["Polymer",plant.parameters.polymer,"kg WS/t TS"]].map(([l,v,u])=>`<article class="kpi-card"><span>${l}</span><strong>${fmt(v)}</strong><small>${u}</small></article>`).join("")}
  </div></section>
  ${renderActionCenter(plant)}
  ${renderVisits(plant)}
  ${renderPlantTimeline(plant)}
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Kontextbezogene Werkzeuge</p><h2>Direkt mit dieser Anlage arbeiten</h2></div></div>
  <div class="dashboard-grid">${["Phosphor","Biologie","Schlammentwässerung","Wirtschaftlichkeit"].map(category=>{const meta=categoryMeta[category];return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:"Rechner öffnen"})}).join("")}</div></section>`;
  bindProcedureCard(appView);
  $("#editPlant").onclick=()=>showPlantForm(plant.id);$("#editDewatering")?.addEventListener("click",showDewateringForm);$("#editDosing")?.addEventListener("click",showDosingForm);$("#editTanks")?.addEventListener("click",showTankForm);$("#editParameters").onclick=()=>showPlantForm(plant.id);$("#openTraffic").onclick=showTraffic;
  $("#addVisit").onclick=()=>showVisitForm();
  $("#startVisitCockpit")?.addEventListener("click",()=>showVisitMode());
  $("#quickActionForm")?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget),title=String(fd.get("title")||"").trim();if(!title)return;plant.actions=[...(plant.actions||[]),{id:makeId(),title,status:"open",priority:fd.get("priority")||"normal",dueDate:fd.get("dueDate")||"",component:"",sourceVisitId:"",createdAt:new Date().toISOString(),completedAt:""}];if(savePlants())showPlantDashboard();});
  $$(`[data-toggle-action]`).forEach(b=>b.onclick=()=>{const a=(plant.actions||[]).find(x=>x.id===b.dataset.toggleAction);if(!a)return;a.status=a.status==="done"?"open":"done";a.completedAt=a.status==="done"?new Date().toISOString():"";if(savePlants())showPlantDashboard();});
  $$(`[data-delete-action]`).forEach(b=>b.onclick=()=>{if(!confirm("Aufgabe wirklich löschen?"))return;plant.actions=(plant.actions||[]).filter(a=>a.id!==b.dataset.deleteAction);if(savePlants())showPlantDashboard();});
  $("#startVisit")?.addEventListener("click",()=>showVisitMode());
  $("#startVisitMain")?.addEventListener("click",()=>showVisitMode());
  $$('[data-open-visit]').forEach(b=>b.onclick=()=>showVisitMode(b.dataset.openVisit));
  $$("[data-edit-visit]").forEach(b=>b.onclick=()=>showVisitForm(b.dataset.editVisit));
  $$("[data-ics-visit]").forEach(b=>b.onclick=()=>{const v=(plant.visits||[]).find(x=>x.id===b.dataset.icsVisit);if(v)exportVisitIcs(plant,v)});
  $$("[data-delete-visit]").forEach(b=>b.onclick=()=>{
    const v=(plant.visits||[]).find(x=>x.id===b.dataset.deleteVisit);
    if(confirm(`Termin „${v?.title||"Besuch"}“ wirklich löschen?`)){
      plant.visits=(plant.visits||[]).filter(x=>x.id!==b.dataset.deleteVisit);savePlants();showPlantDashboard();
    }
  });
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
  $("#editEmployeeProfile").onclick=showProfileForm;$("#downloadVCard").onclick=downloadVCard;$("#exportFullBackup").onclick=()=>downloadJson(`abwasser-rechner-sicherung-${new Date().toISOString().slice(0,10)}.json`,{schema:"abwasser-rechner-backup-v1",version:VERSION,exportedAt:new Date().toISOString(),employeeProfile,plants,activePlantId});
  $("#importFullBackup").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.plants)||!data.employeeProfile)throw new Error("Keine gültige Gesamtsicherung");if(!confirm("Vorhandene Profil- und Anlagendaten durch diese Sicherung ersetzen?"))return;plants=data.plants.map(normalizePlant);employeeProfile=normalizeEmployeeProfile(data.employeeProfile);activePlantId=data.activePlantId&&plants.some(x=>x.id===data.activePlantId)?data.activePlantId:plants[0]?.id||"";if(savePlants()&&saveEmployeeProfile())showProfile();}catch(err){alert(`Import nicht möglich: ${err.message}`)}finally{e.target.value="";}};
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
const showAllButton=$("#showAllCalculators");if(showAllButton)showAllButton.onclick=()=>{showAllCalculators();closeMobileSidebar()};
$("#homeButton").onclick=showHome;$("#dashboardNav").onclick=()=>{showHome();closeMobileSidebar()};
$("#breadcrumbHome").onclick=showHome;$("#profileButton").onclick=showProfile;$("#sidebarOpen").onclick=openMobileSidebar;$("#sidebarClose").onclick=closeMobileSidebar;$("#sidebarBackdrop").onclick=closeMobileSidebar;$("#printButton").onclick=()=>window.print();
$("#activePlantSelect").onchange=e=>{activePlantId=e.target.value;savePlants();showPlantDashboard()};
$("#managePlantsButton").onclick=()=>{showApplication("plants");closeMobileSidebar()};
$("#newPlantButton").onclick=()=>{showPlantForm();closeMobileSidebar()};
$$("[data-view]").forEach(b=>b.onclick=()=>{showApplication(b.dataset.view);closeMobileSidebar()});
$$("[data-static-toggle]").forEach(b=>b.onclick=()=>{
  const group=b.closest(".menu-group");group.classList.toggle("open");b.setAttribute("aria-expanded",group.classList.contains("open"));
});
$("#searchInput").oninput=e=>{state.query=e.target.value;if(state.query)showSearchResults();else if(state.view==="calculators")showSearchResults()};
$("#clearSearch").onclick=()=>{$("#searchInput").value="";state.query="";showHome()};
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

renderPlantSelector();renderCategoryMenu();updateProfileButton();showHome();
