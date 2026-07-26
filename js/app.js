import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const VERSION="0.8";
const DATA_SCHEMA_VERSION=2;
const STORAGE_DATA="abwasser-rechner-data";
const BACKUP_KEY_PREFIX="abwasser-rechner-backup-schema-";
const LEGACY_PLANT_KEYS=["abwasser-plants-v05","abwasser-plants-v06","abwasser-plants-v061","abwasser-plants-v07"];
const STORAGE_FAVORITES="abwasser-rechner-favorites";
const STORAGE_MENU="abwasser-rechner-menu";
const STORAGE_ACTIVE_PLANT="abwasser-rechner-active-plant";

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

const mainProcessOptions=[
["activated-sludge","Belebtschlammverfahren"],["sbr","Sequencing Batch Reactor (SBR)"],["mbr","Membranbelebungsverfahren (MBR)"],["trickling-filter","Tropfkörper"],["rotating-biological-contactor","Scheibentauchkörper"],["mbbr","Moving Bed Biofilm Reactor (MBBR)"],["fixed-bed","Festbettverfahren"],["biofilter","Biologischer Filter / Biofilter"],["lagoon","Abwasserteich / Lagune"],["constructed-wetland","Pflanzenkläranlage"],["anaerobic","Anaerobes Hauptverfahren"],["physico-chemical","Physikalisch-chemisches Hauptverfahren"],["other","Sonstiges"]];
const processStageOptions=[
["screening","Rechenanlage"],["grit-grease","Sand- und Fettfang"],["primary-clarification","Vorklärung"],["pre-denitrification","Vorgeschaltete Denitrifikation"],["simultaneous-denitrification","Simultane Denitrifikation"],["post-denitrification","Nachgeschaltete Denitrifikation"],["intermittent-aeration","Intermittierende Belüftung"],["nitrification","Nitrifikation"],["biological-p-removal","Biologische Phosphorelimination"],["pre-precipitation","Vorfällung"],["simultaneous-precipitation","Simultanfällung"],["post-precipitation","Nachfällung"],["secondary-clarification","Nachklärung"],["sand-filtration","Sandfiltration"],["cloth-filtration","Tuchfiltration"],["disc-filtration","Scheibenfiltration"],["microfiltration","Mikrofiltration"],["ultrafiltration","Ultrafiltration"],["activated-carbon","Aktivkohleadsorption"],["ozonation","Ozonung"],["uv","UV-Desinfektion"],["chlorination","Chlorung / chemische Desinfektion"],["sludge-digestion","Klärschlammfaulung"],["aerobic-stabilization","Aerobe Schlammstabilisierung"],["sludge-dewatering","Maschinelle Schlammentwässerung"],["thermal-drying","Thermische Trocknung"],["solar-drying","Solare Trocknung"],["other","Sonstige Verfahrensstufe"]];
function multiSelectField(name,label,selectedValues,options){const selected=new Set(selectedValues||[]);return `<fieldset class="field-label span-2 option-fieldset"><legend>${label}</legend><div class="chip-grid">${options.map(([value,text])=>`<label class="check-chip"><input type="checkbox" name="${name}" value="${value}" ${selected.has(value)?"checked":""}><span>${text}</span></label>`).join("")}</div></fieldset>`;}

const defaultLimits=[
  {key:"pOut",label:"Ablauf Pges",unit:"mg/l",direction:"max",target:0.8,warning:1.0,legal:2.0},
  {key:"nh4Out",label:"Ablauf NH₄-N",unit:"mg/l",direction:"max",target:2.0,warning:4.0,legal:10.0},
  {key:"svi",label:"SVI",unit:"ml/g",direction:"range",greenMin:80,greenMax:150,warningMin:60,warningMax:180},
  {key:"sludgeAge",label:"Schlammalter",unit:"d",direction:"min",target:10,warning:8,legal:null},
  {key:"cakeTs",label:"Kuchen-TS",unit:"%",direction:"min",target:25,warning:22,legal:null},
  {key:"retention",label:"Feststoffrückhalt",unit:"%",direction:"min",target:96,warning:94,legal:null},
  {key:"polymer",label:"Polymerverbrauch",unit:"kg WS/t TS",direction:"max",target:8,warning:11,legal:null}
];

