(()=>{
  'use strict';

  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  const MAX_ATTEMPTS=6;
  let attempts=0;
  let finished=false;

  function organizationActive(){
    return localStorage.getItem(ORG_ACTIVE_KEY)==='1';
  }

  function forceTodayAsStartupPage(){
    if(organizationActive())return;
    try{localStorage.setItem(GLOBAL_PAGE_KEY,'today')}catch{}
  }

  function dashboardHasContent(){
    const dashboard=document.querySelector('#dashboard');
    return Boolean(dashboard&&dashboard.childElementCount>0&&dashboard.textContent.trim());
  }

  function fallback(){
    if(organizationActive()||dashboardHasContent())return;
    const dashboard=document.querySelector('#dashboard');
    if(!dashboard)return;
    dashboard.classList.remove('hidden');
    document.querySelector('#applicationView')?.classList.add('hidden');
    document.querySelector('#calculatorView')?.classList.add('hidden');
    dashboard.innerHTML=`<section class="today-dashboard-hero"><div><p class="eyebrow">Startseite</p><h1>VTA Copilot</h1><p>Die persönliche Startseite konnte nicht vollständig aufgebaut werden.</p></div><div class="today-dashboard-actions"><button class="button primary" type="button" data-startup-retry>Startseite erneut laden</button></div></section>`;
    dashboard.querySelector('[data-startup-retry]')?.addEventListener('click',()=>{
      dashboard.innerHTML='';
      attempts=0;
      finished=false;
      openHome();
    });
  }

  function openHome(){
    if(finished||organizationActive())return;
    forceTodayAsStartupPage();

    const dashboard=document.querySelector('#dashboard');
    const home=document.querySelector('#homeButton');
    if(dashboard){
      dashboard.classList.remove('hidden');
      document.querySelector('#applicationView')?.classList.add('hidden');
      document.querySelector('#calculatorView')?.classList.add('hidden');
    }

    try{
      if(typeof home?.onclick==='function')home.onclick();
      else home?.click();
    }catch(error){
      console.error('Startseite konnte beim Start nicht geöffnet werden.',error);
    }

    requestAnimationFrame(()=>{
      if(dashboardHasContent()){
        finished=true;
        return;
      }
      attempts+=1;
      if(attempts>=MAX_ATTEMPTS){
        fallback();
        return;
      }
      const delays=[40,100,220,450,900,1500];
      setTimeout(openHome,delays[Math.min(attempts,delays.length-1)]);
    });
  }

  // Der Loader steht vor app.js. Dadurch liest auch bootstrap() auf jedem echten
  // App-Start bereits "today" und nicht die zuletzt geöffnete globale Seite.
  forceTodayAsStartupPage();

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',openHome,{once:true});
  }else{
    openHome();
  }
  window.addEventListener('load',()=>{if(!finished)openHome()},{once:true});
})();
