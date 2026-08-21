(()=>{
  'use strict';

  const runtime=globalThis.VTANativeRuntime;
  if(!runtime?.enabled)return;

  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const PLANTS_KEY='abwasser-plants-v07';
  const PROFILE_KEY='abwasser-employee-profile-v087';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
  const BUILD='0.11.0-alpha.64-native-navigation-recovery1';

  const safeJson=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch{return fallback}
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const plants=()=>{
    const value=safeJson(PLANTS_KEY,[]);
    return Array.isArray(value)?value.filter(Boolean):[];
  };
  const profile=()=>{
    const value=safeJson(PROFILE_KEY,{});
    return value&&typeof value==='object'?value:{};
  };

  function removeStaleScrollLocks(force=false){
    const body=document.body;
    if(!body)return;
    const sheetOpen=Boolean(document.querySelector('.plant-sheet.open:not([hidden])'));
    const menuOpen=Boolean(document.querySelector('.sidebar.mobile-open'));
    const moreOpen=Boolean(document.querySelector('.vta-more-sheet.open:not([hidden])'));
    if(force||!sheetOpen)body.classList.remove('sheet-open');
    if(force||!menuOpen)body.classList.remove('menu-open');
    if(force||!moreOpen)body.classList.remove('vta-more-open');
  }

  function activateBottom(name){
    document.querySelectorAll('[data-vta-bottom]').forEach(button=>{
      const selected=button.dataset.vtaBottom===name;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-current',selected?'page':'false');
    });
  }

  function showLocalHomeFallback(error=null){
    const dashboard=document.querySelector('#dashboard');
    const appView=document.querySelector('#applicationView');
    const calculator=document.querySelector('#calculatorView');
    if(!dashboard)return;

    const items=plants();
    const person=profile();
    const activeId=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
    const active=items.find(item=>String(item?.id||'')===String(activeId))||items[0]||null;
    const tasks=items.flatMap(plant=>{
      const actions=Array.isArray(plant?.actions)?plant.actions:[];
      return actions.filter(action=>action&&action.status!=='done').map(action=>({plant,action}));
    });
    const appointments=items.flatMap(plant=>{
      const visits=Array.isArray(plant?.visits)?plant.visits:[];
      return visits.filter(visit=>visit&&visit.status!=='done'&&visit.status!=='cancelled');
    });
    const name=String(person.firstName||person.lastName||'').trim();
    const hour=new Date().getHours();
    const greeting=hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';

    dashboard.classList.remove('hidden');
    appView?.classList.add('hidden');
    calculator?.classList.add('hidden');
    localStorage.setItem(GLOBAL_PAGE_KEY,'today');
    document.querySelector('#breadcrumbCurrent')?.replaceChildren();
    document.querySelector('#breadcrumbSeparator')?.classList.add('hidden');

    dashboard.innerHTML=`<div data-native-home-recovery="${BUILD}">
      <section class="today-dashboard-hero">
        <div><p class="eyebrow">Persönliches Dashboard</p><h1>${esc(greeting)}${name?`, ${esc(name)}`:''}.</h1><p>Lokaler Arbeitsstand. Cloud-Dienste werden im Hintergrund synchronisiert.</p></div>
        <div class="today-dashboard-actions">
          <button class="button primary" type="button" data-native-home-action="plant">${active?'Aktive Anlage öffnen':'Anlagen öffnen'}</button>
          <button class="button secondary" type="button" data-native-home-action="tasks">Vorgänge öffnen</button>
        </div>
      </section>
      <section class="today-kpi-grid" aria-label="Tageskennzahlen">
        <article class="today-kpi-card"><span>Anlagen</span><strong>${items.length}</strong><small>Lokal auf diesem Gerät</small></article>
        <article class="today-kpi-card"><span>Offene Vorgänge</span><strong>${tasks.length}</strong><small>Aufgaben und Nachfasspunkte</small></article>
        <article class="today-kpi-card"><span>Termine</span><strong>${appointments.length}</strong><small>Offene lokale Termine</small></article>
      </section>
      <section class="cockpit-panel"><div class="panel-title"><div><p class="eyebrow">Aktive Anlage</p><h2>${esc(active?.master?.name||'Keine Anlage ausgewählt')}</h2></div></div><p>${error?'Die Standard-Startseite konnte nicht vollständig gerendert werden. Der lokale Arbeitsbereich bleibt verfügbar.':'Bereit für den nächsten Arbeitsschritt.'}</p></section>
    </div>`;

    dashboard.querySelector('[data-native-home-action="plant"]')?.addEventListener('click',()=>{
      document.querySelector('[data-primary-view="plants"]')?.onclick?.();
    });
    dashboard.querySelector('[data-native-home-action="tasks"]')?.addEventListener('click',()=>openTasks());
    activateBottom('today');
    removeStaleScrollLocks(true);
  }

  function showLocalTasksFallback(error=null){
    const dashboard=document.querySelector('#dashboard');
    const appView=document.querySelector('#applicationView');
    const calculator=document.querySelector('#calculatorView');
    if(!appView)return;

    const items=plants();
    const tasks=items.flatMap(plant=>{
      const actions=Array.isArray(plant?.actions)?plant.actions:[];
      return actions
        .filter(action=>action&&action.status!=='done')
        .map(action=>({plant,action}));
    }).sort((a,b)=>String(a.action?.dueDate||'9999-12-31').localeCompare(String(b.action?.dueDate||'9999-12-31')));

    dashboard?.classList.add('hidden');
    calculator?.classList.add('hidden');
    appView.classList.remove('hidden');
    localStorage.setItem(GLOBAL_PAGE_KEY,'tasks-global');
    const breadcrumb=document.querySelector('#breadcrumbCurrent');
    if(breadcrumb)breadcrumb.textContent='Vorgänge';
    document.querySelector('#breadcrumbSeparator')?.classList.remove('hidden');

    appView.innerHTML=`<section class="page-header"><div><p class="eyebrow">Arbeitsliste</p><h1>Vorgänge</h1><p class="subtitle">Offene Aufgaben und Nachfasspunkte aus allen Anlagen.</p></div></section>
      ${error?'<div class="info-box">Die Standardansicht hatte einen Datenfehler. Die lokalen Vorgänge werden sicher dargestellt.</div>':''}
      <div class="global-task-list">${tasks.length?tasks.map(({plant,action})=>`<article class="global-task-card" data-native-task-card="${esc(action.id||'')}"><div class="task-content"><span>${esc(plant?.master?.name||'Kläranlage')}</span><strong>${esc(action.title||'Vorgang')}</strong><div class="task-meta"><span>${action.dueDate?`Fällig: ${esc(String(action.dueDate).slice(0,10))}`:'Ohne Fälligkeit'}</span><span>${esc(action.priority==='high'?'Hohe Priorität':'Normal')}</span></div></div><div class="task-actions"><button type="button" data-native-open-plant="${esc(plant?.id||'')}">Anlage öffnen</button></div></article>`).join(''):'<div class="empty-panel"><h2>Keine offenen Vorgänge</h2><p>Aktuell sind lokal keine offenen Aufgaben vorhanden.</p></div>'}</div>`;

    appView.querySelectorAll('[data-native-open-plant]').forEach(button=>button.addEventListener('click',()=>{
      const plantId=String(button.dataset.nativeOpenPlant||'');
      const select=document.querySelector('#activePlantSelect');
      if(!plantId||!select)return;
      localStorage.setItem(ACTIVE_PLANT_KEY,plantId);
      localStorage.setItem(PLANT_PAGE_KEY,'tasks');
      select.value=plantId;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(()=>document.querySelector('[data-plant-page="tasks"]')?.click(),80);
    }));

    activateBottom('tasks');
    removeStaleScrollLocks(true);
    window.scrollTo({top:0,behavior:'auto'});
  }

  function invokeSidebarRoute(selector){
    const source=document.querySelector(selector);
    if(!source)throw new Error(`Navigationsziel fehlt: ${selector}`);
    if(typeof source.onclick==='function')return source.onclick();
    source.click();
  }

  function openHome(){
    removeStaleScrollLocks(true);
    let error=null;
    try{invokeSidebarRoute('[data-global-view="today"]')}
    catch(err){error=err;console.error('[VTA native recovery] Startseite',err)}
    requestAnimationFrame(()=>{
      const dashboard=document.querySelector('#dashboard');
      const usable=dashboard&&!dashboard.classList.contains('hidden')&&dashboard.childElementCount>0&&dashboard.textContent.trim();
      if(!usable)showLocalHomeFallback(error||new Error('Dashboard blieb leer.'));
      else{activateBottom('today');removeStaleScrollLocks()}
    });
  }

  function openTasks(){
    removeStaleScrollLocks(true);
    let error=null;
    try{invokeSidebarRoute('[data-global-view="tasks-global"]')}
    catch(err){error=err;console.error('[VTA native recovery] Vorgänge',err)}
    requestAnimationFrame(()=>{
      const appView=document.querySelector('#applicationView');
      const usable=appView&&!appView.classList.contains('hidden')&&Boolean(appView.querySelector('.global-task-list'));
      if(!usable)showLocalTasksFallback(error||new Error('Vorgangsansicht blieb leer.'));
      else{activateBottom('tasks');removeStaleScrollLocks()}
    });
  }

  function captureBottomNavigation(event){
    const button=event.target.closest?.('[data-vta-bottom]');
    if(!button)return;
    const target=button.dataset.vtaBottom;
    if(target!=='today'&&target!=='tasks')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target==='today'?openHome():openTasks();
  }

  function keepPlantScrollingAvailable(){
    if(!document.querySelector('.plant-subnav'))return;
    removeStaleScrollLocks();
    document.documentElement.classList.add('native-plant-scroll-ready');
  }

  function initialize(){
    document.addEventListener('click',captureBottomNavigation,true);
    const observer=new MutationObserver(()=>keepPlantScrollingAvailable());
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    window.addEventListener('pageshow',()=>{removeStaleScrollLocks();keepPlantScrollingAvailable()});
    window.addEventListener('popstate',()=>setTimeout(()=>{removeStaleScrollLocks();keepPlantScrollingAvailable()},0));
    keepPlantScrollingAvailable();
    console.info('[VTA native navigation recovery] ready',{build:BUILD});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
