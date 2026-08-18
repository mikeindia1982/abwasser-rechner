(()=>{
  'use strict';

  const runtime=globalThis.VTANativeRuntime;
  if(!runtime?.enabled)return;

  const ROOT=document.documentElement;
  const BUILD='0.11.0-alpha.57-native-ui2';
  const VIEW_CLASSES=[
    'native-home','native-view-plants','native-view-plant','native-view-tasks',
    'native-view-calculator','native-view-documents','native-view-map',
    'native-view-commercial','native-view-visit','native-view-form','native-history-idle'
  ];

  let queued=false;
  let lastFocused=null;

  function visible(selector){
    const node=document.querySelector(selector);
    if(!node)return false;
    if(node.classList.contains('hidden'))return false;
    return node.getClientRects().length>0;
  }

  function updateViewClasses(){
    VIEW_CLASSES.forEach(name=>ROOT.classList.remove(name));

    const isHome=visible('#dashboard')&&!visible('#applicationView')&&!visible('#calculatorView');
    ROOT.classList.toggle('native-home',isHome);
    ROOT.classList.toggle('native-view-plants',Boolean(document.querySelector('.plant-grid,#plantsMapPanel')));
    ROOT.classList.toggle('native-view-plant',Boolean(document.querySelector('.plant-subnav')));
    ROOT.classList.toggle('native-view-tasks',Boolean(document.querySelector('.global-task-list,.action-list')));
    ROOT.classList.toggle('native-view-calculator',visible('#calculatorView'));
    ROOT.classList.toggle('native-view-documents',Boolean(document.querySelector('.document-toolbar,.document-library-list,.document-detail-layout,.document-review-layout')));
    ROOT.classList.toggle('native-view-map',Boolean(document.querySelector('#plantsMapPanel:not(.hidden),.location-preview,.maplibregl-map')));
    ROOT.classList.toggle('native-view-commercial',Boolean(document.querySelector('.commercial-customer-card,.commercial-supply-section,.commercial-dashboard-panel,.commercial-notification-panel')));
    ROOT.classList.toggle('native-view-visit',Boolean(document.querySelector('.visit-panel,.visit-photo-grid,#visitPhotoInput')));
    ROOT.classList.toggle('native-view-form',Boolean(document.querySelector('form.record-form,form#plantForm,form#documentReviewForm')));

    const back=document.querySelector('#vtaNavigationBack');
    const forward=document.querySelector('#vtaNavigationForward');
    ROOT.classList.toggle('native-history-idle',Boolean(back&&forward&&back.disabled&&forward.disabled));

    ROOT.dataset.nativeUiBuild=BUILD;
  }

  function queueUpdate(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      updateViewClasses();
    });
  }

  function updateViewport(){
    const vv=window.visualViewport;
    if(!vv){
      ROOT.style.setProperty('--native-viewport-height',`${window.innerHeight}px`);
      ROOT.style.setProperty('--native-keyboard-height','0px');
      ROOT.classList.remove('native-keyboard-open');
      return;
    }
    const keyboard=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
    ROOT.style.setProperty('--native-viewport-height',`${vv.height}px`);
    ROOT.style.setProperty('--native-keyboard-height',`${Math.round(keyboard)}px`);
    ROOT.classList.toggle('native-keyboard-open',keyboard>120);
  }

  function keepFocusedControlVisible(){
    const element=lastFocused;
    if(!element||!element.isConnected)return;
    const vv=window.visualViewport;
    if(!vv)return;
    const rect=element.getBoundingClientRect();
    const safeBottom=vv.offsetTop+vv.height-18;
    const safeTop=vv.offsetTop+64;
    if(rect.bottom>safeBottom||rect.top<safeTop){
      element.scrollIntoView({block:'center',behavior:'smooth'});
    }
  }

  function normalizeInteractiveTargets(root=document){
    root.querySelectorAll('a[target="_blank"]').forEach(link=>{
      if(!link.rel.includes('noopener'))link.rel=`${link.rel} noopener`.trim();
    });
    root.querySelectorAll('input,textarea,select').forEach(control=>{
      control.setAttribute('enterkeyhint',control.getAttribute('enterkeyhint')||'done');
    });
  }

  function initialize(){
    updateViewport();
    updateViewClasses();
    normalizeInteractiveTargets();

    const observer=new MutationObserver(records=>{
      queueUpdate();
      for(const record of records){
        for(const node of record.addedNodes){
          if(node instanceof Element)normalizeInteractiveTargets(node);
        }
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled']});

    document.addEventListener('focusin',event=>{
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement){
        lastFocused=event.target;
        setTimeout(keepFocusedControlVisible,180);
      }
    },true);
    document.addEventListener('focusout',()=>{lastFocused=null},true);

    window.visualViewport?.addEventListener('resize',()=>{updateViewport();setTimeout(keepFocusedControlVisible,80)});
    window.visualViewport?.addEventListener('scroll',updateViewport);
    window.addEventListener('resize',updateViewport);
    window.addEventListener('popstate',queueUpdate);
    window.addEventListener('pageshow',()=>{queueUpdate();updateViewport()});

    console.info('[VTA native UI] hardening active',{build:BUILD});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
