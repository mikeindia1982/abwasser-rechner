(()=>{
  const STORAGE_PLANTS='abwasser-plants-v07';
  const STORAGE_ACTIVE_PLANT='abwasser-active-plant-v07';
  const REPORT_STORAGE='vta-visit-reports-v01';
  const VIEW_STORAGE='vta-visits-view-v01';
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
      if((visit?.appointmentType||'visit')!=='visit')return 'Termin öffnen';
      if(visit?.modeStatus==='completed'||visit?.status==='done')return 'Besuchsdaten öffnen';
      return 'Besuch starten';
    }
    if(key==='edit')return 'Termin bearbeiten';
    if(key==='ics')return 'Outlook / ICS';
    if(key==='outlook')return 'Outlook Web';
    if(key==='delete')return 'Löschen';
    return String(node.textContent||'Aktion').trim()||'Aktion';
  }
  function kindMeta(visit,hasReport){
    const appointmentType=visit?.appointmentType||'visit';
    if(appointmentType!=='visit')return {kind:'TERMIN',state:APPOINTMENT_LABELS[appointmentType]||'Termin',tone:'planned',report:false};
    if(visit?.modeStatus==='active')return {kind:'BESUCH',state:'Läuft',tone:'active',report:hasReport};
    if(visit?.modeStatus==='completed'||visit?.status==='done')return {kind:'BESUCH',state:'Abgeschlossen',tone:'done',report:hasReport};
    return {kind:'TERMIN',state:visit?.status==='cancelled'?'Abgesagt':'Geplant',tone:'planned',report:hasReport};
  }
  function choosePrimary(actions,visit){
    const report=actions.find(action=>actionKey(action)==='report');
    if(report)return report;
    const appointmentType=visit?.appointmentType||'visit';
    if(appointmentType!=='visit'||visit?.status==='cancelled'){
      const edit=actions.find(action=>actionKey(action)==='edit');
      if(edit)return edit;
    }
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

  function visitTimestamp(visit){
    const time=new Date(visit?.start||visit?.startedAt||0).getTime();
    return Number.isFinite(time)?time:0;
  }
  function isVisitRecord(visit){
    if((visit?.appointmentType||'visit')!=='visit')return false;
    return visit?.modeStatus==='active'||visit?.modeStatus==='completed'||visit?.status==='done';
  }
  function itemForCard(card,plant){
    const visitId=visitIdForCard(card);
    const visit=(plant?.visits||[]).find(item=>item?.id===visitId)||null;
    return visit?{card,visit,hasReport:reportExists(plant.id,visitId)}:null;
  }
  function findVisitsSection(){
    const existing=document.querySelector('[data-visits-ui-section="true"]');
    if(existing)return existing;
    return [...document.querySelectorAll('.dashboard-section')].find(section=>section.querySelector(':scope > .section-heading h2')?.textContent.trim()==='Termine und Anlagenhistorie')||null;
  }
  function emptyState(text){
    const box=document.createElement('div');
    box.className='empty-panel compact visits-ui-empty';
    box.innerHTML=`<p>${escapeHtml(text)}</p>`;
    return box;
  }
  function appendGroup(panel,title,subtitle,items){
    if(!items.length)return;
    const group=document.createElement('section');
    group.className='visits-ui-group';
    group.innerHTML=`<div class="visits-ui-group-head"><div><h3>${escapeHtml(title)}</h3>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div><span>${items.length}</span></div><div class="visits-list visits-ui-list"></div>`;
    const list=group.querySelector('.visits-ui-list');
    items.forEach(item=>list.appendChild(item.card));
    panel.appendChild(group);
  }
  function moveAllToPool(shell,items){
    const pool=shell.querySelector('.visits-ui-pool');
    items.forEach(item=>pool.appendChild(item.card));
  }
  function updateTabs(shell,view){
    shell.querySelectorAll('[data-visits-view]').forEach(button=>{
      const active=button.dataset.visitsView===view;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }
  function renderOverview(shell,plant,items){
    const panel=shell.querySelector('.visits-ui-panel');
    const now=Date.now();
    const visitItems=items.filter(item=>isVisitRecord(item.visit));
    const appointmentItems=items.filter(item=>!isVisitRecord(item.visit));
    const active=visitItems.filter(item=>item.visit.modeStatus==='active').sort((a,b)=>visitTimestamp(b.visit)-visitTimestamp(a.visit));
    const completed=visitItems.filter(item=>item.visit.modeStatus==='completed'||item.visit.status==='done').sort((a,b)=>visitTimestamp(b.visit)-visitTimestamp(a.visit));
    const openAppointments=appointmentItems.filter(item=>item.visit.status!=='done'&&item.visit.status!=='cancelled');
    const upcoming=openAppointments.filter(item=>visitTimestamp(item.visit)>=now).sort((a,b)=>visitTimestamp(a.visit)-visitTimestamp(b.visit));
    const reportCount=completed.filter(item=>item.hasReport).length;
    panel.innerHTML=`<div class="visits-ui-summary"><article><span>Offene Termine</span><strong>${openAppointments.length}</strong><small>geplant oder noch offen</small></article><article><span>Durchgeführte Besuche</span><strong>${completed.length}</strong><small>abgeschlossen</small></article><article><span>Besuchsberichte</span><strong>${reportCount}</strong><small>freigegeben</small></article></div>`;
    if(active.length)appendGroup(panel,'Laufender Besuch','Aktuell vor Ort oder noch nicht abgeschlossen.',active.slice(0,1));
    if(upcoming.length)appendGroup(panel,'Nächster Termin','Der nächste noch anstehende Einsatz.',upcoming.slice(0,1));
    if(completed.length)appendGroup(panel,'Letzte Besuche','Zuletzt durchgeführte Vor-Ort-Besuche.',completed.slice(0,2));
    if(!active.length&&!upcoming.length&&!completed.length)panel.appendChild(emptyState('Noch keine Einsätze vorhanden.'));
  }
  function renderAppointments(shell,items){
    const panel=shell.querySelector('.visits-ui-panel');
    const now=Date.now();
    const appointmentItems=items.filter(item=>!isVisitRecord(item.visit));
    const open=appointmentItems.filter(item=>item.visit.status!=='done'&&item.visit.status!=='cancelled');
    const upcoming=open.filter(item=>visitTimestamp(item.visit)>=now).sort((a,b)=>visitTimestamp(a.visit)-visitTimestamp(b.visit));
    const overdue=open.filter(item=>visitTimestamp(item.visit)<now).sort((a,b)=>visitTimestamp(a.visit)-visitTimestamp(b.visit));
    const closed=appointmentItems.filter(item=>item.visit.status==='done'||item.visit.status==='cancelled').sort((a,b)=>visitTimestamp(b.visit)-visitTimestamp(a.visit));
    panel.innerHTML='';
    appendGroup(panel,'Geplante Termine','Zukünftige Besuche, Anrufe und andere geplante Kontakte.',upcoming);
    appendGroup(panel,'Überfällige Termine','Noch offene Termine, deren geplanter Zeitpunkt bereits vergangen ist.',overdue);
    appendGroup(panel,'Erledigt / abgesagt','Abgeschlossene Kontakte und abgesagte Termine.',closed);
    if(!appointmentItems.length)panel.appendChild(emptyState('Keine Termine vorhanden.'));
  }
  function renderVisits(shell,items){
    const panel=shell.querySelector('.visits-ui-panel');
    const visitItems=items.filter(item=>isVisitRecord(item.visit));
    const active=visitItems.filter(item=>item.visit.modeStatus==='active').sort((a,b)=>visitTimestamp(b.visit)-visitTimestamp(a.visit));
    const completed=visitItems.filter(item=>item.visit.modeStatus==='completed'||item.visit.status==='done').sort((a,b)=>visitTimestamp(b.visit)-visitTimestamp(a.visit));
    panel.innerHTML='';
    appendGroup(panel,'Laufende Besuche','Noch nicht abgeschlossene Vor-Ort-Besuche.',active);
    appendGroup(panel,'Abgeschlossene Besuche & Berichte','Durchgeführte Besuche. Freigegebene Berichte sind direkt an der Karte gekennzeichnet.',completed);
    if(!visitItems.length)panel.appendChild(emptyState('Noch keine durchgeführten Besuche vorhanden.'));
  }
  function renderView(shell,view,plant,items){
    moveAllToPool(shell,items);
    const panel=shell.querySelector('.visits-ui-panel');
    panel.innerHTML='';
    if(view==='appointments')renderAppointments(shell,items);
    else if(view==='visits')renderVisits(shell,items);
    else renderOverview(shell,plant,items);
    updateTabs(shell,view);
    try{sessionStorage.setItem(VIEW_STORAGE,view)}catch{}
  }
  function structureVisitsSection(section,plant){
    if(section.dataset.visitsUiStructured==='true')return;
    const cards=[...section.querySelectorAll('.visits-list .visit-card')];
    cards.forEach(card=>enhanceCard(card,plant));
    const items=cards.map(card=>itemForCard(card,plant)).filter(Boolean);
    const heading=section.querySelector(':scope > .section-heading');
    if(!heading)return;
    section.dataset.visitsUiSection='true';
    section.dataset.visitsUiStructured='true';
    const title=heading.querySelector('h2');
    if(title)title.textContent='Termine, Besuche und Berichte';

    const shell=document.createElement('div');
    shell.className='visits-ui-shell';
    const appointmentCount=items.filter(item=>!isVisitRecord(item.visit)).length;
    const visitCount=items.filter(item=>isVisitRecord(item.visit)).length;
    shell.innerHTML=`<nav class="visits-ui-tabs" role="tablist" aria-label="Einsätze filtern"><button type="button" role="tab" data-visits-view="overview">Übersicht</button><button type="button" role="tab" data-visits-view="appointments">Termine <span>${appointmentCount}</span></button><button type="button" role="tab" data-visits-view="visits">Besuche &amp; Berichte <span>${visitCount}</span></button></nav><div class="visits-ui-panel" role="tabpanel"></div><div class="visits-ui-pool" hidden></div>`;
    heading.insertAdjacentElement('afterend',shell);
    const pool=shell.querySelector('.visits-ui-pool');
    items.forEach(item=>pool.appendChild(item.card));
    section.querySelectorAll(':scope > .visit-group-title, :scope > .visits-list').forEach(element=>element.remove());

    const remembered=(()=>{try{return sessionStorage.getItem(VIEW_STORAGE)||'overview'}catch{return 'overview'}})();
    const initial=['overview','appointments','visits'].includes(remembered)?remembered:'overview';
    shell.querySelectorAll('[data-visits-view]').forEach(button=>button.addEventListener('click',()=>renderView(shell,button.dataset.visitsView,plant,items)));
    renderView(shell,initial,plant,items);
  }
  function enhanceAll(){
    const plant=activePlant();
    if(!plant)return;
    const section=findVisitsSection();
    if(!section)return;
    section.querySelectorAll('.visit-card').forEach(card=>enhanceCard(card,plant));
    structureVisitsSection(section,plant);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;try{enhanceAll()}catch(error){console.warn('Einsatz-Ansicht konnte nicht aktualisiert werden.',error)}});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  schedule();
})();
