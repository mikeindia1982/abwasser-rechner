(()=>{
  const STORAGE_PLANTS='abwasser-plants-v07';
  const STORAGE_ACTIVE_PLANT='abwasser-active-plant-v07';
  const REPORT_STORAGE='vta-visit-reports-v01';
  const APPOINTMENT_LABELS={visit:'Vor-Ort-Besuch',call:'Anruf',scheduling:'Terminvereinbarung',email:'E-Mail',followup:'Nachfassen',other:'Sonstiger Termin'};
  let scheduled=false;

  function readJson(storage,key,fallback){
    try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback}catch{return fallback}
  }
  function activePlant(){
    const id=localStorage.getItem(STORAGE_ACTIVE_PLANT)||'';
    const plants=readJson(localStorage,STORAGE_PLANTS,[]);
    return Array.isArray(plants)?plants.find(plant=>plant?.id===id)||null:null;
  }
  function reportExists(plantId,visitId){
    const reports=readJson(localStorage,REPORT_STORAGE,{});
    return Boolean(reports?.[`${plantId}:${visitId}`]);
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }
  function visitIdForCard(card){
    return card.querySelector('[data-open-visit]')?.dataset.openVisit||card.querySelector('[data-edit-visit]')?.dataset.editVisit||'';
  }
  function nativeActions(card){
    const root=card.querySelector('.visit-actions');
    if(!root)return [];
    return [...root.querySelectorAll(':scope > button, :scope > a')].filter(node=>!node.matches('[data-visits-ui-generated]'));
  }
  function actionKey(node){
    if(node.dataset.historyReport!==undefined)return 'report';
    if(node.dataset.openVisit!==undefined)return 'open';
    if(node.dataset.editVisit!==undefined)return 'edit';
    if(node.dataset.icsVisit!==undefined)return 'ics';
    if(node.dataset.deleteVisit!==undefined)return 'delete';
    if(node.tagName==='A'&&/outlook/i.test(node.textContent||''))return 'outlook';
    return 'other';
  }
  function actionLabel(node,visit){
    const key=actionKey(node);
    if(key==='report')return 'Besuchsbericht öffnen';
    if(key==='open'){
      if(visit?.modeStatus==='active')return 'Besuch fortsetzen';
      if(visit?.modeStatus==='completed'||visit?.status==='done')return 'Besuchsdaten öffnen';
      if((visit?.appointmentType||'visit')==='visit')return 'Besuch starten';
      return String(node.textContent||'Termin öffnen').trim()||'Termin öffnen';
    }
    if(key==='edit')return 'Termin bearbeiten';
    if(key==='ics')return 'Outlook / ICS';
    if(key==='outlook')return 'Outlook Web';
    if(key==='delete')return 'Löschen';
    return String(node.textContent||'Aktion').trim()||'Aktion';
  }
  function kindMeta(visit,hasReport){
    const appointmentType=visit?.appointmentType||'visit';
    if(appointmentType!=='visit'){
      return {kind:'TERMIN',state:APPOINTMENT_LABELS[appointmentType]||'Termin',tone:'planned',report:false};
    }
    if(visit?.modeStatus==='active')return {kind:'BESUCH',state:'Läuft',tone:'active',report:hasReport};
    if(visit?.modeStatus==='completed'||visit?.status==='done')return {kind:'BESUCH',state:'Abgeschlossen',tone:'done',report:hasReport};
    return {kind:'TERMIN',state:'Geplant',tone:'planned',report:hasReport};
  }
  function choosePrimary(actions,visit){
    const report=actions.find(action=>actionKey(action)==='report');
    if(report)return report;
    const open=actions.find(action=>actionKey(action)==='open');
    if(open)return open;
    return actions.find(action=>actionKey(action)!=='delete')||null;
  }
  function ensureActionSheet(){
    let dialog=document.querySelector('#visitActionSheet');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='visitActionSheet';
    dialog.className='visit-action-sheet';
    dialog.innerHTML=`<div class="visit-action-sheet-card"><div class="visit-action-sheet-head"><div><p class="eyebrow">Einsatz</p><h2>Aktionen</h2></div><button type="button" class="visit-action-sheet-close" data-visit-action-close aria-label="Schließen">×</button></div><p class="visit-action-sheet-title" data-visit-action-title></p><div class="visit-action-sheet-list" data-visit-action-list></div><button type="button" class="button secondary visit-action-sheet-cancel" data-visit-action-close>Abbrechen</button></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-visit-action-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    return dialog;
  }
  function runNativeAction(node,dialog){
    if(!node?.isConnected)return;
    if(dialog?.open)dialog.close();
    node.click();
  }
  function openActionSheet(card,visit,actions,primary){
    const dialog=ensureActionSheet();
    const title=card.querySelector('.visit-main h3')?.textContent.trim()||visit?.title||'Einsatz';
    dialog.querySelector('[data-visit-action-title]').textContent=title;
    const list=dialog.querySelector('[data-visit-action-list]');
    const secondary=actions.filter(action=>action!==primary);
    list.innerHTML='';
    secondary.forEach(action=>{
      const key=actionKey(action);
      const button=document.createElement('button');
      button.type='button';
      button.className=`visit-action-sheet-option${key==='delete'?' danger':''}`;
      button.innerHTML=`<span>${escapeHtml(actionLabel(action,visit))}</span><b aria-hidden="true">›</b>`;
      button.addEventListener('click',()=>runNativeAction(action,dialog));
      list.appendChild(button);
    });
    if(!secondary.length){
      const empty=document.createElement('p');
      empty.className='muted-small';
      empty.textContent='Keine weiteren Aktionen verfügbar.';
      list.appendChild(empty);
    }
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function enhanceCard(card,plant){
    const visitId=visitIdForCard(card);
    if(!visitId)return;
    const visit=(plant?.visits||[]).find(item=>item?.id===visitId)||null;
    const actions=nativeActions(card);
    if(!actions.length)return;
    const hasReport=Boolean(plant&&reportExists(plant.id,visitId))||actions.some(action=>actionKey(action)==='report');
    const signature=[visitId,visit?.modeStatus||'',visit?.status||'',visit?.appointmentType||'',hasReport?'report':'',...actions.map(action=>`${actionKey(action)}:${String(action.textContent||'').trim()}`)].join('|');
    if(card.dataset.visitsUiSignature===signature)return;
    card.dataset.visitsUiSignature=signature;
    card.classList.add('visit-actions-collapsed');
    card.querySelector('.visit-card-kindline')?.remove();
    card.querySelector('.visit-card-actionbar')?.remove();

    const meta=kindMeta(visit,hasReport);
    const kindline=document.createElement('div');
    kindline.className='visit-card-kindline';
    kindline.innerHTML=`<span class="visit-card-kind ${meta.tone}">${meta.kind}</span><span class="visit-card-state">${escapeHtml(meta.state)}</span>${meta.report?'<span class="visit-card-report-state">✓ Bericht freigegeben</span>':''}`;
    const titleRow=card.querySelector('.visit-title-row');
    if(titleRow)titleRow.insertAdjacentElement('beforebegin',kindline);
    else card.querySelector('.visit-main')?.prepend(kindline);

    const primary=choosePrimary(actions,visit);
    const actionbar=document.createElement('div');
    actionbar.className='visit-card-actionbar';
    if(primary){
      const primaryButton=document.createElement('button');
      primaryButton.type='button';
      primaryButton.className='button primary visit-card-primary-action';
      primaryButton.textContent=actionLabel(primary,visit);
      primaryButton.addEventListener('click',()=>runNativeAction(primary,null));
      actionbar.appendChild(primaryButton);
    }
    if(actions.length>1){
      const more=document.createElement('button');
      more.type='button';
      more.className='visit-card-more-action';
      more.setAttribute('aria-label','Weitere Aktionen');
      more.title='Weitere Aktionen';
      more.textContent='•••';
      more.addEventListener('click',()=>openActionSheet(card,visit,actions,primary));
      actionbar.appendChild(more);
    }
    card.appendChild(actionbar);
  }
  function enhanceAll(){
    const plant=activePlant();
    document.querySelectorAll('.visits-list .visit-card').forEach(card=>enhanceCard(card,plant));
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;try{enhanceAll()}catch(error){console.warn('Einsatz-Aktionsmenü konnte nicht aktualisiert werden.',error)}});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  schedule();
})();
