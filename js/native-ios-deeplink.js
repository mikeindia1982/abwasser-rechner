(()=>{
  'use strict';

  const runtime=globalThis.VTANativeRuntime;
  if(!runtime?.enabled)return;

  const PENDING_KEY='vta-native-pending-navigation-v1';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
  const LocalNotifications=globalThis.Capacitor?.Plugins?.LocalNotifications;
  let restoreTimer=null;
  let restoreAttempts=0;

  function readPending(){
    try{return JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null')}catch{return null}
  }
  function writePending(value){
    try{sessionStorage.setItem(PENDING_KEY,JSON.stringify(value))}catch{}
  }
  function clearPending(){
    try{sessionStorage.removeItem(PENDING_KEY)}catch{}
  }

  function restorePendingDestination(){
    clearTimeout(restoreTimer);
    const pending=readPending();
    if(!pending?.plantId)return;

    const selector=document.querySelector('#activePlantSelect');
    const option=selector&&[...selector.options].find(item=>item.value===pending.plantId);
    if(selector&&option&&!selector.disabled){
      localStorage.setItem(ACTIVE_PLANT_KEY,pending.plantId);
      if(pending.page)localStorage.setItem(PLANT_PAGE_KEY,pending.page);
      selector.value=pending.plantId;
      clearPending();
      restoreAttempts=0;
      selector.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }

    restoreAttempts+=1;
    if(restoreAttempts<30)restoreTimer=setTimeout(restorePendingDestination,180);
    else{restoreAttempts=0;clearPending()}
  }

  function registerNotificationRestore(){
    if(!LocalNotifications?.addListener)return;
    LocalNotifications.addListener('localNotificationActionPerformed',event=>{
      const extra=event?.notification?.extra||event?.notification?.data||{};
      if(!extra?.vtaManaged||!extra.plantId)return;
      writePending({plantId:extra.plantId,page:extra.page||'overview',createdAt:Date.now()});
    }).catch(error=>console.warn('[VTA native] deep-link listener failed',error));
  }

  function initialize(){
    registerNotificationRestore();
    restorePendingDestination();
    const observer=new MutationObserver(()=>{if(readPending())restorePendingDestination()});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pageshow',restorePendingDestination);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
