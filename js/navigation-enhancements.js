(()=>{
  'use strict';

  const MODE_KEY='vta-workspace-mode-v01';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const STORAGE_PREFIX='vta-navigation-state';
  const MAX_INDEX_KEY='vta-navigation-max-index-v01';

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

    // app.js initialisiert seine History erst beim ersten setView(). Danach kann
    // der gespeicherte Zustand über den bereits vorhandenen popstate-Handler
    // ohne direkten Zugriff auf modulinterne Funktionen wiederhergestellt werden.
    if(!history.state?.appNav){
      setTimeout(restoreBootTarget,60);
      return;
    }

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

  function initialize(){
    bindControls();
    if(organizationActive())return;

    // Für bestehende Installationen ohne gespeicherten Detailzustand bleibt die
    // bisherige globale Seite erhalten. Ab diesem Release wird jeder weitere
    // Navigationszustand vollständig gespeichert.
    if(!bootTarget){
      const globalPage=localStorage.getItem(GLOBAL_PAGE_KEY)||'today';
      window.__vtaNavigationInitialGlobalPage=globalPage;
    }

    let attempts=0;
    const waitForApp=()=>{
      restoreBootTarget();
      if(restorationFinished||attempts>=40)return;
      attempts+=1;
      setTimeout(waitForApp,75);
    };
    waitForApp();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
