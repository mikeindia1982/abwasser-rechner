(()=>{
  'use strict';
  const BUILD='0.11.0-alpha.56-commercial-ui1';
  let scheduled=false;

  function syncCustomerFilterVisibility(){
    const filter=document.querySelector('[data-commercial-filter]');
    const mapPanel=document.querySelector('#plantsMapPanel');
    if(!filter||!mapPanel)return;
    filter.hidden=!mapPanel.classList.contains('hidden');
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;syncCustomerFilterVisibility()});
  }

  document.addEventListener('change',event=>{
    const status=event.target.closest?.('[data-customer-field="status"]');
    if(!status)return;
    const card=status.closest('#commercialCustomerCard');
    const since=card?.querySelector('[data-customer-field="statusSince"]');
    if(since)since.value='';
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#plantsMapViewButton,#plantsListViewButton'))requestAnimationFrame(queue);
  },true);

  const root=document.querySelector('#mainContent')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
  globalThis.AbwasserCommercialUiGuard=Object.freeze({build:BUILD,refresh:queue});
})();