function nowIso(){return new Date().toISOString()}
function createEmptyData(){return {schemaVersion:DATA_SCHEMA_VERSION,nextPlantNumber:1,plants:[],settings:{},backupMetadata:{lastAutomaticBackup:"",lastManualBackup:""}}}
function safeJsonParse(value,fallback=null){try{return JSON.parse(value)}catch{return fallback}}
function normalizePlantNumber(value){const m=String(value||"").match(/(\d+)/);return m?Number(m[1]):0}
function formatPlantNumber(n){return `ANL-${String(n).padStart(4,"0")}`}
function migratePlant(plant){const p=structuredClone(plant||{});p.id=p.id||crypto.randomUUID();p.master=p.master||{};p.address=p.address||{};p.operator=p.operator||{};p.contacts=Array.isArray(p.contacts)?p.contacts:[];p.visits=Array.isArray(p.visits)?p.visits:[];p.access=p.access||{};p.parameters=p.parameters||{};p.limits=Array.isArray(p.limits)?p.limits:structuredClone(defaultLimits);if(!p.master.mainProcess){const old=String(p.master.process||"").toLowerCase();p.master.mainProcess=old.includes("sbr")?"sbr":old.includes("membran")?"mbr":old.includes("tropf")?"trickling-filter":old.includes("scheiben")?"rotating-biological-contactor":old.includes("mbbr")?"mbbr":old.includes("festbett")?"fixed-bed":"activated-sludge"}p.master.processStages=Array.isArray(p.master.processStages)?p.master.processStages:[];p.master.processOther=p.master.processOther||p.master.process||"";p.master.actualPE=p.master.actualPE||"";p.master.plantNumber=p.master.plantNumber||"";if((!p.address.latitude||!p.address.longitude)&&p.address.gps){const parts=String(p.address.gps).split(/[;, ]+/).filter(Boolean);if(parts.length>=2){const lat=Number(parts[0].replace(",",".")),lon=Number(parts[1].replace(",","."));if(Number.isFinite(lat)&&Number.isFinite(lon)){p.address.latitude=String(lat);p.address.longitude=String(lon)}}}p.address.latitude=p.address.latitude||"";p.address.longitude=p.address.longitude||"";return p}
function createAutomaticBackup(raw,fromSchema){if(!raw)return;try{localStorage.setItem(`${BACKUP_KEY_PREFIX}${fromSchema}-${Date.now()}`,raw);localStorage.setItem("abwasser-rechner-last-auto-backup",nowIso())}catch(e){console.warn(e)}}
function migrateData(data){const source=structuredClone(data||createEmptyData());const from=Number(source.schemaVersion||0);const migrated={schemaVersion:DATA_SCHEMA_VERSION,nextPlantNumber:Number(source.nextPlantNumber||1),plants:(Array.isArray(source.plants)?source.plants:[]).map(migratePlant),settings:source.settings||{},backupMetadata:source.backupMetadata||{}};let max=0;for(const p of migrated.plants)max=Math.max(max,normalizePlantNumber(p.master.plantNumber));let counter=Math.max(migrated.nextPlantNumber,max+1,1);for(const p of migrated.plants)if(!p.master.plantNumber)p.master.plantNumber=formatPlantNumber(counter++);migrated.nextPlantNumber=Math.max(counter,max+1);return {data:migrated,changed:from!==DATA_SCHEMA_VERSION}}
function discoverLegacyPlants(){const merged=[],seen=new Set();for(const key of LEGACY_PLANT_KEYS){const list=safeJsonParse(localStorage.getItem(key),[]);if(!Array.isArray(list))continue;for(const p of list){const f=p.id||`${p.master?.name||""}|${p.address?.street||""}|${p.address?.city||""}`;if(!seen.has(f)){seen.add(f);merged.push(p)}}}return merged}
function loadDataStore(){const raw=localStorage.getItem(STORAGE_DATA);if(raw){const parsed=safeJsonParse(raw,createEmptyData()),result=migrateData(parsed);if(result.changed){createAutomaticBackup(raw,parsed.schemaVersion||0);result.data.backupMetadata.lastAutomaticBackup=localStorage.getItem("abwasser-rechner-last-auto-backup")||nowIso();localStorage.setItem(STORAGE_DATA,JSON.stringify(result.data))}return result.data}const initial=createEmptyData();initial.plants=discoverLegacyPlants();const result=migrateData(initial);localStorage.setItem(STORAGE_DATA,JSON.stringify(result.data));return result.data}
let dataStore=loadDataStore();
function persistData(){localStorage.setItem(STORAGE_DATA,JSON.stringify(dataStore))}
function nextPlantNumber(){const n=Math.max(Number(dataStore.nextPlantNumber||1),1);dataStore.nextPlantNumber=n+1;persistData();return formatPlantNumber(n)}

