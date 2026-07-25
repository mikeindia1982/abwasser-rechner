import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const VERSION="0.4";
const STORAGE_FAVORITES="abwasser-favorites-v04";
const STORAGE_MENU="abwasser-menu-v04";

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

const state={
  view:"dashboard",
  category:null,
  query:"",
  selected:null,
  favoritesOnly:false,
  favorites:new Set(JSON.parse(localStorage.getItem(STORAGE_FAVORITES)||"[]")),
  openCategories:new Set(JSON.parse(localStorage.getItem(STORAGE_MENU)||"[]"))
};

const categories=[...new Set(calculators.map(item=>item.category))];
const workspace=$("#workspace");
const cards=$("#calculatorCards");
const menu=$("#categoryMenu");
const count=$("#calculatorCount");

function persistMenu(){
  localStorage.setItem(STORAGE_MENU,JSON.stringify([...state.openCategories]));
}
function filtered(){
  const query=state.query.trim().toLowerCase();
  return calculators.filter(item=>
    (!state.category||item.category===state.category)&&
    (!state.favoritesOnly||state.favorites.has(item.id))&&
    (!query||`${item.name} ${item.short} ${item.category}`.toLowerCase().includes(query))
  );
}
function categoryCount(category){
  return calculators.filter(item=>item.category===category).length;
}
function renderCategoryMenu(){
  menu.innerHTML=categories.map(category=>{
    const meta=categoryMeta[category]||{icon:"•",description:""};
    const open=state.openCategories.has(category);
    const items=calculators.filter(item=>item.category===category);
    return `<section class="menu-group ${open?"open":""}">
      <button class="menu-group-toggle ${state.category===category&&!state.favoritesOnly?"active":""}" type="button" data-category-toggle="${category}" aria-expanded="${open}">
        <span class="menu-icon">${meta.icon}</span>
        <span class="menu-label">${category}</span>
        <span class="menu-count">${items.length}</span>
        <span class="menu-chevron">›</span>
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
    persistMenu();
    renderCategoryMenu();
  });
  $$("[data-category]").forEach(button=>button.onclick=()=>{
    showCategory(button.dataset.category);
    closeMobileSidebar();
  });
  $$("[data-calculator]").forEach(button=>button.onclick=()=>{
    selectCalculator(button.dataset.calculator);
    closeMobileSidebar();
  });
}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  localStorage.setItem(STORAGE_FAVORITES,JSON.stringify([...state.favorites]));
  renderCards();
  renderCategoryMenu();
  if(state.view==="dashboard")renderDashboard();
}
function renderCards(){
  const list=filtered();
  count.textContent=`${list.length} von ${calculators.length}`;
  cards.innerHTML=list.length?list.map(item=>`<article class="calculator-card ${state.selected===item.id?"active":""}" data-id="${item.id}" role="button" tabindex="0" aria-label="${item.name} öffnen">
    <span class="category">${item.category}</span>
    <button type="button" class="favorite ${state.favorites.has(item.id)?"active":""}" data-favorite="${item.id}" aria-label="${state.favorites.has(item.id)?"Aus Favoriten entfernen":"Zu Favoriten hinzufügen"}">★</button>
    <h3>${item.name}</h3><p>${item.short}</p>
  </article>`).join(""):`<div class="no-results"><h3>Keine Treffer</h3><p>Suchbegriff oder Filter ändern.</p></div>`;

  $$(".calculator-card").forEach(card=>{
    card.onclick=event=>{if(!event.target.closest(".favorite"))selectCalculator(card.dataset.id)};
    card.onkeydown=event=>{
      if((event.key==="Enter"||event.key===" ")&&!event.target.closest(".favorite")){
        event.preventDefault();selectCalculator(card.dataset.id);
      }
    };
  });
  $$(".favorite").forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    toggleFavorite(button.dataset.favorite);
  });
}
function setBreadcrumb(current=""){
  $("#breadcrumbCurrent").textContent=current;
  $("#breadcrumbSeparator").classList.toggle("hidden",!current);
}
function setView(view){
  state.view=view;
  $("#dashboard").classList.toggle("hidden",view!=="dashboard");
  $("#calculatorView").classList.toggle("hidden",view!=="calculators");
  $("#dashboardNav").classList.toggle("active",view==="dashboard");
  $("#printButton").classList.toggle("hidden",view!=="calculators"||!state.selected);
}
function showHome(){
  state.category=null;
  state.query="";
  state.selected=null;
  state.favoritesOnly=false;
  $("#searchInput").value="";
  $("#favoriteFilter").textContent="★ Favoriten";
  setView("dashboard");
  setBreadcrumb("");
  renderDashboard();
  renderCategoryMenu();
  window.scrollTo({top:0,behavior:"smooth"});
}
function showCategory(category){
  state.category=category;
  state.favoritesOnly=false;
  state.selected=null;
  $("#favoriteFilter").textContent="★ Favoriten";
  setView("calculators");
  const meta=categoryMeta[category]||{};
  $("#catalogEyebrow").textContent="Kategorie";
  $("#catalogTitle").textContent=category;
  $("#catalogDescription").textContent=meta.description||"Verfügbare Rechner";
  workspace.innerHTML=`<div class="empty-state"><h2>Rechner auswählen</h2><p>Wähle ein Werkzeug aus der Kategorie ${category}.</p></div>`;
  setBreadcrumb(category);
  renderCards();
  renderCategoryMenu();
}
function showSearchResults(){
  state.category=null;
  state.favoritesOnly=false;
  state.selected=null;
  setView("calculators");
  $("#catalogEyebrow").textContent="Suche";
  $("#catalogTitle").textContent="Suchergebnisse";
  $("#catalogDescription").textContent=state.query?`Treffer für „${state.query}“`:"Alle verfügbaren Rechner";
  workspace.innerHTML=`<div class="empty-state"><h2>Rechner auswählen</h2><p>Wähle einen Treffer aus.</p></div>`;
  setBreadcrumb("Suche");
  renderCards();
  renderCategoryMenu();
}
function showFavorites(){
  state.category=null;
  state.favoritesOnly=true;
  state.selected=null;
  setView("calculators");
  $("#catalogEyebrow").textContent="Schnellzugriff";
  $("#catalogTitle").textContent="Favoriten";
  $("#catalogDescription").textContent="Deine lokal auf diesem Gerät gespeicherten Rechner.";
  workspace.innerHTML=`<div class="empty-state"><h2>Favorit auswählen</h2><p>Markiere Rechner über den Stern, um sie hier abzulegen.</p></div>`;
  setBreadcrumb("Favoriten");
  $("#favoriteFilter").textContent="Alle Rechner";
  renderCards();
  renderCategoryMenu();
}
function selectCalculator(id){
  const calculator=calculators.find(item=>item.id===id);
  if(!calculator)return;
  state.selected=id;
  state.category=calculator.category;
  state.favoritesOnly=false;
  setView("calculators");
  const meta=categoryMeta[calculator.category]||{};
  $("#catalogEyebrow").textContent="Kategorie";
  $("#catalogTitle").textContent=calculator.category;
  $("#catalogDescription").textContent=meta.description||"Verfügbare Rechner";
  setBreadcrumb(`${calculator.category} › ${calculator.name}`);
  renderCards();
  renderCategoryMenu();
  calculator.render(workspace);
  $("#printButton").classList.remove("hidden");
  if(innerWidth<1051)workspace.scrollIntoView({behavior:"smooth",block:"start"});
}
function quickCard({icon,title,text,action,label,status}){
  return `<article class="dashboard-card ${status==="planned"?"planned":""}">
    <span class="dashboard-icon">${icon}</span>
    <div><h3>${title}</h3><p>${text}</p></div>
    ${status==="planned"?`<span class="planned-badge">Geplant</span>`:`<button type="button" class="dashboard-link" data-dashboard-action="${action}">${label||"Öffnen"} →</button>`}
  </article>`;
}
function renderDashboard(){
  const favoriteList=calculators.filter(item=>state.favorites.has(item.id)).slice(0,4);
  $("#dashboard").innerHTML=`
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Startseite</p>
        <h1>Werkzeuge für die Abwasserpraxis</h1>
        <p class="subtitle">Berechnungen zu Fällmitteln, Schlammentwässerung, Biologie, Hydraulik und Wirtschaftlichkeit – lokal im Browser.</p>
        <div class="hero-actions">
          <button type="button" class="button primary" data-dashboard-action="Phosphor">Fällmittel berechnen</button>
          <button type="button" class="button secondary" data-dashboard-action="Schlammentwässerung">Entwässerung öffnen</button>
        </div>
      </div>
      <div class="hero-stat">
        <strong>${calculators.length}</strong>
        <span>verfügbare Rechner</span>
        <small>Version ${VERSION}</small>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Direktzugriff</p><h2>Kategorien</h2></div></div>
      <div class="dashboard-grid">
        ${categories.map(category=>{
          const meta=categoryMeta[category]||{icon:"•",description:""};
          return quickCard({icon:meta.icon,title:category,text:meta.description,action:category,label:`${categoryCount(category)} Rechner`});
        }).join("")}
      </div>
    </section>

    ${favoriteList.length?`<section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Persönlich</p><h2>Favoriten</h2></div><button class="text-button" data-dashboard-action="favorites" type="button">Alle anzeigen</button></div>
      <div class="favorite-dashboard-grid">
        ${favoriteList.map(item=>`<button type="button" class="favorite-dashboard-item" data-dashboard-calculator="${item.id}">
          <span>${item.category}</span><strong>${item.name}</strong><small>${item.short}</small>
        </button>`).join("")}
      </div>
    </section>`:""}

    <section class="dashboard-section">
      <div class="section-heading"><div><p class="eyebrow">Ausbauplanung</p><h2>Nächste Module</h2></div></div>
      <div class="dashboard-grid future-grid">
        ${quickCard({icon:"↔",title:"Kunden- und Anlagenvergleich",text:"Berechnungen speichern und Varianten beziehungsweise Anlagen vergleichen.",status:"planned"})}
        ${quickCard({icon:"PDF",title:"Berichte",text:"Eingaben, Rechenweg, Ergebnisse und Diagramme als Kundenbericht ausgeben.",status:"planned"})}
        ${quickCard({icon:"↗",title:"Diagramme",text:"Kosten-, Dosier- und Leistungskennlinien grafisch auswerten.",status:"planned"})}
        ${quickCard({icon:"DB",title:"Produktdatenbank",text:"Eigene Fällmittel und Polymere lokal speichern und wiederverwenden.",status:"planned"})}
        ${quickCard({icon:"i",title:"Fachwissen",text:"Erklärungen, Annahmen, Grenzen und fachliche Hinweise zu jedem Rechner.",status:"planned"})}
      </div>
    </section>
  `;
  $$("[data-dashboard-action]").forEach(button=>button.onclick=()=>{
    const action=button.dataset.dashboardAction;
    if(action==="favorites")showFavorites();
    else showCategory(action);
  });
  $$("[data-dashboard-calculator]").forEach(button=>button.onclick=()=>selectCalculator(button.dataset.dashboardCalculator));
}
function openMobileSidebar(){
  $("#sidebar").classList.add("mobile-open");
  $("#sidebarBackdrop").classList.add("visible");
  document.body.classList.add("menu-open");
}
function closeMobileSidebar(){
  $("#sidebar").classList.remove("mobile-open");
  $("#sidebarBackdrop").classList.remove("visible");
  document.body.classList.remove("menu-open");
}

$("#homeButton").onclick=showHome;
$("#dashboardNav").onclick=()=>{showHome();closeMobileSidebar();};
$("#breadcrumbHome").onclick=showHome;
$("#sidebarOpen").onclick=openMobileSidebar;
$("#sidebarClose").onclick=closeMobileSidebar;
$("#sidebarBackdrop").onclick=closeMobileSidebar;
$("#printButton").onclick=()=>window.print();

$("#searchInput").oninput=event=>{
  state.query=event.target.value;
  if(state.query)showSearchResults();
  else if(state.view==="calculators")showSearchResults();
};
$("#clearSearch").onclick=()=>{
  $("#searchInput").value="";
  state.query="";
  showHome();
};
$("#favoriteFilter").onclick=()=>{
  if(state.favoritesOnly)showHome();
  else showFavorites();
  closeMobileSidebar();
};

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredPrompt=event;
  $("#installButton").classList.remove("hidden");
});
$("#installButton").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  $("#installButton").classList.add("hidden");
};
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
}

renderCategoryMenu();
showHome();
