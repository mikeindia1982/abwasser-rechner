import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const VERSION="0.8.2";
const STORAGE_FAVORITES="abwasser-favorites-v07";
const STORAGE_MENU="abwasser-menu-v07";
const STORAGE_PLANTS="abwasser-plants-v07";
const STORAGE_ACTIVE_PLANT="abwasser-active-plant-v07";
const STORAGE_RECENT="abwasser-recent-v082";

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

const emptyPlant=()=>({
  id:crypto.randomUUID(),
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  master:{
    name:"",internalNumber:"",type:"municipal",industry:"",capacityPE:"",actualPE:"",
    mainProcess:"activated-sludge",processStages:[],processOther:"",process:"",notes:""
  },
  address:{street:"",postalCode:"",city:"",state:"Brandenburg",country:"Deutschland",gps:"",latitude:"",longitude:"",deliveryAddress:""},
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
    return Array.isArray(parsed)?parsed:[];
  }catch{return []}
}
function savePlants(){
  localStorage.setItem(STORAGE_PLANTS,JSON.stringify(plants));
  if(activePlantId)localStorage.setItem(STORAGE_ACTIVE_PLANT,activePlantId);
  else localStorage.removeItem(STORAGE_ACTIVE_PLANT);
  renderPlantSelector();
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
  appView.classList.toggle("hidden",!["plants","plantForm","plantDashboard","limits","traffic"].includes(view));
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
function renderPlantAnimation(){
  return `<div class="plant-animation" aria-label="Animierte schematische Kläranlage aus der Vogelperspektive">
    <img src="plant-hero-base.png" alt="Kläranlage aus der Vogelperspektive">
    <div class="water-flow flow-a"></div><div class="water-flow flow-b"></div><div class="water-flow flow-c"></div>
    <span class="clarifier-rotor rotor-a"></span><span class="clarifier-rotor rotor-b"></span><span class="clarifier-rotor rotor-c"></span>
    <span class="aeration-bubbles bubbles-a"></span><span class="aeration-bubbles bubbles-b"></span>
    <button class="animation-toggle" id="animationToggle" type="button">Ⅱ Animation pausieren</button>
  </div>`;
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
    </section>`;
  bindDashboardActions();
  const animationToggle=$("#animationToggle");
  if(animationToggle)animationToggle.onclick=()=>{
    const visual=animationToggle.closest(".plant-animation");
    const paused=visual.classList.toggle("paused");
    animationToggle.textContent=paused?"▶ Animation starten":"Ⅱ Animation pausieren";
  };
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
  p.master.mainProcess=p.master.mainProcess||"activated-sludge";
  p.master.processStages=Array.isArray(p.master.processStages)?p.master.processStages:[];
  p.master.processOther=p.master.processOther||p.master.process||"";
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

    <section class="form-section"><h2>Anlagenadresse</h2><div class="form-grid">
      ${field("address.street","Straße und Hausnummer",p.address.street)}
      ${field("address.postalCode","Postleitzahl",p.address.postalCode)}
      ${field("address.city","Ort",p.address.city)}
      ${field("address.state","Bundesland",p.address.state)}
      ${field("address.country","Land",p.address.country)}
      ${field("address.latitude","Breitengrad",p.address.latitude,"number","z. B. 52,894321")}
      ${field("address.longitude","Längengrad",p.address.longitude,"number","z. B. 13,108765")}
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
  const numberInput=appView.querySelector('[name="master.internalNumber"]');
  if(numberInput)numberInput.readOnly=true;
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
    result.master.process=result.master.processOther||processLabel(result.master.mainProcess);
    const latitude=Number(String(result.address.latitude||"").replace(",","."));
    const longitude=Number(String(result.address.longitude||"").replace(",","."));
    if(result.address.latitude!==""&&(!Number.isFinite(latitude)||latitude<-90||latitude>90))return alert("Der Breitengrad muss zwischen -90 und +90 liegen.");
    if(result.address.longitude!==""&&(!Number.isFinite(longitude)||longitude<-180||longitude>180))return alert("Der Längengrad muss zwischen -180 und +180 liegen.");
    result.address.gps=result.address.latitude&&result.address.longitude?`${result.address.latitude}, ${result.address.longitude}`:result.address.gps||"";
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
function renderVisitCards(plant,visits){
  return visits.map(v=>`<article class="visit-card">
      <div class="visit-date"><strong>${formatDateTime(v.start)}</strong><span>bis ${formatDateTime(v.end)}</span></div>
      <div class="visit-main"><div class="visit-title-row"><h3>${esc(v.title||"Besuchstermin")}</h3><span class="status-chip ${visitStatusClass(v.status)}">${visitStatusLabel(v.status)}</span></div>
        <p><strong>Anlass:</strong> ${esc(v.purpose||"Nicht hinterlegt")}</p>
        ${v.notes?`<p class="visit-notes"><strong>Informationen und Notizen:</strong><br>${esc(v.notes)}</p>`:""}
        <small>${v.contact?`Ansprechpartner: ${esc(v.contact)}`:"Kein Ansprechpartner hinterlegt"}</small>
      </div>
      <div class="visit-actions">
        <button type="button" data-edit-visit="${v.id}">Bearbeiten</button>
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
      <button class="button primary" id="addVisit" type="button">Termin hinzufügen</button>
    </div>
    <h3 class="visit-group-title">Nächste Termine</h3>
    <div class="visits-list">${upcoming.length?renderVisitCards(plant,upcoming):`<div class="empty-panel compact"><p>Keine zukünftigen Termine hinterlegt.</p></div>`}</div>
    <h3 class="visit-group-title">Chronologische Historie</h3>
    <div class="visits-list">${history.length?renderVisitCards(plant,history):`<div class="empty-panel compact"><p>Noch keine vergangenen oder erledigten Termine.</p></div>`}</div>
  </section>`;
}
function showPlantDashboard(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"}`);
  const primary=plant.contacts?.[0];
  const mapUrls=googleMapsUrls(plant);
  appView.innerHTML=`<section class="plant-hero">
    <div><p class="eyebrow">Anlagenstartseite</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1>
    <p class="subtitle">${esc(plant.master.internalNumber||"")} · ${plant.master.type==="industrial"?"Industrielle Kläranlage":plant.master.type==="mixed"?"Kommunale Kläranlage mit Industrieanteil":"Kommunale Kläranlage"}${plant.master.capacityPE?` · ${fmtInteger(plant.master.capacityPE)} EW Ausbaugröße`:""}${plant.master.actualPE?` · ${fmtInteger(plant.master.actualPE)} EW Belastung`:""}</p></div>
    <div class="hero-actions"><button class="button secondary" id="editPlant">Bearbeiten</button><button class="button primary" id="openTraffic">Ampelübersicht</button></div>
  </section>
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
  ${renderVisits(plant)}
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Berechnungen</p><h2>Direkt mit dieser Anlage arbeiten</h2></div></div>
  <div class="dashboard-grid">${["Phosphor","Biologie","Schlammentwässerung","Wirtschaftlichkeit"].map(category=>{const meta=categoryMeta[category];return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:"Rechner öffnen"})}).join("")}</div></section>`;
  $("#editPlant").onclick=()=>showPlantForm(plant.id);$("#editParameters").onclick=()=>showPlantForm(plant.id);$("#openTraffic").onclick=showTraffic;
  $("#addVisit").onclick=()=>showVisitForm();
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

$$('[data-primary-view]').forEach(button=>button.onclick=()=>{
  const target=button.dataset.primaryView;
  if(target==="plants")showApplication("plants");
  else if(target==="calculators")showAllCalculators();
  closeMobileSidebar();
});
const showAllButton=$("#showAllCalculators");if(showAllButton)showAllButton.onclick=()=>{showAllCalculators();closeMobileSidebar()};
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
