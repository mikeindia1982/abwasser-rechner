import {$,$$} from "./utils.js";
import {calculators} from "./calculators.js";

const state={category:"Alle",query:"",selected:null,favoritesOnly:false,favorites:new Set(JSON.parse(localStorage.getItem("abwasser-favorites-v03")||"[]"))};
const categories=["Alle",...new Set(calculators.map(item=>item.category))];
const workspace=$("#workspace"),cards=$("#calculatorCards"),chips=$("#categoryChips"),count=$("#calculatorCount");

function filtered(){const q=state.query.toLowerCase();return calculators.filter(item=>(state.category==="Alle"||item.category===state.category)&&(!state.favoritesOnly||state.favorites.has(item.id))&&(!q||`${item.name} ${item.short} ${item.category}`.toLowerCase().includes(q)));}
function renderChips(){chips.innerHTML=categories.map(category=>`<button type="button" class="chip ${state.category===category?"active":""}" data-category="${category}">${category}</button>`).join("");$$('.chip').forEach(button=>button.onclick=()=>{state.category=button.dataset.category;state.favoritesOnly=false;$("#favoriteFilter").textContent="★ Favoriten";render();});}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);localStorage.setItem("abwasser-favorites-v03",JSON.stringify([...state.favorites]));renderCards();}
function selectCalculator(id){state.selected=id;renderCards();const calculator=calculators.find(item=>item.id===id);calculator.render(workspace);if(innerWidth<951)workspace.scrollIntoView({behavior:"smooth",block:"start"});}
function renderCards(){const list=filtered();count.textContent=`${list.length} von ${calculators.length}`;cards.innerHTML=list.length?list.map(item=>`<article class="calculator-card ${state.selected===item.id?"active":""}" data-id="${item.id}" role="button" tabindex="0" aria-label="${item.name} öffnen"><span class="category">${item.category}</span><button type="button" class="favorite ${state.favorites.has(item.id)?"active":""}" data-favorite="${item.id}" aria-label="${state.favorites.has(item.id)?"Aus Favoriten entfernen":"Zu Favoriten hinzufügen"}">★</button><h3>${item.name}</h3><p>${item.short}</p></article>`).join(""):`<p>Keine passenden Rechner gefunden.</p>`;
  $$('.calculator-card').forEach(card=>{card.onclick=e=>{if(!e.target.closest('.favorite'))selectCalculator(card.dataset.id)};card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.favorite')){e.preventDefault();selectCalculator(card.dataset.id)}};});
  $$('.favorite').forEach(button=>button.onclick=e=>{e.stopPropagation();toggleFavorite(button.dataset.favorite);});}
function render(){renderChips();renderCards();}
$("#searchInput").oninput=e=>{state.query=e.target.value;renderCards();};
$("#clearSearch").onclick=()=>{$("#searchInput").value="";state.query="";renderCards();};
$("#favoriteFilter").onclick=()=>{state.favoritesOnly=!state.favoritesOnly;state.category="Alle";$("#favoriteFilter").textContent=state.favoritesOnly?"Alle Rechner":"★ Favoriten";render();};
let deferredPrompt=null;window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredPrompt=event;$("#installButton").classList.remove("hidden");});$("#installButton").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installButton").classList.add("hidden");};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
render();