function loadPlants(){return dataStore.plants||[]}
function savePlants(){
  dataStore.plants=plants;persistData();
  if(activePlantId)localStorage.setItem(STORAGE_ACTIVE_PLANT,activePlantId);
  else localStorage.removeItem(STORAGE_ACTIVE_PLANT);
  renderPlantSelector();
}

const emptyPlant=()=>({
  id:crypto.randomUUID(),
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  master:{
    name:"",internalNumber:"",plantNumber:nextPlantNumber(),type:"municipal",industry:"",capacityPE:"",actualPE:"",
    mainProcess:"activated-sludge",processStages:[],processOther:"",process:"",notes:""
  },
  address:{street:"",postalCode:"",city:"",state:"Brandenburg",country:"Deutschland",latitude:"",longitude:"",gps:"",deliveryAddress:""},
  access:{parking:"",gate:"",accessCode:"",openingHours:"",registration:"",ppe:"",truckAccess:"",deliveryNotes:"",siteNotes:""},
  operator:{name:"",legalForm:"",customerNumber:"",street:"",postalCode:"",city:"",phone:"",email:"",website:""},
  contacts:[],
  visits:[],
  parameters:{
    flow:"",pIn:"",pOut:"",pTarget:"",nh4Out:"",basinVolume:"",mlss:"",svi:"",
    sludgeAge:"",sludgeFlow:"",sludgeTs:"",cakeTs:"",retention:"",polymer:"",
    disposalPrice:"",precipitantPrice:"",operatingDays:"365"
  },
  limits:structuredClone(defaultLimits)
});

let plants=loadPlants();
let activePlantId=localStorage.getItem(STORAGE_ACTIVE_PLANT)||plants[0]?.id||"";
if(activePlantId&&!plants.some(p=>p.id===activePlantId))activePlantId=plants[0]?.id||"";

const state={
  view:"dashboard",category:null,query:"",selected:null,favoritesOnly:false,
  favorites:new Set(JSON.parse(localStorage.getItem(STORAGE_FAVORITES)||"[]")),
  openCategories:new Set(JSON.parse(localStorage.getItem(STORAGE_MENU)||"[]"))
};

const categories=[...new Set(calculators.map(item=>item.category))];
const workspace=$("#workspace");
const cards=$("#calculatorCards");
const menu=$("#categoryMenu");
const count=$("#calculatorCount");
const appView=$("#applicationView");


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

