import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const VERSION="0.5";
const STORAGE_FAVORITES="abwasser-favorites-v05";
const STORAGE_MENU="abwasser-menu-v05";
const STORAGE_PLANTS="abwasser-plants-v05";
const STORAGE_ACTIVE_PLANT="abwasser-active-plant-v05";

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
    process:"",notes:""
  },
  address:{street:"",postalCode:"",city:"",state:"Brandenburg",country:"Deutschland",gps:"",deliveryAddress:""},
  operator:{name:"",legalForm:"",customerNumber:"",street:"",postalCode:"",city:"",phone:"",email:"",website:""},
  contacts:[],
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
function fmt(value,digits=1){
  const num=Number(String(value).replace(",","."));
  return Number.isFinite(num)?num.toLocaleString("de-DE",{maximumFractionDigits:digits}):"–";
}
function esc(value=""){
  return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
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
function field(name,label,value="",type="text",placeholder=""){
  return `<label class="field-label">${label}<input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
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

    <section class="form-section"><h2>Stammdaten</h2><div class="form-grid">
      ${field("master.name","Name der Kläranlage",p.master.name)}
      ${field("master.internalNumber","Interne Anlagen-/Kundennummer",p.master.internalNumber)}
      ${selectField("master.type","Anlagentyp",p.master.type,[["municipal","Kommunal"],["industrial","Industriell"],["mixed","Kommunal mit Industrieanteil"]])}
      ${field("master.industry","Branche bei Industrieanlage",p.master.industry)}
      ${field("master.capacityPE","Ausbaugröße EW",p.master.capacityPE,"number")}
      ${field("master.actualPE","Tatsächliche Belastung EW",p.master.actualPE,"number")}
      ${field("master.process","Verfahrenstechnik",p.master.process)}
      <label class="field-label span-2">Besonderheiten<textarea name="master.notes">${esc(p.master.notes)}</textarea></label>
    </div></section>

    <section class="form-section"><h2>Anlagenadresse</h2><div class="form-grid">
      ${field("address.street","Straße und Hausnummer",p.address.street)}
      ${field("address.postalCode","Postleitzahl",p.address.postalCode)}
      ${field("address.city","Ort",p.address.city)}
      ${field("address.state","Bundesland",p.address.state)}
      ${field("address.country","Land",p.address.country)}
      ${field("address.gps","GPS-Koordinaten",p.address.gps)}
      <label class="field-label span-2">Abweichende Zufahrts-/Lieferadresse<textarea name="address.deliveryAddress">${esc(p.address.deliveryAddress)}</textarea></label>
    </div></section>

    <section class="form-section"><h2>Betreiber</h2><div class="form-grid">
      ${field("operator.name","Betreibername",p.operator.name)}
      ${field("operator.legalForm","Rechtsform",p.operator.legalForm)}
      ${field("operator.customerNumber","Kundennummer",p.operator.customerNumber)}
      ${field("operator.street","Straße und Hausnummer",p.operator.street)}
      ${field("operator.postalCode","Postleitzahl",p.operator.postalCode)}
      ${field("operator.city","Ort",p.operator.city)}
      ${field("operator.phone","Telefon",p.operator.phone,"tel")}
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

  let contacts=structuredClone(p.contacts||[]);
  const editor=$("#contactsEditor");
  const renderContacts=()=>{
    editor.innerHTML=contacts.length?contacts.map((c,i)=>`<article class="contact-editor-card">
      <div class="contact-editor-head"><strong>Ansprechpartner ${i+1}</strong><button type="button" data-remove-contact="${i}">Entfernen</button></div>
      <div class="form-grid">
        ${field(`contact.${i}.name`,"Name",c.name||"")}
        ${field(`contact.${i}.role`,"Funktion",c.role||"")}
        ${field(`contact.${i}.department`,"Bereich",c.department||"")}
        ${field(`contact.${i}.phone`,"Telefon",c.phone||"","tel")}
        ${field(`contact.${i}.mobile`,"Mobil",c.mobile||"","tel")}
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
    for(const [key,value] of fd.entries()){
      if(key.startsWith("contact."))continue;
      const [section,prop]=key.split(".");
      result[section][prop]=value;
    }
    result.contacts=contacts.map((c,i)=>{
      const obj={};
      for(const prop of ["name","role","department","phone","mobile","email","preferred","notes"]){
        obj[prop]=fd.get(`contact.${i}.${prop}`)||"";
      }
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
function showPlantDashboard(){
  const plant=activePlant();if(!plant)return showPlantForm();
  setView("plantDashboard");setBreadcrumb(`Anlagen › ${plant.master.name||"Unbenannte Anlage"}`);
  const primary=plant.contacts?.[0];
  appView.innerHTML=`<section class="plant-hero">
    <div><p class="eyebrow">Anlagenstartseite</p><h1>${esc(plant.master.name||"Unbenannte Anlage")}</h1>
    <p class="subtitle">${plant.master.type==="industrial"?"Industrielle Kläranlage":plant.master.type==="mixed"?"Kommunale Kläranlage mit Industrieanteil":"Kommunale Kläranlage"}${plant.master.capacityPE?` · ${fmt(plant.master.capacityPE,0)} EW`:""}</p></div>
    <div class="hero-actions"><button class="button secondary" id="editPlant">Bearbeiten</button><button class="button primary" id="openTraffic">Ampelübersicht</button></div>
  </section>
  ${renderTrafficSummary(plant)}
  <div class="record-grid">
    <article class="record-card"><h2>Anlage</h2><dl>
      <div><dt>Adresse</dt><dd>${esc([plant.address.street,[plant.address.postalCode,plant.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"–")}</dd></div>
      <div><dt>Verfahren</dt><dd>${esc(plant.master.process||"–")}</dd></div><div><dt>Branche</dt><dd>${esc(plant.master.industry||"–")}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Betreiber</h2><dl>
      <div><dt>Name</dt><dd>${esc(plant.operator.name||"–")}</dd></div><div><dt>Telefon</dt><dd>${esc(plant.operator.phone||"–")}</dd></div><div><dt>E-Mail</dt><dd>${esc(plant.operator.email||"–")}</dd></div>
    </dl></article>
    <article class="record-card"><h2>Hauptansprechpartner</h2><dl>
      <div><dt>Name</dt><dd>${esc(primary?.name||"–")}</dd></div><div><dt>Funktion</dt><dd>${esc(primary?.role||"–")}</dd></div><div><dt>Kontakt</dt><dd>${esc(primary?.mobile||primary?.phone||primary?.email||"–")}</dd></div>
    </dl></article>
  </div>
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Zentrale Datenbasis</p><h2>Betriebswerte</h2></div><button class="text-button" id="editParameters">Werte bearbeiten</button></div>
  <div class="kpi-grid">
    ${[["Volumenstrom",plant.parameters.flow,"m³/d"],["Pges Ablauf",plant.parameters.pOut,"mg/l"],["NH₄-N Ablauf",plant.parameters.nh4Out,"mg/l"],["SVI",plant.parameters.svi,"ml/g"],["Schlammalter",plant.parameters.sludgeAge,"d"],["Kuchen-TS",plant.parameters.cakeTs,"%"],["Feststoffrückhalt",plant.parameters.retention,"%"],["Polymer",plant.parameters.polymer,"kg WS/t TS"]].map(([l,v,u])=>`<article class="kpi-card"><span>${l}</span><strong>${fmt(v)}</strong><small>${u}</small></article>`).join("")}
  </div></section>
  <section class="dashboard-section"><div class="section-heading"><div><p class="eyebrow">Berechnungen</p><h2>Direkt mit dieser Anlage arbeiten</h2></div></div>
  <div class="dashboard-grid">${["Phosphor","Biologie","Schlammentwässerung","Wirtschaftlichkeit"].map(category=>{const meta=categoryMeta[category];return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:"Rechner öffnen"})}).join("")}</div></section>`;
  $("#editPlant").onclick=()=>showPlantForm(plant.id);$("#editParameters").onclick=()=>showPlantForm(plant.id);$("#openTraffic").onclick=showTraffic;bindDashboardActions();
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
    imported.limits=imported.limits||structuredClone(defaultLimits);imported.contacts=imported.contacts||[];imported.parameters=imported.parameters||{};
    plants.push(imported);activePlantId=imported.id;savePlants();showPlantDashboard();
  }catch(err){alert(`Import nicht möglich: ${err.message}`)}
  e.target.value="";
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installButton").classList.remove("hidden")});
$("#installButton").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installButton").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

renderPlantSelector();renderCategoryMenu();showHome();
