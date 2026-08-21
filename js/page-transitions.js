(()=>{
  'use strict';

  const BUILD='0.11.0-alpha.75-page-transitions1';
  const MAIN_SELECTOR='#mainContent';
  const NAV_SELECTOR=[
    '[data-vta-bottom]',
    '[data-global-view]',
    '[data-primary-view]',
    '[data-plant-page]',
    '[data-jump-page]',
    '[data-open-plant]',
    '[data-open-visit]',
    '#homeButton',
    '#breadcrumbHome',
    '#managePlantsButton',
    '#newPlantButton',
    '#editPlant',
    '#editPlantMasterData',
    '#startVisit',
    '#profileButton',
    '#profileMenuButton'
  ].join(',');
  const PLANT_TABS=['overview','schema','technology','visits','sales','tasks','record'];
  const BOTTOM_TABS=['today','plants','visit','tasks'];
  const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const supported=()=>typeof document.startViewTransition==='function';
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  let activeTransition=null;
  let bypassClick=false;
  let bypassPopState=false;
  let lastHistoryIndex=Number.isFinite(Number(history.state?.__vtaNavIndex))?Number(history.state.__vtaNavIndex):0;
  const bootStarted=performance.now();

  function transitionKindFor(target){
    if(target.matches('[data-vta-bottom]')){
      const requested=target.dataset.vtaBottom||'';
      if(requested==='more')return null;
      if(requested==='visit')return 'focus';
      const current=document.querySelector('[data-vta-bottom].active')?.dataset.vtaBottom||'';
      const from=BOTTOM_TABS.indexOf(current),to=BOTTOM_TABS.indexOf(requested);
      if(from>=0&&to>=0&&from!==to)return to<from?'back':'forward';
      return 'forward';
    }
    if(target.matches('[data-plant-page]')){
      const requested=target.dataset.plantPage||'';
      const current=document.querySelector('[data-plant-page].active')?.dataset.plantPage||history.state?.plantPage||'';
      const from=PLANT_TABS.indexOf(current),to=PLANT_TABS.indexOf(requested);
      if(requested===current)return null;
      if(from>=0&&to>=0)return to<from?'tab-back':'tab-forward';
      return 'tab-forward';
    }
    if(target.matches('#homeButton,#breadcrumbHome'))return 'back';
    if(target.matches('#startVisit,[data-open-visit]'))return 'focus';
    if(target.matches('[data-open-plant],#newPlantButton,#editPlant,#editPlantMasterData'))return 'forward';
    if(target.matches('[data-global-view],[data-primary-view],[data-jump-page],#managePlantsButton,#profileButton,#profileMenuButton')){
      if(target.classList.contains('active')||target.getAttribute('aria-current')==='page')return null;
      return 'forward';
    }
    return 'forward';
  }

  function settleDelay(target,kind){
    if(kind==='focus'&&target?.matches('[data-vta-bottom="visit"]'))return 180;
    if(target?.matches('[data-vta-bottom]'))return 45;
    return 0;
  }

  function setKind(kind){
    document.documentElement.dataset.vtaTransition=kind||'forward';
  }
  function clearKind(){
    delete document.documentElement.dataset.vtaTransition;
  }

  function fallbackEnter(kind){
    const main=document.querySelector(MAIN_SELECTOR);
    if(!main||reducedMotion())return;
    main.dataset.vtaFallbackTransition=kind||'forward';
    main.classList.remove('vta-transition-fallback-enter');
    void main.offsetWidth;
    main.classList.add('vta-transition-fallback-enter');
    const cleanup=()=>{
      main.classList.remove('vta-transition-fallback-enter');
      delete main.dataset.vtaFallbackTransition;
      main.removeEventListener('animationend',cleanup);
    };
    main.addEventListener('animationend',cleanup);
    setTimeout(cleanup,320);
  }

  function run(kind,update,{settleMs=0}={}){
    const execute=async()=>{
      const result=update?.();
      if(result&&typeof result.then==='function')await result;
      if(settleMs>0)await wait(settleMs);
      else await nextFrame();
    };

    if(activeTransition||!supported()||reducedMotion()){
      const result=Promise.resolve().then(execute);
      result.then(()=>fallbackEnter(kind)).catch(()=>{});
      return result;
    }

    setKind(kind);
    const transition=document.startViewTransition(execute);
    activeTransition=transition;
    transition.finished.catch(()=>{}).finally(()=>{
      if(activeTransition===transition)activeTransition=null;
      clearKind();
    });
    return transition.finished;
  }

  function replayClick(target,kind){
    return run(kind,()=>{
      bypassClick=true;
      try{target.click()}finally{bypassClick=false}
    },{settleMs:settleDelay(target,kind)});
  }

  document.addEventListener('click',event=>{
    if(bypassClick||activeTransition||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const target=event.target instanceof Element?event.target.closest(NAV_SELECTOR):null;
    if(!target||target.matches(':disabled,[aria-disabled="true"],[data-no-page-transition]'))return;
    if(target.matches('[data-vta-bottom="more"]'))return;
    const kind=transitionKindFor(target);
    if(!kind)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    replayClick(target,kind);
  },true);

  const originalPushState=history.pushState.bind(history);
  const originalReplaceState=history.replaceState.bind(history);
  history.pushState=(state,title,url)=>{
    const result=originalPushState(state,title,url);
    if(Number.isFinite(Number(history.state?.__vtaNavIndex)))lastHistoryIndex=Number(history.state.__vtaNavIndex);
    return result;
  };
  history.replaceState=(state,title,url)=>{
    const result=originalReplaceState(state,title,url);
    if(Number.isFinite(Number(history.state?.__vtaNavIndex)))lastHistoryIndex=Number(history.state.__vtaNavIndex);
    return result;
  };

  window.addEventListener('popstate',event=>{
    const targetIndex=Number.isFinite(Number(event.state?.__vtaNavIndex))?Number(event.state.__vtaNavIndex):lastHistoryIndex;
    const kind=targetIndex<lastHistoryIndex?'back':'forward';
    if(bypassPopState||activeTransition||performance.now()-bootStarted<650||!supported()||reducedMotion()){
      lastHistoryIndex=targetIndex;
      return;
    }

    event.stopImmediatePropagation();
    const state=event.state;
    run(kind,()=>{
      bypassPopState=true;
      try{window.dispatchEvent(new PopStateEvent('popstate',{state}))}
      finally{bypassPopState=false}
    },{settleMs:45}).finally(()=>{lastHistoryIndex=targetIndex});
  });

  globalThis.VTAPageTransitions=Object.freeze({
    build:BUILD,
    supported:supported(),
    reducedMotion:reducedMotion(),
    run:(kind,callback)=>run(kind,callback)
  });
})();
