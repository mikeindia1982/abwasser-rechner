(()=>{
  'use strict';

  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  const PROFILE_KEY='abwasser-employee-profile-v087';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const MAX_ATTEMPTS=8;
  let attempts=0;
  let finished=false;
  let lastError=null;

  function organizationActive(){
    return localStorage.getItem(ORG_ACTIVE_KEY)==='1';
  }

  function forceTodayAsStartupPage(){
    if(organizationActive())return;
    try{localStorage.setItem(GLOBAL_PAGE_KEY,'today')}catch{}
  }

  function safeJson(key,fallback){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      return parsed??fallback;
    }catch{return fallback}
  }

  function esc(value=''){
    return String(value??'').replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function localDayKey(date){
    const pad=n=>String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }

  function validDate(value){
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date;
  }

  function safePlants(){
    const value=safeJson(PLANTS_KEY,[]);
    return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'):[];
  }

  function safeProfile(){
    const value=safeJson(PROFILE_KEY,{});
    return value&&typeof value==='object'?value:{};
  }

  function rescueModel(){
    const now=new Date();
    const today=localDayKey(now);
    const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const plants=safePlants();
    const profile=safeProfile();
    const activeId=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
    const activePlant=plants.find(plant=>String(plant.id||'')===activeId)||plants[0]||null;

    const visits=[];
    const tasks=[];
    for(const plant of plants){
      const plantName=String(plant?.master?.name||'Kläranlage');
      const plantVisits=Array.isArray(plant.visits)?plant.visits:[];
      for(const visit of plantVisits){
        if(!visit||visit.status==='done'||visit.status==='cancelled')continue;
        const date=validDate(visit.start);
        if(!date)continue;
        visits.push({plantName,date,title:String(visit.title||visit.purpose||'Termin')});
      }
      const actions=Array.isArray(plant.actions)?plant.actions:[];
      for(const action of actions){
        if(!action||action.status==='done')continue;
        const due=action.dueDate?validDate(`${action.dueDate}T12:00:00`):null;
        tasks.push({plantName,action,due});
      }
    }
    visits.sort((a,b)=>a.date-b.date);
    tasks.sort((a,b)=>(a.due?.getTime()??Infinity)-(b.due?.getTime()??Infinity));

    const visitsToday=visits.filter(item=>localDayKey(item.date)===today);
    const overdue=tasks.filter(item=>item.due&&item.due.getTime()<startOfToday);
    const name=String(profile.firstName||profile.lastName||'').trim();
    const hour=now.getHours();
    const greeting=hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
    return {now,plants,activePlant,visitsToday,tasks,overdue,name,greeting};
  }

  function bindRescueActions(root){
    root.querySelectorAll('[data-rescue-action]').forEach(button=>{
      button.addEventListener('click',()=>{
        const action=button.dataset.rescueAction;
        if(action==='appointments')document.querySelector('[data-global-view="appointments"]')?.click();
        else if(action==='tasks')document.querySelector('[data-global-view="tasks-global"]')?.click();
        else if(action==='plants')document.querySelector('#managePlantsButton')?.click();
      });
    });
  }

  function renderRescue(){
    if(organizationActive())return;
    const dashboard=document.querySelector('#dashboard');
    if(!dashboard)return;
    const currentRescue=dashboard.querySelector('[data-startup-dashboard-rescue]');
    if(dashboard.childElementCount&&!currentRescue)return;

    const model=rescueModel();
    const nextVisit=model.visitsToday[0]||null;
    const agenda=[
      ...model.visitsToday.slice(0,3).map(item=>({
        label:`${item.date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · ${item.plantName}`,
        detail:item.title
      })),
      ...model.overdue.slice(0,2).map(item=>({label:`Überfällig · ${item.plantName}`,detail:String(item.action?.title||'Aufgabe')})),
      ...model.tasks.filter(item=>item.action?.dueDate===localDayKey(model.now)).slice(0,2).map(item=>({label:`Heute fällig · ${item.plantName}`,detail:String(item.action?.title||'Aufgabe')}))
    ].slice(0,6);

    dashboard.classList.remove('hidden');
    document.querySelector('#applicationView')?.classList.add('hidden');
    document.querySelector('#calculatorView')?.classList.add('hidden');
    dashboard.innerHTML=`<div data-startup-dashboard-rescue>
      <section class="today-dashboard-hero">
        <div>
          <p class="eyebrow">Persönliches Dashboard</p>
          <h1>${esc(model.greeting)}${model.name?`, ${esc(model.name)}`:''}.</h1>
          <p>Dein kompakter Tagesfokus mit Terminen, Aufgaben und direktem Zugriff auf die wichtigsten Aktionen.</p>
        </div>
        <div class="today-dashboard-meta">
          <span>${esc(model.now.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}))}</span>
          <strong>${esc(model.now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))}</strong>
        </div>
        <div class="today-dashboard-actions">
          <button class="button primary" type="button" data-rescue-action="plants">${model.activePlant?'Aktive Anlage öffnen':'Anlage anlegen'}</button>
          <button class="button secondary" type="button" data-rescue-action="appointments">Termine anzeigen</button>
          <button class="button secondary" type="button" data-rescue-action="tasks">Aufgaben anzeigen</button>
        </div>
      </section>

      <section class="plant-visual-card today-plant-visual-card">
        <div class="plant-animation">
          <img src="plant-hero-base.png" alt="Kläranlage aus der Vogelperspektive">
          <div class="active-plant-overlay">
            <div><small>Aktive Anlage</small><strong>${esc(model.activePlant?.master?.name||'Noch keine Anlage ausgewählt')}</strong></div>
          </div>
        </div>
      </section>

      <section class="today-kpi-grid" aria-label="Tageskennzahlen">
        <article class="today-kpi-card"><span>Termine heute</span><strong>${model.visitsToday.length}</strong><small>${nextVisit?`Nächster Termin um ${esc(nextVisit.date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))}`:'Heute keine weiteren Termine'}</small></article>
        <article class="today-kpi-card"><span>Offene Aufgaben</span><strong>${model.tasks.length}</strong><small>Über alle lokalen Anlagen</small></article>
        <article class="today-kpi-card warning"><span>Überfällig</span><strong>${model.overdue.length}</strong><small>${model.overdue.length?'Bitte heute priorisieren':'Keine überfälligen Punkte'}</small></article>
      </section>

      <section class="today-personal-grid">
        <article class="cockpit-panel">
          <div class="panel-title"><div><p class="eyebrow">Mein Tag</p><h2>Agenda</h2></div></div>
          <div class="today-agenda-list">
            ${agenda.length?agenda.map(item=>`<div class="today-agenda-item"><span>Heute</span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></div>`).join(''):'<div class="dashboard-empty">Für heute sind noch keine Termine oder fälligen Aufgaben geplant.</div>'}
          </div>
        </article>
        <article class="cockpit-panel">
          <div class="panel-title"><div><p class="eyebrow">Arbeitsbereich</p><h2>Schnellzugriff</h2></div></div>
          <div class="today-focus-list">
            <button type="button" class="today-focus-item" data-rescue-action="plants"><strong>Anlagen</strong><small>${model.plants.length} lokal gespeicherte Anlage${model.plants.length===1?'':'n'}</small></button>
            <button type="button" class="today-focus-item" data-rescue-action="appointments"><strong>Termine</strong><small>Tages- und Wochenplanung öffnen</small></button>
            <button type="button" class="today-focus-item" data-rescue-action="tasks"><strong>Aufgaben</strong><small>Offene Punkte bearbeiten</small></button>
          </div>
        </article>
      </section>
    </div>`;
    bindRescueActions(dashboard);
  }

  function dashboardHasNativeContent(){
    const dashboard=document.querySelector('#dashboard');
    if(!dashboard||!dashboard.childElementCount||!dashboard.textContent.trim())return false;
    return !dashboard.querySelector('[data-startup-dashboard-rescue]');
  }

  function openHome(){
    if(finished||organizationActive())return;
    forceTodayAsStartupPage();
    renderRescue();

    const home=document.querySelector('#homeButton');
    try{
      if(typeof home?.onclick==='function')home.onclick();
      else if(attempts>1)home?.click();
    }catch(error){
      lastError=error;
      window.__vtaStartupDashboardError=String(error?.stack||error?.message||error);
      console.error('Native Startseite konnte nicht geöffnet werden. Sichere Startseite bleibt aktiv.',error);
    }

    requestAnimationFrame(()=>{
      if(dashboardHasNativeContent()){
        finished=true;
        return;
      }
      renderRescue();
      attempts+=1;
      if(attempts>=MAX_ATTEMPTS){
        finished=true;
        if(lastError)console.warn('VTA Copilot nutzt die browserkompatible Startseite, weil das native Dashboard einen Fehler ausgelöst hat.');
        return;
      }
      const delays=[60,120,250,450,750,1100,1600,2200];
      setTimeout(openHome,delays[Math.min(attempts,delays.length-1)]);
    });
  }

  // Bei jedem echten Start ist "Heute" die definierte Startseite.
  forceTodayAsStartupPage();

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{renderRescue();openHome()},{once:true});
  }else{
    renderRescue();
    openHome();
  }
  window.addEventListener('load',()=>{if(!finished)openHome()},{once:true});
})();
