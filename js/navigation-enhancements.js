(()=>{
  'use strict';

  const MODE_KEY='vta-workspace-mode-v01';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const STORAGE_PREFIX='vta-navigation-state';
  const MAX_INDEX_KEY='vta-navigation-max-index-v01';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PLANTS_KEY='abwasser-plants-v07';

  const nativePushState=history.pushState.bind(history);
  const nativeReplaceState=history.replaceState.bind(history);

  const workspaceMode=()=>localStorage.getItem(MODE_KEY)==='demo'?'demo':'production';
  const storageKey=()=>`${STORAGE_PREFIX}-${workspaceMode()}-v01`;
  const organizationActive=()=>localStorage.getItem(ORG_ACTIVE_KEY)==='1';

  function parse(value,fallback=null){
    try{return JSON.parse(value)||fallback}catch{return fallback}
  }

  function storedNavigation(){
    const fromHistory=history.state?.appNav?history.state:null;
    if(fromHistory)return fromHistory;
    const stored=parse(localStorage.getItem(storageKey()),null);
    return stored?.appNav?stored:null;
  }

  const bootTarget=organizationActive()?null:storedNavigation();
  window.__vtaNavigationRestoreTarget=bootTarget;

  let currentIndex=Number.isFinite(Number(history.state?.__vtaNavIndex))?Number(history.state.__vtaNavIndex):0;
  let maxIndex=Math.max(currentIndex,Number(sessionStorage.getItem(MAX_INDEX_KEY)||currentIndex)||0);
  let controlsBound=false;
  let restorationFinished=false;
  let bottomNavigationBound=false;
  let bottomNavigationObserver=null;

  function persistNavigation(state){
    if(!state?.appNav||organizationActive())return;
    try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch{}
  }

  function setMaxIndex(value){
    maxIndex=Math.max(0,Number(value)||0);
    try{sessionStorage.setItem(MAX_INDEX_KEY,String(maxIndex))}catch{}
  }

  function updateControls(){
    const back=document.querySelector('#vtaNavigationBack');
    const forward=document.querySelector('#vtaNavigationForward');
    if(back)back.disabled=currentIndex<=0;
    if(forward)forward.disabled=currentIndex>=maxIndex;
    updateBottomNavigation();
  }

  history.pushState=(state,title,url)=>{
    if(state?.appNav){
      currentIndex+=1;
      setMaxIndex(currentIndex);
      state={...state,__vtaNavIndex:currentIndex};
      persistNavigation(state);
    }
    const result=nativePushState(state,title,url);
    queueMicrotask(updateControls);
    return result;
  };

  history.replaceState=(state,title,url)=>{
    if(state?.appNav){
      state={...state,__vtaNavIndex:currentIndex};
      persistNavigation(state);
    }
    const result=nativeReplaceState(state,title,url);
    queueMicrotask(updateControls);
    return result;
  };

  window.addEventListener('popstate',event=>{
    if(event.state?.appNav){
      currentIndex=Number.isFinite(Number(event.state.__vtaNavIndex))?Number(event.state.__vtaNavIndex):currentIndex;
      persistNavigation(event.state);
    }
    queueMicrotask(updateControls);
  });

  window.addEventListener('pagehide',()=>persistNavigation(history.state));

  function bindControls(){
    if(controlsBound)return;
    const topbarLeft=document.querySelector('.topbar-left');
    const breadcrumbHome=document.querySelector('#breadcrumbHome');
    if(!topbarLeft||!breadcrumbHome)return;

    const controls=document.createElement('div');
    controls.className='navigation-history-controls';
    controls.setAttribute('aria-label','Seitennavigation');
    controls.innerHTML=`<button id="vtaNavigationBack" class="navigation-history-button" type="button" aria-label="Zurück" title="Zurück">‹</button><button id="vtaNavigationForward" class="navigation-history-button" type="button" aria-label="Vor" title="Vor">›</button>`;
    topbarLeft.insertBefore(controls,breadcrumbHome);
    controls.querySelector('#vtaNavigationBack').addEventListener('click',()=>history.back());
    controls.querySelector('#vtaNavigationForward').addEventListener('click',()=>history.forward());
    controlsBound=true;
    updateControls();
  }

  function sameNavigation(a,b){
    if(!a?.appNav||!b?.appNav)return false;
    const fields=['view','activePlantId','globalPage','plantPage','category','query','selected','favoritesOnly'];
    return fields.every(field=>(a[field]??'')===(b[field]??''));
  }

  function restoreBootTarget(){
    if(restorationFinished||organizationActive())return;
    bindControls();

    if(!bootTarget?.appNav){
      restorationFinished=true;
      return;
    }

    if(!history.state?.appNav)return;

    if(sameNavigation(history.state,bootTarget)){
      restorationFinished=true;
      persistNavigation(history.state);
      return;
    }

    const targetIndex=Number.isFinite(Number(bootTarget.__vtaNavIndex))?Number(bootTarget.__vtaNavIndex):currentIndex;
    currentIndex=targetIndex;
    setMaxIndex(Math.max(maxIndex,currentIndex));
    const target={...bootTarget,__vtaNavIndex:currentIndex};
    nativeReplaceState(target,'',location.href);
    persistNavigation(target);
    window.dispatchEvent(new PopStateEvent('popstate',{state:target}));
    restorationFinished=true;
    updateControls();
  }

  function clickExisting(selector){
    const target=document.querySelector(selector);
    if(!target)return false;
    target.click();
    return true;
  }

  function waitFor(selector,callback,{attempts=30,delay=60}={}){
    let count=0;
    const tick=()=>{
      const target=document.querySelector(selector);
      if(target){callback(target);return}
      count+=1;
      if(count<attempts)setTimeout(tick,delay);
    };
    tick();
  }

  function activePlantId(){
    return document.querySelector('#activePlantSelect')?.value||localStorage.getItem(ACTIVE_PLANT_KEY)||history.state?.activePlantId||'';
  }

  function activeVisitId(){
    const plantId=activePlantId();
    if(!plantId)return'';
    const plants=parse(localStorage.getItem(PLANTS_KEY),[]);
    const plant=Array.isArray(plants)?plants.find(item=>item?.id===plantId):null;
    const visits=Array.isArray(plant?.visits)?plant.visits:[];
    const active=visits.find(visit=>visit?.modeStatus==='active');
    return active?.id||'';
  }

  function openActivePlant(callback){
    const plantId=activePlantId();
    if(!plantId){
      clickExisting('[data-primary-view="plants"]');
      return;
    }

    if(document.querySelector('#startVisit')||document.querySelector('.plant-page')){
      callback?.();
      return;
    }

    clickExisting('[data-primary-view="plants"]');
    waitFor(`[data-open-plant="${CSS.escape(plantId)}"]`,button=>{
      button.click();
      if(callback)setTimeout(callback,40);
    });
  }

  function openVisitShortcut(){
    closeMoreSheet();

    if(document.querySelector('.visit-mode-header')||document.querySelector('#finishVisit')){
      window.scrollTo({top:0,behavior:'smooth'});
      updateBottomNavigation('visit');
      return;
    }

    const visitId=activeVisitId();
    if(visitId){
      openActivePlant(()=>{
        const visitsTab=document.querySelector('[data-plant-page="visits"]');
        if(visitsTab)visitsTab.click();
        waitFor(`[data-open-visit="${CSS.escape(visitId)}"]`,button=>button.click());
      });
      return;
    }

    const directStart=document.querySelector('#startVisit');
    if(directStart){directStart.click();return}

    openActivePlant(()=>waitFor('#startVisit',button=>button.click()));
  }

  function navigateBottom(target){
    closeMoreSheet();
    if(target==='today')clickExisting('[data-global-view="today"]');
    else if(target==='plants')clickExisting('[data-primary-view="plants"]');
    else if(target==='visit')openVisitShortcut();
    else if(target==='tasks')clickExisting('[data-global-view="tasks-global"]');
    else if(target==='more')openMoreSheet();
  }

  const MORE_ITEMS=[
    ['documents','Dokumente','▤','[data-global-view="documents"]'],
    ['products','Produkte','◇','[data-global-view="products"]'],
    ['tenders','Ausschreibungen','⚑','[data-global-view="tenders"]'],
    ['appointments','Termine','□','[data-global-view="appointments"]'],
    ['calculators','Rechner','∑','[data-primary-view="calculators"]'],
    ['profile','Mitarbeiterprofil','○','#profileButton'],
    ['backup','Backup','⇩','[data-global-view="backup"]'],
    ['settings','Einstellungen','⚙','[data-global-view="settings"]'],
    ['system','Info & System','i','[data-global-view="system"]']
  ];

  function buildBottomNavigation(){
    if(bottomNavigationBound)return;
    const appLayout=document.querySelector('.app-layout');
    if(!appLayout)return;

    const navigation=document.createElement('nav');
    navigation.className='vta-bottom-navigation';
    navigation.setAttribute('aria-label','Mobile Hauptnavigation');
    navigation.innerHTML=`
      <button type="button" data-vta-bottom="today"><span class="vta-bottom-icon">⌂</span><strong>Start</strong></button>
      <button type="button" data-vta-bottom="plants"><span class="vta-bottom-icon">KA</span><strong>Anlagen</strong></button>
      <button type="button" data-vta-bottom="visit" class="vta-bottom-visit"><span class="vta-bottom-icon">▶</span><strong>Besuch</strong></button>
      <button type="button" data-vta-bottom="tasks"><span class="vta-bottom-icon">✓</span><strong>Vorgänge</strong></button>
      <button type="button" data-vta-bottom="more"><span class="vta-bottom-icon">•••</span><strong>Mehr</strong></button>`;

    const backdrop=document.createElement('div');
    backdrop.className='vta-more-backdrop';
    backdrop.hidden=true;

    const sheet=document.createElement('section');
    sheet.className='vta-more-sheet';
    sheet.hidden=true;
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-label','Weitere Bereiche');
    sheet.innerHTML=`<div class="vta-more-handle" aria-hidden="true"></div><div class="vta-more-heading"><div><span>VTA Copilot</span><h2>Weitere Bereiche</h2></div><button type="button" class="vta-more-close" aria-label="Schließen">×</button></div><div class="vta-more-grid">${MORE_ITEMS.map(([id,label,icon])=>`<button type="button" data-vta-more="${id}"><span>${icon}</span><strong>${label}</strong></button>`).join('')}</div>`;

    appLayout.append(backdrop,sheet,navigation);

    navigation.querySelectorAll('[data-vta-bottom]').forEach(button=>button.addEventListener('click',()=>navigateBottom(button.dataset.vtaBottom)));
    sheet.querySelector('.vta-more-close')?.addEventListener('click',closeMoreSheet);
    backdrop.addEventListener('click',closeMoreSheet);
    sheet.querySelectorAll('[data-vta-more]').forEach(button=>button.addEventListener('click',()=>{
      const item=MORE_ITEMS.find(([id])=>id===button.dataset.vtaMore);
      closeMoreSheet();
      if(item)clickExisting(item[3]);
    }));

    bottomNavigationBound=true;
    updateBottomNavigation();
  }

  function openMoreSheet(){
    buildBottomNavigation();
    const sheet=document.querySelector('.vta-more-sheet');
    const backdrop=document.querySelector('.vta-more-backdrop');
    if(!sheet||!backdrop)return;
    sheet.hidden=false;
    backdrop.hidden=false;
    requestAnimationFrame(()=>{
      sheet.classList.add('open');
      backdrop.classList.add('open');
    });
    document.body.classList.add('vta-more-open');
    updateBottomNavigation('more');
  }

  function closeMoreSheet(){
    const sheet=document.querySelector('.vta-more-sheet');
    const backdrop=document.querySelector('.vta-more-backdrop');
    if(!sheet||!backdrop)return;
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('vta-more-open');
    setTimeout(()=>{
      if(!sheet.classList.contains('open'))sheet.hidden=true;
      if(!backdrop.classList.contains('open'))backdrop.hidden=true;
    },180);
    queueMicrotask(()=>updateBottomNavigation());
  }

  function navigationSection(){
    if(document.querySelector('.visit-mode-header')||document.querySelector('#finishVisit'))return'visit';
    const state=history.state||{};
    const view=String(state.view||'');
    const globalPage=String(state.globalPage||'');

    if(view==='dashboard'||globalPage==='today')return'today';
    if(globalPage==='tasks-global'||view==='global-tasks-global')return'tasks';
    if(['plants','plantForm','plantDashboard','limits','traffic'].includes(view))return'plants';
    if(view.startsWith('global-')||globalPage)return'more';
    if(document.querySelector('#applicationView:not(.hidden) .plant-shell-header'))return'plants';
    if(document.querySelector('#dashboard:not(.hidden)'))return'today';
    return'today';
  }

  function updateBottomNavigation(force=''){
    if(!bottomNavigationBound)return;
    const active=force||navigationSection();
    document.querySelectorAll('[data-vta-bottom]').forEach(button=>{
      const selected=button.dataset.vtaBottom===active;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-current',selected?'page':'false');
    });

    const visitId=activeVisitId();
    const visitLabel=document.querySelector('[data-vta-bottom="visit"] strong');
    const nextVisitLabel=visitId?'Fortsetzen':'Besuch';
    if(visitLabel&&visitLabel.textContent!==nextVisitLabel)visitLabel.textContent=nextVisitLabel;
  }

  function polishCurrentView(){
    const route=document.querySelector('#openNavigation');
    if(route&&route.textContent.trim()==='Navigation')route.textContent='Route starten';

    document.querySelectorAll('[data-plant-page="visits"]').forEach(button=>{
      if(button.textContent.trim()==='Einsätze')button.textContent='Aktivitäten';
    });
    document.querySelectorAll('[data-plant-page="tasks"]').forEach(button=>{
      if(button.textContent.trim()==='Aufgaben')button.textContent='Vorgänge';
    });

    updateBottomNavigation();
  }

  function observeNavigationUI(){
    if(bottomNavigationObserver)return;
    const target=document.querySelector('.app-layout');
    if(!target)return;
    bottomNavigationObserver=new MutationObserver(()=>{
      polishCurrentView();
    });
    bottomNavigationObserver.observe(target,{subtree:true,childList:true});
  }

  function initialize(){
    bindControls();
    buildBottomNavigation();
    observeNavigationUI();
    polishCurrentView();
    if(organizationActive())return;

    if(!bootTarget){
      const globalPage=localStorage.getItem(GLOBAL_PAGE_KEY)||'today';
      window.__vtaNavigationInitialGlobalPage=globalPage;
    }

    let attempts=0;
    const waitForApp=()=>{
      restoreBootTarget();
      polishCurrentView();
      if(restorationFinished||attempts>=80)return;
      attempts+=1;
      setTimeout(waitForApp,75);
    };
    waitForApp();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();