function locationQuery(plant){const lat=Number(String(plant.address?.latitude||"").replace(",",".")),lon=Number(String(plant.address?.longitude||"").replace(",","."));if(Number.isFinite(lat)&&Number.isFinite(lon))return `${lat},${lon}`;const gps=(plant.address?.gps||"").trim();if(gps)return gps;return [plant.address?.street,plant.address?.postalCode,plant.address?.city,plant.address?.country].filter(Boolean).join(", ")}
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
    input.step="0.001";
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
  menu.innerHTML=categories.map(category=>{
    const meta=categoryMeta[category]||{icon:"•",description:""};
    const open=state.openCategories.has(category);
    const items=calculators.filter(item=>item.category===category);
    return `<section class="menu-group ${open?"open":""}">
      <button class="menu-group-toggle ${state.category===category&&!state.favoritesOnly?"active":""}" type="button" data-category-toggle="${category}" aria-expanded="${open}">
        <span class="menu-icon">${meta.icon}</span><span class="menu-label">${category}</span>
        <span class="menu-count">${items.length}</span><span class="menu-chevron">›</span>
      </button>
      <div class="menu-items">
        <button class="menu-all" type="button" data-category="${category}">Alle in ${category}</button>
        ${items.map(item=>`<button class="menu-item ${state.selected===item.id?"active":""}" type="button" data-calculator="${item.id}">${item.name}</button>`).join("")}
      </div>
    </section>`;
  }).join("");
  $$("[data-category-toggle]").forEach(button=>button.onclick=()=>{
    const category=button.dataset.categoryToggle;
    state.openCategories.has(category)?state.openCategories.delete(category):state.openCategories.add(category);
    persistMenu();renderCategoryMenu();
  });
  $$("[data-category]").forEach(button=>button.onclick=()=>{showCategory(button.dataset.category);closeMobileSidebar()});
  $$("[data-calculator]").forEach(button=>button.onclick=()=>{selectCalculator(button.dataset.calculator);closeMobileSidebar()});
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
  appView.classList.toggle("hidden",!["plants","plantForm","plantDashboard","limits","traffic"].includes(view));
  $("#dashboardNav").classList.toggle("active",view==="dashboard");
  $("#printButton").classList.toggle("hidden",view!=="calculators"||!state.selected);
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
function renderDashboard(){
  const plant=activePlant();
  const favoriteList=calculators.filter(item=>state.favorites.has(item.id)).slice(0,4);
  $("#dashboard").innerHTML=`
    <section class="hero-panel">
      <div><p class="eyebrow">Startseite</p><h1>Werkzeuge für die Abwasserpraxis</h1>
      <p class="subtitle">${plant?`Aktive Anlage: ${esc(plant.master.name||"Unbenannte Anlage")}`:"Lege zuerst eine Anlage an, um Stammdaten, Betreiber, Ansprechpartner und Betriebswerte zentral zu verwalten."}</p>
      <div class="hero-actions">
        <button type="button" class="button primary" data-dashboard-action="${plant?"plantDashboard":"plantForm"}">${plant?"Anlagenstartseite":"Neue Anlage anlegen"}</button>
        <button type="button" class="button secondary" data-dashboard-action="plants">Anlagenübersicht</button>
      </div></div>
      <div class="hero-stat"><strong>${plants.length}</strong><span>gespeicherte Anlagen</span><small>Version ${VERSION}</small></div>
    </section>

    ${plant?`<section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Aktive Anlage</p><h2>${esc(plant.master.name||"Unbenannte Anlage")}</h2></div><button class="text-button" data-dashboard-action="plantDashboard" type="button">Öffnen</button></div>
      ${renderTrafficSummary(plant)}
    </section>`:""}

    <section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Direktzugriff</p><h2>Kategorien</h2></div></div>
      <div class="dashboard-grid">${categories.map(category=>{
        const meta=categoryMeta[category]||{icon:"•",description:""};
        return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:`${categoryCount(category)} Rechner`});
      }).join("")}</div>
    </section>

    ${favoriteList.length?`<section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Persönlich</p><h2>Favoriten</h2></div><button class="text-button" data-dashboard-action="favorites" type="button">Alle anzeigen</button></div>
      <div class="favorite-dashboard-grid">${favoriteList.map(item=>`<button type="button" class="favorite-dashboard-item" data-dashboard-calculator="${item.id}"><span>${item.category}</span><strong>${item.name}</strong><small>${item.short}</small></button>`).join("")}</div>
    </section>`:""}
  `;
  bindDashboardActions();
}
function bindDashboardActions(){
  $$("[data-dashboard-action]").forEach(button=>button.onclick=()=>{
    const action=button.dataset.dashboardAction;
    if(action==="favorites")showFavorites();
    else if(["plants","plantForm","plantDashboard","limits","traffic"].includes(action))showApplication(action);
    else showCategory(action);
  });
  $$("[data-dashboard-calculator]").forEach(button=>button.onclick=()=>selectCalculator(button.dataset.dashboardCalculator));
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
function fmtInteger(value){const num=Number(String(value).replace(/\./g,"").replace(",","."));return Number.isFinite(num)?num.toLocaleString("de-DE",{maximumFractionDigits:0}):"–"}
function processLabel(value){return mainProcessOptions.find(([k])=>k===value)?.[1]||"–"}
function stageLabels(values){return (values||[]).map(v=>processStageOptions.find(([k])=>k===v)?.[1]||v)}
function normalizedTel(value=""){return String(value).replace(/[^\d+]/g,"")}
function emailLink(value,label=value){return value?`<a class="contact-link" href="mailto:${esc(value)}">${esc(label)}</a>`:"–"}
function telLink(value,label=value){const tel=normalizedTel(value);return tel?`<a class="contact-link" href="tel:${tel}">${esc(label)}</a>`:"–"}
function field(name,label,value="",type="text",placeholder=""){
  const numericAttributes=type==="number" ? ` step="0.001" inputmode="decimal"` : "";
  return `<label class="field-label">${label}<input name="${name}" type="${type}"${numericAttributes} value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
}
function selectField(name,label,value,options){
  return `<label class="field-label">${label}<select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${v===value?"selected":""}>${l}</option>`).join("")}</select></label>`;
}
function showPlantForm(id=null){
  setView("plantForm");setBreadcrumb(id?"Anlage bearbeiten":"Neue Anlage");
  const existing=id?plants.find(p=>p.id===id):null;
  const p=existing?structuredClone(existing):emptyPlant();
  appView.innerHTML=`<form id="plantForm" class="record-form">
    <section class="page-header"><div><p class="eyebrow">Anlagenakte</p><h1>${existing?"Anlage bearbeiten":"Neue Anlage"}</h1><p class="subtitle">Stammdaten, Adresse, Betreiber, Ansprechpartner und zentrale Betriebswerte.</p></div></section>

    <section class="form-section"><h2>Stammdaten und Verfahrenstechnik</h2><div class="form-grid">
      ${field("master.plantNumber","Anlagennummer",p.master.plantNumber||"")}
      ${field("master.name","Name der Kläranlage",p.master.name)}
      ${field("master.internalNumber","Interne Anlagen-/Kundennummer",p.master.internalNumber)}
      ${selectField("master.type","Anlagentyp",p.master.type,[["municipal","Kommunal"],["industrial","Industriell"],["mixed","Kommunal mit Industrieanteil"]])}
      ${field("master.industry","Branche bei Industrieanlage",p.master.industry)}
      ${field("master.capacityPE","Ausbaugröße EW",p.master.capacityPE,"number")}
      ${field("master.actualPE","Tatsächliche Belastung EW",p.master.actualPE,"number")}
      ${selectField("master.mainProcess","Hauptverfahren",p.master.mainProcess||"activated-sludge",mainProcessOptions)}
      ${multiSelectField("master.processStages","Weitere Verfahrensstufen",p.master.processStages||[],processStageOptions)}
      <label class="field-label span-2">Sonstige Verfahren / Besonderheiten<textarea name="master.processOther">${esc(p.master.processOther||"")}</textarea></label>
      <label class="field-label span-2">Allgemeine Besonderheiten<textarea name="master.notes">${esc(p.master.notes)}</textarea></label>
    </div></section>

    <section class="form-section"><h2>Anlagenadresse</h2><div class="form-grid">
      ${field("address.street","Straße und Hausnummer",p.address.street)}
      ${field("address.postalCode","Postleitzahl",p.address.postalCode)}
      ${field("address.city","Ort",p.address.city)}
      ${field("address.state","Bundesland",p.address.state)}
      ${field("address.country","Land",p.address.country)}
      ${field("address.latitude","Breitengrad",p.address.latitude||"","number","z. B. 52,894321")}
      ${field("address.longitude","Längengrad",p.address.longitude||"","number","z. B. 13,108765")}
      <label class="field-label span-2">Abweichende Zufahrts-/Lieferadresse<textarea name="address.deliveryAddress">${esc(p.address.deliveryAddress)}</textarea></label>
    </div></section>
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

  enableDecimalInputs(appView);
  const plantNumberInput=appView.querySelector('[name="master.plantNumber"]');if(plantNumberInput)plantNumberInput.readOnly=true;
  let contacts=structuredClone(p.contacts||[]);
  const editor=$("#contactsEditor");
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
    $$("[data-remove-contact]").forEach(b=>b.onclick=()=>{contacts.splice(Number(b.dataset.removeContact),1);renderContacts()});
  };
  renderContacts();
  $("#addContact").onclick=()=>{contacts.push({name:"",role:"",department:"",phone:"",mobile:"",email:"",preferred:"email",notes:""});renderContacts()};
  $("#cancelPlant").onclick=()=>existing?showPlantDashboard():showApplication("plants");
  $("#plantForm").onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const result=existing?structuredClone(existing):p;
    result.access=result.access||{};
    for(const [key,value] of fd.entries()){
      if(key.startsWith("contact."))continue;
      if(key==="master.processStages")continue;
      if(key.startsWith("operator.phoneParts."))continue;
      const [section,prop]=key.split(".");
      result[section][prop]=value;
    }
    result.master.processStages=fd.getAll("master.processStages");
    result.master.plantNumber=existing?.master?.plantNumber||result.master.plantNumber||nextPlantNumber();
    const lat=Number(String(result.address.latitude||"").replace(",",".")),lon=Number(String(result.address.longitude||"").replace(",","."));
    if(result.address.latitude!==""&&(!Number.isFinite(lat)||lat<-90||lat>90))return alert("Der Breitengrad muss zwischen -90 und +90 liegen.");
    if(result.address.longitude!==""&&(!Number.isFinite(lon)||lon<-180||lon>180))return alert("Der Längengrad muss zwischen -180 und +180 liegen.");
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
    activePlantId=result.id;savePlants();showPlantDashboard();
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
    const saved={id:visit.id};
    for(const key of ["title","status","start","end","purpose","contact","notes"])saved[key]=fd.get(key)||"";
    const start=isoLocalToDate(saved.start), end=isoLocalToDate(saved.end);
    if(!start||!end||end<=start)return alert("Das Terminende muss nach dem Beginn liegen.");
    plant.visits=plant.visits||[];
    plant.visits=existing?plant.visits.map(v=>v.id===saved.id?saved:v):[...plant.visits,saved];
    plant.visits.sort((a,b)=>String(a.start).localeCompare(String(b.start)));
    plant.updatedAt=new Date().toISOString();savePlants();showPlantDashboard();
  };
}
function renderVisits(plant){
  const visits=[...(plant.visits||[])].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  return `<section class="dashboard-section">
    <div class="section-heading"><div><p class="eyebrow">Außendienst</p><h2>Besuchstermine</h2></div>
      <button class="button primary" id="addVisit" type="button">Termin hinzufügen</button>
    </div>
    <div class="visits-list">${visits.length?visits.map(v=>`<article class="visit-card">
      <div class="visit-date"><strong>${formatDateTime(v.start)}</strong><span>bis ${formatDateTime(v.end)}</span></div>
      <div class="visit-main"><div class="visit-title-row"><h3>${esc(v.title||"Besuchstermin")}</h3><span class="status-chip ${visitStatusClass(v.status)}">${visitStatusLabel(v.status)}</span></div>
        <p><strong>Anlass:</strong> ${esc(v.purpose||"Nicht hinterlegt")}</p>${v.notes?`<p class="visit-notes"><strong>Notizen:</strong> ${esc(v.notes)}</p>`:""}<small>${v.contact?`Ansprechpartner: ${esc(v.contact)}`:"Kein Ansprechpartner hinterlegt"}</small>
      </div>
      <div class="visit-actions">
        <button type="button" data-edit-visit="${v.id}">Bearbeiten</button>
        <button type="button" data-ics-visit="${v.id}">Outlook / ICS</button>
        <a href="${visitOutlookUrl(plant,v)}" target="_blank" rel="noopener">Outlook Web</a>
        <button type="button" class="danger-link" data-delete-visit="${v.id}">Löschen</button>
      </div>
    </article>`).join(""):`<div class="empty-panel"><h3>Noch keine Besuchstermine</h3><p>Termine können lokal gespeichert und als Outlook-kompatible ICS-Datei exportiert werden.</p></div>`}</div>
  </section>`;
}

function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
function safeFilename(value="anlage"){return value.toLowerCase().replace(/[^a-z0-9äöüß]+/gi,"-").replace(/^-|-$/g,"")||"anlage"}
function exportSinglePlant(plant){downloadJson(`${plant.master.plantNumber||"ANL"}_${safeFilename(plant.master.name)}.json`,{format:"abwasser-rechner-plant",schemaVersion:DATA_SCHEMA_VERSION,exportedAt:nowIso(),plant:structuredClone(plant)})}
function exportCompleteBackup(){dataStore.backupMetadata.lastManualBackup=nowIso();persistData();downloadJson(`abwasser-rechner-komplettsicherung-${new Date().toISOString().slice(0,10)}.json`,{format:"abwasser-rechner-backup",appVersion:VERSION,exportedAt:nowIso(),data:dataStore})}
async function readJsonFile(file){return JSON.parse(await file.text())}
function chooseJsonFile(onFile){const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>input.files?.[0]&&onFile(input.files[0]);input.click()}
async function importSinglePlantFile(file){try{const payload=await readJsonFile(file),raw=payload?.format==="abwasser-rechner-plant"?payload.plant:payload?.plant||payload;if(!raw?.master)throw new Error("Keine gültigen Anlagendaten gefunden.");const incoming=migratePlant(raw),i=plants.findIndex(p=>p.id===incoming.id||(incoming.master.plantNumber&&p.master.plantNumber===incoming.master.plantNumber));if(i>=0){if(confirm("Diese Anlage existiert bereits. Vorhandene Anlage aktualisieren?")){incoming.id=plants[i].id;incoming.master.plantNumber=plants[i].master.plantNumber;plants[i]=incoming}else{incoming.id=crypto.randomUUID();incoming.master.plantNumber=nextPlantNumber();plants.push(incoming)}}else{if(!incoming.master.plantNumber||plants.some(p=>p.master.plantNumber===incoming.master.plantNumber))incoming.master.plantNumber=nextPlantNumber();plants.push(incoming)}savePlants();setActivePlant(incoming.id);renderPlantSelector();showPlantDashboard();alert("Anlagendaten wurden importiert.")}catch(e){alert(`Import fehlgeschlagen: ${e.message}`)}}
async function restoreCompleteBackupFile(file){try{const payload=await readJsonFile(file),incoming=payload?.format==="abwasser-rechner-backup"?payload.data:payload?.data||payload;if(!Array.isArray(incoming?.plants))throw new Error("Keine gültige Komplettsicherung gefunden.");if(!confirm("Die aktuelle lokale Datenbasis wird vollständig ersetzt. Fortfahren?"))return;createAutomaticBackup(JSON.stringify(dataStore),dataStore.schemaVersion||0);dataStore=migrateData(incoming).data;plants=dataStore.plants;persistData();renderPlantSelector();if(plants[0])setActivePlant(plants[0].id);showHome();alert("Komplettsicherung wurde wiederhergestellt.")}catch(e){alert(`Wiederherstellung fehlgeschlagen: ${e.message}`)}}

function showPlantDashboard(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"}`);
  const primary=plant.contacts?.[0];
  const mapUrls=googleMapsUrls(plant);
  appView.innerHTML=`<section class="plant-hero">
    <div><p class="eyebrow">Anlagenstartseite</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1>
    <p class="subtitle">${esc(plant.master.plantNumber||"")} · ${plant.master.type==="industrial"?"Industrielle Kläranlage":plant.master.type==="mixed"?"Kommunale Kläranlage mit Industrieanteil":"Kommunale Kläranlage"}${plant.master.capacityPE?` · ${fmtInteger(plant.master.capacityPE)} EW Ausbaugröße`:""}${plant.master.actualPE?` · ${fmtInteger(plant.master.actualPE)} EW Belastung`:""}</p></div>
    <div class="hero-actions"><button class="button secondary" id="editPlant">Bearbeiten</button><button class="button secondary" id="exportPlant">Anlage exportieren</button><button class="button secondary" id="importPlant">Anlage importieren</button><button class="button primary" id="openTraffic">Ampelübersicht</button></div>
  </section>
  ${renderTrafficSummary(plant)}
  <section class="map-section">
    <div class="map-frame-wrap">
      ${locationQuery(plant)?`<iframe class="map-frame" title="Standort der Anlage" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapUrls.embed}"></iframe>`:`<div class="map-placeholder"><strong>Kein Standort hinterlegt</strong><span>Adresse oder GPS-Koordinaten ergänzen.</span></div>`}
    </div>
    <article class="map-info-card">
      <p class="eyebrow">Standort und Anfahrt</p>
      <h2>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"Adresse fehlt")}</h2>
      <p>${plant.address.gps?`GPS: ${esc(plant.address.gps)}`:"Navigation erfolgt über die hinterlegte Anlagenadresse."}</p>
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
      <div><dt>Adresse</dt><dd>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"–")}</dd></div>
      <div><dt>Anlagennummer</dt><dd>${esc(plant.master.plantNumber||"–")}</dd></div><div><dt>Ausbaugröße</dt><dd>${plant.master.capacityPE?`${fmtInteger(plant.master.capacityPE)} EW`:"–"}</dd></div><div><dt>Tatsächliche Belastung</dt><dd>${plant.master.actualPE?`${fmtInteger(plant.master.actualPE)} EW`:"–"}</dd></div><div><dt>Auslastung</dt><dd>${plant.master.capacityPE&&plant.master.actualPE?`${fmt(Number(plant.master.actualPE)/Number(plant.master.capacityPE)*100,1)} %`:"–"}</dd></div><div><dt>Hauptverfahren</dt><dd>${esc(processLabel(plant.master.mainProcess))}</dd></div><div><dt>Weitere Stufen</dt><dd>${esc(stageLabels(plant.master.processStages).join(", ")||"–")}</dd></div><div><dt>Branche</dt><dd>${esc(plant.master.industry||"–")}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Betreiber</h2><dl>
      <div><dt>Name</dt><dd>${esc(plant.operator.name||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(plant.operator.phone)}</dd></div><div><dt>E-Mail</dt><dd>${emailLink(plant.operator.email)}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Hauptansprechpartner</h2><dl>
      <div><dt>Name</dt><dd>${esc(primary?.name||"–")}</dd></div><div><dt>Funktion</dt><dd>${esc(primary?.role||"–")}</dd></div><div><dt>Telefon</dt><dd>${telLink(primary?.mobile||primary?.phone||"")}</dd></div><div><dt>E-Mail</dt><dd>${emailLink(primary?.email||"")}</dd></div>
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
  ${renderVisits(plant)}
  <section class="dashboard-section backup-section"><div class="section-heading"><div><p class="eyebrow">Datensicherung</p><h2>Anlagen- und Gesamtdaten</h2></div></div><div class="backup-actions"><button class="button secondary" id="exportAllData">Komplettsicherung herunterladen</button><button class="button secondary" id="restoreAllData">Komplettsicherung wiederherstellen</button><span>Datenschema ${DATA_SCHEMA_VERSION}${dataStore.backupMetadata.lastAutomaticBackup?` · letzte automatische Sicherung: ${new Date(dataStore.backupMetadata.lastAutomaticBackup).toLocaleString("de-DE")}`:""}</span></div></section>
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Berechnungen</p><h2>Direkt mit dieser Anlage arbeiten</h2></div></div>
  <div class="dashboard-grid">${["Phosphor","Biologie","Schlammentwässerung","Wirtschaftlichkeit"].map(category=>{const meta=categoryMeta[category];return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:"Rechner öffnen"})}).join("")}</div></section>`;
  $("#editPlant").onclick=()=>showPlantForm(plant.id);$("#editParameters").onclick=()=>showPlantForm(plant.id);$("#openTraffic").onclick=showTraffic;
  $("#exportPlant").onclick=()=>exportSinglePlant(plant);$("#importPlant").onclick=()=>chooseJsonFile(importSinglePlantFile);$("#exportAllData").onclick=exportCompleteBackup;$("#restoreAllData").onclick=()=>chooseJsonFile(restoreCompleteBackupFile);$("#addVisit").onclick=()=>showVisitForm();
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
  ${renderTrafficSummary(plant)}
  <div class="traffic-grid">${evals.map(item=>`<article class="traffic-card ${item.evaluation.level}">
    <div class="traffic-card-head"><span class="traffic-light ${item.evaluation.level}"></span><span>${item.label}</span></div>
    <strong>${fmt(item.value)} <small>${item.unit}</small></strong>
    <p>${item.evaluation.label}</p><small>${item.evaluation.reason}</small>
  </article>`).join("")}</div>
  <div class="info-box"><strong>Hinweis:</strong> Die Ampel ist eine betriebliche Orientierung. Genehmigungswerte, Messunsicherheiten, Messstellen, Temperatur, Verfahren und weitere Randbedingungen sind separat zu berücksichtigen.</div>`;
  $("#configureLimits").onclick=showLimits;
}
function openMobileSidebar(){$("#sidebar").classList.add("mobile-open");$("#sidebarBackdrop").classList.add("visible");document.body.classList.add("menu-open")}
function closeMobileSidebar(){$("#sidebar").classList.remove("mobile-open");$("#sidebarBackdrop").classList.remove("visible");document.body.classList.remove("menu-open")}
function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

$("#homeButton").onclick=showHome;$("#dashboardNav").onclick=()=>{showHome();closeMobileSidebar()};
$("#breadcrumbHome").onclick=showHome;$("#sidebarOpen").onclick=openMobileSidebar;$("#sidebarClose").onclick=closeMobileSidebar;$("#sidebarBackdrop").onclick=closeMobileSidebar;$("#printButton").onclick=()=>window.print();
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
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

renderPlantSelector();renderCategoryMenu();showHome();
