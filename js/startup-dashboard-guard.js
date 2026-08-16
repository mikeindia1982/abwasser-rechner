(()=>{
  'use strict';

  const GLOBAL_PAGE_KEY='abwasser-global-page-v091b';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  let recoveryAttempted=false;

  function shouldRecover(){
    if(localStorage.getItem(ORG_ACTIVE_KEY)==='1')return false;
    const requested=localStorage.getItem(GLOBAL_PAGE_KEY)||'today';
    if(requested!=='today')return false;
    const dashboard=document.querySelector('#dashboard');
    if(!dashboard||dashboard.classList.contains('hidden'))return false;
    return dashboard.childElementCount===0&&!dashboard.textContent.trim();
  }

  function fallback(){
    const dashboard=document.querySelector('#dashboard');
    if(!dashboard||dashboard.childElementCount)return;
    dashboard.innerHTML=`<section class="today-dashboard-hero"><div><p class="eyebrow">Startseite</p><h1>VTA Copilot</h1><p>Die Startseite konnte noch nicht vollständig initialisiert werden.</p></div><div class="today-dashboard-actions"><button class="button primary" type="button" data-startup-retry>Startseite erneut laden</button></div></section>`;
    dashboard.querySelector('[data-startup-retry]')?.addEventListener('click',()=>{
      dashboard.innerHTML='';
      recoveryAttempted=false;
      recover();
    });
  }

  function recover(){
    if(!shouldRecover()||recoveryAttempted)return;
    recoveryAttempted=true;
    const home=document.querySelector('#homeButton');
    try{
      if(typeof home?.onclick==='function')home.onclick();
      else home?.click();
    }catch(error){
      console.error('Startseite konnte nicht nachgeladen werden.',error);
    }
    requestAnimationFrame(()=>{
      if(shouldRecover())fallback();
    });
  }

  window.addEventListener('load',()=>{
    setTimeout(recover,250);
    setTimeout(()=>{
      if(shouldRecover()){
        recoveryAttempted=false;
        recover();
      }
    },1500);
  },{once:true});
})();
