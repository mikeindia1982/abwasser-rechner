(()=>{
  'use strict';
  if(globalThis.__ABWASSER_PREVIEW_TENANT__==='platform')return;

  const MODE_KEY='vta-workspace-mode-v01';
  const PROFILE_KEY='abwasser-employee-profile-v087';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const ORG_ACTIVE_KEY='vta-demo-organization-active-v01';
  const ORG_ACTIVE_USER_KEY='vta-demo-active-user-v01';
  const ORG_CONTEXT_KEY='vta-demo-organization-previous-context-v01';
  const ORG_OPEN_KEY='vta-demo-open-cockpit-v01';
  const RUNTIME_JS='js/demo-organization.js?v=0.11.0-alpha.33';
  const RUNTIME_CSS='demo-organization.css?v=0.11.0-alpha.33';

  const ADMIN_PROFILE={
    schemaVersion:1,
    firstName:'Julia',
    lastName:'Schneider',
    jobTitle:'Leitung Digitale Prozesse',
    company:'VTA',
    department:'Administration',
    employeeNumber:'DEMO-1001',
    region:'Alle Regionen',
    branch:'Deutschland',
    email:'julia.schneider@example.com',
    mobile:'+49 170 5551001',
    phone:'+49 89 5551000',
    website:'https://www.vta.cc',
    street:'Musterweg 10',
    postalCode:'80000',
    city:'Deutschland',
    country:'Deutschland',
    notes:'Fiktiver Demo-Benutzer · Rolle: Administrator.'
  };

  let runtimePromise=null;

  function isDemo(){return localStorage.getItem(MODE_KEY)==='demo'}
  function isOrganizationActive(){return localStorage.getItem(ORG_ACTIVE_KEY)==='1'}

  function savePreviousContext(){
    if(localStorage.getItem(ORG_CONTEXT_KEY))return;
    const context={
      profile:localStorage.getItem(PROFILE_KEY),
      activePlant:localStorage.getItem(ACTIVE_PLANT_KEY)
    };
    localStorage.setItem(ORG_CONTEXT_KEY,JSON.stringify(context));
  }

  function restorePreviousContext(){
    const raw=localStorage.getItem(ORG_CONTEXT_KEY);
    if(!raw)return;
    try{
      const context=JSON.parse(raw);
      if(context.profile===null||context.profile===undefined)localStorage.removeItem(PROFILE_KEY);
      else localStorage.setItem(PROFILE_KEY,String(context.profile));
      if(context.activePlant===null||context.activePlant===undefined)localStorage.removeItem(ACTIVE_PLANT_KEY);
      else localStorage.setItem(ACTIVE_PLANT_KEY,String(context.activePlant));
    }catch(error){
      console.warn('Demo-Organisation: vorheriger Kontext konnte nicht wiederhergestellt werden.',error);
    }
  }

  function clearOrganizationSession({restore=true}={}){
    if(restore)restorePreviousContext();
    localStorage.removeItem(ORG_ACTIVE_KEY);
    localStorage.removeItem(ORG_ACTIVE_USER_KEY);
    localStorage.removeItem(ORG_CONTEXT_KEY);
    try{sessionStorage.removeItem(ORG_OPEN_KEY)}catch{}
  }

  function prepareAdminProfile(){
    if(!isDemo()||!isOrganizationActive())return;
    if(localStorage.getItem(ORG_ACTIVE_USER_KEY))return;
    localStorage.setItem(ORG_ACTIVE_USER_KEY,'julia');
    localStorage.setItem(PROFILE_KEY,JSON.stringify(ADMIN_PROFILE));
  }

  function launcher(){return document.querySelector('#demoOrganizationLauncher')}

  function updateLauncher(){
    const button=launcher();
    if(!button)return;
    const visible=isDemo()&&!isOrganizationActive();
    button.classList.toggle('hidden',!visible);
    button.disabled=false;
    button.removeAttribute('aria-busy');
  }

  function activateOrganization(){
    if(!isDemo())return;
    savePreviousContext();
    localStorage.setItem(ORG_ACTIVE_KEY,'1');
    localStorage.removeItem(ORG_ACTIVE_USER_KEY);
    localStorage.setItem(PROFILE_KEY,JSON.stringify(ADMIN_PROFILE));
    localStorage.setItem(ORG_ACTIVE_USER_KEY,'julia');
    try{sessionStorage.setItem(ORG_OPEN_KEY,'1')}catch{}
    const button=launcher();
    if(button){button.disabled=true;button.setAttribute('aria-busy','true')}
    location.reload();
  }

  function leaveOrganization({reload=true}={}){
    clearOrganizationSession({restore:true});
    if(reload)location.reload();
  }

  function loadCss(){
    const existing=document.querySelector('link[data-demo-organization-runtime]');
    if(existing)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=RUNTIME_CSS;
      link.dataset.demoOrganizationRuntime='true';
      link.addEventListener('load',()=>resolve(),{once:true});
      link.addEventListener('error',()=>reject(new Error('Admin-Demo CSS konnte nicht geladen werden.')),{once:true});
      document.head.appendChild(link);
    });
  }

  function evaluateRuntime(code){
    const NativeMutationObserver=window.MutationObserver;
    class DemoOrganizationNoopObserver{
      observe(){}
      disconnect(){}
      takeRecords(){return []}
    }
    window.MutationObserver=DemoOrganizationNoopObserver;
    try{
      const run=new Function(`${code}\n//# sourceURL=js/demo-organization.js`);
      run.call(window);
    }finally{
      window.MutationObserver=NativeMutationObserver;
    }
  }

  function ensureExitButton(){
    const banner=document.querySelector('#demoWorkspaceBanner');
    const actions=banner?.querySelector('div:last-child');
    if(!actions||actions.querySelector('[data-demo-org-exit]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.demoOrgExit='true';
    button.textContent='Organisation verlassen';
    actions.insertBefore(button,actions.firstChild);
  }

  function openCockpit(){
    const adminNav=document.querySelector('[data-demo-org-nav]');
    if(adminNav){
      launcher()?.classList.add('hidden');
      adminNav.click();
      ensureExitButton();
      return true;
    }
    return false;
  }

  function loadRuntime(){
    if(!isDemo()||!isOrganizationActive())return Promise.resolve(false);
    if(runtimePromise)return runtimePromise;
    const started=performance.now();
    runtimePromise=Promise.all([
      loadCss(),
      fetch(RUNTIME_JS,{cache:'force-cache'}).then(response=>{
        if(!response.ok)throw new Error(`Admin-Demo JavaScript konnte nicht geladen werden (${response.status}).`);
        return response.text();
      })
    ]).then(([,code])=>{
      evaluateRuntime(code);
      window.__vtaDemoOrganizationLoadMs=Math.round(performance.now()-started);
      requestAnimationFrame(()=>{
        if(!openCockpit())setTimeout(openCockpit,80);
      });
      return true;
    }).catch(error=>{
      console.error('Demo-Organisation konnte nicht geladen werden.',error);
      clearOrganizationSession({restore:true});
      alert('Die Demo-Organisation konnte nicht geladen werden. Die normale Demo-Umgebung wird wiederhergestellt.');
      location.reload();
      return false;
    });
    return runtimePromise;
  }

  if(!isDemo()&&isOrganizationActive())clearOrganizationSession({restore:false});
  prepareAdminProfile();

  document.addEventListener('click',event=>{
    if(!isDemo()||!isOrganizationActive())return;

    const profileButton=event.target.closest?.('#profileButton');
    if(profileButton){
      const switchButton=document.querySelector('[data-demo-user-switch]');
      if(switchButton){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        switchButton.click();
      }
      return;
    }

    const productionExit=event.target.closest?.('[data-demo-exit]');
    if(productionExit){
      clearOrganizationSession({restore:true});
    }
  },true);

  document.addEventListener('click',event=>{
    const launch=event.target.closest?.('#demoOrganizationLauncher');
    if(launch){
      event.preventDefault();
      activateOrganization();
      return;
    }
    if(event.target.closest?.('[data-demo-org-exit]')){
      event.preventDefault();
      leaveOrganization({reload:true});
    }
  });

  function initialize(){
    updateLauncher();
    if(isDemo()&&isOrganizationActive())loadRuntime();
  }

  document.addEventListener('DOMContentLoaded',initialize,{once:true});
  window.addEventListener('pageshow',()=>{
    updateLauncher();
    if(isDemo()&&isOrganizationActive())loadRuntime();
  });
  if(document.readyState!=='loading')initialize();

  window.VTADemoOrganization={
    activate:activateOrganization,
    leave:leaveOrganization,
    load:loadRuntime,
    isActive:isOrganizationActive
  };
})();