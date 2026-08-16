(()=>{
  const STORAGE_PLANTS='abwasser-plants-v07';
  const STORAGE_ACTIVE_PLANT='abwasser-active-plant-v07';
  const STORAGE_PROFILE='abwasser-employee-profile-v087';
  const GUIDE_STORAGE='vta-visit-guide-v01';
  const REPORT_STORAGE='vta-visit-reports-v01';
  const CURRENT_VISIT_KEY='vta-current-visit-id-v01';

  const REASONS={
    routine:'Routinebesuch',problem:'Betriebsproblem',dosing:'Dosierungsoptimierung',technical:'Technikproblem',trial:'Versuch / Produkttest',complaint:'Reklamation',other:'Sonstiges'
  };
  const ANSWERS={
    operationalState:{normal:'Unauffällig',attention:'Auffällig',critical:'Kritisch'},
    problemArea:{biology:'Biologie',outlet:'Ablauf',sludge:'Schlamm',dosing:'Dosierung',dewatering:'Entwässerung',technology:'Technik',other:'Sonstiges'},
    severity:{low:'Beobachten',medium:'Handlungsbedarf',high:'Kritisch'},
    dosingTarget:{phosphorus:'Phosphatfällung',polymer:'Polymer',product:'Produktwechsel',consumption:'Verbrauch',fault:'Störung / Dosiertechnik'},
    dosingFinding:{no:'Keine weitere Auffälligkeit',yes:'Auffälligkeit dokumentiert'},
    technicalArea:{dosing:'Dosierstation',dewatering:'Entwässerung',tank:'Tankanlage',pump:'Pumpe',measurement:'Messtechnik',other:'Sonstiges'},
    trialPhase:{start:'Versuchsstart',check:'Zwischenkontrolle',finish:'Versuchsabschluss',evaluation:'Auswertung'},
    complaintArea:{product:'Produkt',delivery:'Lieferung',technical:'Technik',process:'Prozesswirkung',other:'Sonstiges'}
  };
  const ANSWER_LABELS={
    operationalState:'Anlagenzustand',problemArea:'Bereich',severity:'Dringlichkeit',dosingTarget:'Schwerpunkt',dosingFinding:'Zusätzliche Auffälligkeit',technicalArea:'Technikbereich',trialPhase:'Versuchsphase',complaintArea:'Reklamationsbereich'
  };
  const PROCESS_LABELS={
    'activated-sludge':'Belebtschlammverfahren',sbr:'Sequencing Batch Reactor (SBR)',mbr:'Membranbelebungsverfahren (MBR)','trickling-filter':'Tropfkörper','rotating-biological-contactor':'Scheibentauchkörper',mbbr:'Moving Bed Biofilm Reactor (MBBR)','fixed-bed':'Festbettverfahren',biofilter:'Biofilter','constructed-wetland':'Pflanzenkläranlage',lagoon:'Abwasserteich / Lagune',anaerobic:'Anaerobes Verfahren','physico-chemical':'Physikalisch-chemisches Verfahren',other:'Sonstiges'
  };
  const DOSING_PURPOSES={precipitant:'Fällmittel',polymer:'Polymer',carbon:'Kohlenstoffquelle',neutralization:'Neutralisationsmittel',defoamer:'Entschäumer',other:'Sonstiges'};
  const DEWATERING_PROCESSES={'screw-press':'Schneckenpresse','belt-press':'Siebbandpresse','filter-press':'Kammerfilterpresse',centrifuge:'Zentrifuge',mobile:'Mobile Entwässerung',dryingBed:'Trockenbeet',other:'Sonstiges'};
  const FINDING_LABELS={info:'Hinweis',warning:'Beobachten',critical:'Handlungsbedarf',task:'Aufgabe'};

  let finishBypassVisitId='';
  let scheduled=false;

  function readJson(storage,key,fallback){
    try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback}catch{return fallback}
  }
  function writeJson(storage,key,value){
    try{storage.setItem(key,JSON.stringify(value));return true}catch(error){console.warn('Besuchsbericht konnte nicht lokal gespeichert werden.',error);return false}
  }
  function esc(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }
  function clean(value=''){return String(value??'').trim()}
  function readPlants(){const value=readJson(localStorage,STORAGE_PLANTS,[]);return Array.isArray(value)?value:[]}
  function activePlantId(){return localStorage.getItem(STORAGE_ACTIVE_PLANT)||''}
  function activePlant(){const id=activePlantId();return readPlants().find(plant=>plant?.id===id)||null}
  function reportMap(){const value=readJson(localStorage,REPORT_STORAGE,{});return value&&typeof value==='object'?value:{}}
  function reportKey(plantId,visitId){return `${plantId}:${visitId}`}
  function getReport(plantId,visitId){return reportMap()[reportKey(plantId,visitId)]||null}
  function saveReport(report){
    const all=reportMap();
    all[reportKey(report.plantId,report.visitId)]=report;
    return writeJson(localStorage,REPORT_STORAGE,all);
  }
  function guideState(plantId,visitId){
    const all=readJson(localStorage,GUIDE_STORAGE,{});
    return all?.[`${plantId}:${visitId}`]||null;
  }
  function employeeName(){
    const profile=readJson(localStorage,STORAGE_PROFILE,{});
    return [profile?.firstName,profile?.lastName].map(clean).filter(Boolean).join(' ')||clean(profile?.jobTitle)||'';
  }
  function formatDate(value){
    if(!value)return '–';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return clean(value)||'–';
    return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(date);
  }
  function currentVisitContext(){
    const plant=activePlant();
    if(!plant)return null;
    const remembered=sessionStorage.getItem(CURRENT_VISIT_KEY)||'';
    let visit=(plant.visits||[]).find(item=>item?.id===remembered)||null;
    if(!visit){
      visit=[...(plant.visits||[])].filter(item=>item?.modeStatus==='active').sort((a,b)=>String(b.startedAt||b.start||'').localeCompare(String(a.startedAt||a.start||'')))[0]||null;
    }
    return visit?{plant,visit}:null;
  }
  function rememberVisitFromElement(target){
    if(target.closest?.('#startVisitMain, #startVisit, #startVisitCockpit')){sessionStorage.removeItem(CURRENT_VISIT_KEY);return}
    const open=target.closest?.('[data-open-visit]');
    if(open?.dataset.openVisit){sessionStorage.setItem(CURRENT_VISIT_KEY,open.dataset.openVisit);return}
    const appointment=target.closest?.('[data-appointment-action]');
    if(appointment?.dataset.visitId&&target.closest?.('[data-appt-action="start-visit"]'))sessionStorage.setItem(CURRENT_VISIT_KEY,appointment.dataset.visitId);
  }
  function liveValue(selector,fallback=''){
    const element=document.querySelector(selector);
    return element?clean(element.value):clean(fallback);
  }
  function snapshotVisit(visit){
    const measurements={...(visit.measurements||{})};
    const comparison={...(visit.comparison||{})};
    if(document.querySelector('.visit-workspace')){
      for(const key of ['flow','pOut','nh4Out','cakeTs','polymer','custom'])measurements[key]=liveValue(`[name="vm.${key}"]`,measurements[key]);
      for(const key of ['beforeProduct','afterProduct','beforeDose','afterDose','beforeCost','afterCost','beforeQuality','afterQuality'])comparison[key]=liveValue(`[name="vc.${key}"]`,comparison[key]);
    }
    return {
      ...visit,
      initialSituation:liveValue('[name="vr.initialSituation"]',visit.initialSituation),
      workPerformed:liveValue('[name="vr.workPerformed"]',visit.workPerformed),
      chemistryChanges:liveValue('[name="vr.chemistryChanges"]',visit.chemistryChanges),
      settingChanges:liveValue('[name="vr.settingChanges"]',visit.settingChanges),
      result:liveValue('[name="vr.result"]',visit.result),
      recommendation:liveValue('[name="vr.recommendation"]',visit.recommendation),
      nextSteps:liveValue('[name="vr.nextSteps"]',visit.nextSteps),
      summary:liveValue('#visitSummary',visit.summary||visit.notes),
      measurements,comparison
    };
  }
  function addSection(sections,id,title,parts){
    const text=(Array.isArray(parts)?parts:[parts]).map(clean).filter(Boolean).join('\n');
    if(text)sections.push({id,title,text});
  }
  function guideContextLines(state){
    const lines=[];
    if(state?.reason)lines.push(`Anlass: ${REASONS[state.reason]||state.reason}`);
    for(const [id,value] of Object.entries(state?.answers||{})){
      if(!value||!ANSWER_LABELS[id])continue;
      lines.push(`${ANSWER_LABELS[id]}: ${ANSWERS[id]?.[value]||value}`);
    }
    return lines;
  }
  function intakeLines(state,plant){
    const x=state?.intake||{};
    const lines=[];
    const process=x.mainProcess||plant?.master?.mainProcess||'';
    if(process)lines.push(`Hauptverfahren: ${PROCESS_LABELS[process]||process}`);
    if(x.capacityPE||plant?.master?.capacityPE)lines.push(`Ausbaugröße: ${x.capacityPE||plant.master.capacityPE} EW`);
    if(x.actualPE||plant?.master?.actualPE)lines.push(`Tatsächliche Belastung: ${x.actualPE||plant.master.actualPE} EW`);
    if(x.dosingPresent==='yes'){
      const details=[DOSING_PURPOSES[x.dosingPurpose]||x.dosingPurpose,x.dosingProduct,x.dosingManufacturer].map(clean).filter(Boolean).join(' · ');
      lines.push(`Dosierung: ${details||'vorhanden'}`);
    }else if(x.dosingPresent==='no')lines.push('Dosierung: nicht vorhanden');
    if(x.dewateringPresent==='yes'){
      const details=[DEWATERING_PROCESSES[x.dewateringProcess]||x.dewateringProcess,x.dewateringManufacturer,x.dewateringModel,x.dewateringYear?`Baujahr ${x.dewateringYear}`:''].map(clean).filter(Boolean).join(' · ');
      lines.push(`Schlammentwässerung: ${details||'vorhanden'}`);
    }else if(x.dewateringPresent==='no')lines.push('Schlammentwässerung: nicht vorhanden');
    if(x.parking)lines.push(`Parkmöglichkeit: ${x.parking}`);
    if(x.gate)lines.push(`Tor / Zufahrt: ${x.gate}`);
    if(x.registration)lines.push(`Anmeldung: ${x.registration}`);
    if(x.ppe)lines.push(`PSA: ${x.ppe}`);
    return lines;
  }
  function measurementLines(visit){
    const m=visit.measurements||{};
    const rows=[['Volumenstrom',m.flow,'m³/d'],['Pges Ablauf',m.pOut,'mg/l'],['NH₄-N Ablauf',m.nh4Out,'mg/l'],['Kuchen-TS',m.cakeTs,'%'],['Polymer',m.polymer,'kg WS/t TS']];
    const lines=rows.filter(([,value])=>clean(value)).map(([label,value,unit])=>`${label}: ${clean(value)} ${unit}`);
    if(clean(m.custom))lines.push(clean(m.custom));
    return lines;
  }
  function comparisonLines(visit){
    const c=visit.comparison||{};
    const rows=[
      ['Produkt',c.beforeProduct,c.afterProduct],['Dosierung',c.beforeDose,c.afterDose],['Kosten',c.beforeCost,c.afterCost],['Ergebnisqualität',c.beforeQuality,c.afterQuality]
    ];
    return rows.filter(([,before,after])=>clean(before)||clean(after)).map(([label,before,after])=>`${label}: vorher ${clean(before)||'–'} · nachher ${clean(after)||'–'}`);
  }
  function findingLines(visit){
    return (visit.findings||[]).map(item=>clean(item?.text)?`${FINDING_LABELS[item.severity]||'Hinweis'}: ${clean(item.text)}`:'').filter(Boolean);
  }
  function taskLines(plant,visit){
    return (plant.actions||[]).filter(action=>action?.sourceVisitId===visit.id&&action.status!=='done').map(action=>{
      const due=clean(action.dueDate);
      return due?`${clean(action.title)} (fällig ${due})`:clean(action.title);
    }).filter(Boolean);
  }
  function buildDraft(plant,rawVisit){
    const visit=snapshotVisit(rawVisit);
    const state=guideState(plant.id,visit.id);
    const firstIntake=state?.mode==='first-intake';
    const sections=[];
    const purpose=[];
    if(firstIntake)purpose.push('Erstaufnahme einer neu angelegten Anlage vor Ort.');
    purpose.push(...guideContextLines(state));
    if(clean(visit.purpose))purpose.push(`Termin-Anlass: ${clean(visit.purpose)}`);
    if(clean(visit.objective))purpose.push(`Ziel: ${clean(visit.objective)}`);
    addSection(sections,'purpose',firstIntake?'Anlass der Erstaufnahme':'Anlass und Ziel',purpose);
    if(firstIntake)addSection(sections,'intake','Anlagen-Erstaufnahme',intakeLines(state,plant));
    addSection(sections,'findings','Feststellungen',[clean(visit.initialSituation),...findingLines(visit)]);
    addSection(sections,'measurements','Betriebs- und Messwerte',measurementLines(visit));
    addSection(sections,'work','Durchgeführte Tätigkeiten',visit.workPerformed);
    addSection(sections,'changes','Änderungen / Optimierung',[clean(visit.chemistryChanges)?`Chemie / Produkt: ${clean(visit.chemistryChanges)}`:'',clean(visit.settingChanges)?`Einstellungen / Maschine: ${clean(visit.settingChanges)}`:'',...comparisonLines(visit)]);
    addSection(sections,'result','Ergebnis',visit.result);
    addSection(sections,'recommendation','Empfehlung',visit.recommendation);
    addSection(sections,'next','Offene Punkte / nächste Schritte',[clean(visit.nextSteps),...taskLines(plant,visit)]);
    addSection(sections,'summary','Besuchsnotiz',visit.summary);
    if(!sections.length)addSection(sections,'note','Dokumentation','Es wurden keine zusätzlichen Berichtsinhalte erfasst.');
    return {
      type:firstIntake?'first-intake':'visit-report',
      title:firstIntake?'Bericht zur Anlagen-Erstaufnahme':'Besuchsbericht',
      sections,
      photoIds:(visit.photos||[]).map(photo=>photo.id).filter(Boolean),
      guideSnapshot:state?{mode:state.mode||'standard',reason:state.reason||'',answers:{...(state.answers||{})},intake:{...(state.intake||{})}}:null
    };
  }
  function reportFromDialog(dialog,plant,visit,draft,existing){
    const now=new Date().toISOString();
    const sections=[...dialog.querySelectorAll('[data-report-section]')].map(block=>({
      id:block.dataset.reportSection,
      title:clean(block.querySelector('[data-report-section-title]')?.value)||'Abschnitt',
      text:clean(block.querySelector('[data-report-section-text]')?.value)
    })).filter(section=>section.text);
    const profile=readJson(localStorage,STORAGE_PROFILE,{});
    return {
      id:existing?.id||`visit-report-${visit.id}`,
      plantId:plant.id,
      visitId:visit.id,
      type:draft.type,
      title:clean(dialog.querySelector('[data-report-title]')?.value)||draft.title,
      status:'approved',
      revision:Number(existing?.revision||0)+1,
      createdAt:existing?.createdAt||now,
      updatedAt:now,
      approvedAt:now,
      visitDate:visit.start||visit.startedAt||now,
      completedAt:visit.completedAt||'',
      plantName:clean(plant.master?.name)||'Unbenannte Anlage',
      plantNumber:clean(plant.master?.internalNumber),
      operator:clean(plant.operator?.name),
      contact:clean(visit.contact),
      employee:[profile?.firstName,profile?.lastName].map(clean).filter(Boolean).join(' ')||clean(profile?.jobTitle),
      sections,
      photoIds:draft.photoIds,
      guideSnapshot:draft.guideSnapshot
    };
  }
  function reportPhotosHtml(visit,report){
    const ids=new Set(report?.photoIds||[]);
    const photos=(visit.photos||[]).filter(photo=>!ids.size||ids.has(photo.id));
    if(!photos.length)return '';
    return `<section class="visit-report-photos"><h3>Fotodokumentation</h3><div class="visit-report-photo-grid">${photos.map(photo=>`<figure><img src="${photo.dataUrl}" alt="${esc(photo.name||'Besuchsfoto')}"><figcaption>${esc(photo.name||'Besuchsfoto')}</figcaption></figure>`).join('')}</div></section>`;
  }
  function reportText(report){
    const meta=[report.plantName,report.plantNumber?`Anlagennummer: ${report.plantNumber}`:'',`Datum: ${formatDate(report.visitDate)}`,report.contact?`Ansprechpartner: ${report.contact}`:'',report.employee?`Mitarbeiter: ${report.employee}`:''].filter(Boolean).join('\n');
    const sections=(report.sections||[]).map(section=>`${section.title}\n${section.text}`).join('\n\n');
    return `${report.title}\n${meta}\n\n${sections}`.trim();
  }
  function showReportDialog({plant,visit,finishAfter=false,existingOnly=false}){
    document.querySelector('#visitReportDialog')?.remove();
    const existing=getReport(plant.id,visit.id);
    const generated=buildDraft(plant,visit);
    const draft=existingOnly&&existing?{type:existing.type,title:existing.title,sections:existing.sections||[],photoIds:existing.photoIds||[],guideSnapshot:existing.guideSnapshot||null}:generated;
    const dialog=document.createElement('dialog');
    dialog.id='visitReportDialog';
    dialog.className='visit-report-dialog';
    dialog.innerHTML=`<div class="visit-report-shell">
      <div class="visit-report-head"><div><p class="eyebrow">${existingOnly&&existing?'Gespeicherter Bericht':'Automatisch vorbereitet'}</p><input class="visit-report-title-input" data-report-title value="${esc(draft.title)}" aria-label="Berichtstitel"><p>${esc(plant.master?.name||'Unbenannte Anlage')} · ${esc(formatDate(visit.start||visit.startedAt))}</p></div><span class="visit-report-status">${existingOnly&&existing?'Freigegeben':'Entwurf'}</span></div>
      <div class="visit-report-meta"><span><small>Anlage</small><strong>${esc(plant.master?.name||'Unbenannte Anlage')}</strong></span>${plant.master?.internalNumber?`<span><small>Anlagennummer</small><strong>${esc(plant.master.internalNumber)}</strong></span>`:''}${visit.contact?`<span><small>Ansprechpartner</small><strong>${esc(visit.contact)}</strong></span>`:''}${employeeName()?`<span><small>Mitarbeiter</small><strong>${esc(employeeName())}</strong></span>`:''}</div>
      <p class="visit-report-note">Der Bericht wird ausschließlich aus den erfassten Besuchsdaten und festen Textbausteinen erzeugt. Nicht ausgefüllte Bereiche erscheinen nicht.</p>
      <div class="visit-report-sections">${(draft.sections||[]).map(section=>`<section data-report-section="${esc(section.id)}"><input data-report-section-title value="${esc(section.title)}" aria-label="Abschnittstitel"><textarea data-report-section-text rows="${Math.max(3,Math.min(8,clean(section.text).split('\n').length+1))}">${esc(section.text)}</textarea></section>`).join('')}</div>
      ${reportPhotosHtml(visit,{photoIds:draft.photoIds})}
      <div class="visit-report-actions"><button type="button" class="button secondary" data-report-close>${finishAfter?'Zurück zum Besuch':'Schließen'}</button><button type="button" class="button secondary" data-report-copy>Text kopieren</button><button type="button" class="button primary" data-report-approve>${finishAfter?'Bericht freigeben & Besuch beenden':'Änderungen speichern'}</button></div>
    </div>`;
    document.body.appendChild(dialog);
    const close=()=>{try{dialog.close()}catch{}dialog.remove()};
    dialog.querySelector('[data-report-close]').onclick=close;
    dialog.querySelector('[data-report-copy]').onclick=async()=>{
      const preview=reportFromDialog(dialog,plant,visit,draft,existing);
      try{await navigator.clipboard.writeText(reportText(preview));const button=dialog.querySelector('[data-report-copy]');button.textContent='Kopiert';setTimeout(()=>{if(button)button.textContent='Text kopieren'},1200)}catch{alert('Der Berichtstext konnte nicht in die Zwischenablage kopiert werden.')}
    };
    dialog.querySelector('[data-report-approve]').onclick=()=>{
      const report=reportFromDialog(dialog,plant,visit,draft,existing);
      if(!saveReport(report))return alert('Der Besuchsbericht konnte nicht gespeichert werden.');
      close();
      if(finishAfter){
        finishBypassVisitId=visit.id;
        const finish=document.querySelector('#finishVisit');
        if(finish)finish.click();
      }else{
        enhanceVisitReports();
      }
    };
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function addVisitModeReportButton(){
    const workspace=document.querySelector('.visit-workspace');
    const finish=document.querySelector('#finishVisit');
    if(!workspace||!finish||document.querySelector('[data-visit-report-open]'))return;
    const context=currentVisitContext();
    if(!context)return;
    const {plant,visit}=context;
    sessionStorage.setItem(CURRENT_VISIT_KEY,visit.id);
    const existing=getReport(plant.id,visit.id);
    const button=document.createElement('button');
    button.type='button';
    button.className='button secondary';
    button.dataset.visitReportOpen='true';
    button.textContent=existing?'Besuchsbericht ansehen':'Berichtsvorschau';
    button.onclick=()=>showReportDialog({plant,visit,finishAfter:false,existingOnly:Boolean(existing)});
    finish.insertAdjacentElement('beforebegin',button);
    if(existing){
      const badge=document.createElement('div');
      badge.className='visit-report-inline-status';
      badge.innerHTML=`<span>✓ Bericht freigegeben</span><small>Revision ${Number(existing.revision||1)} · ${esc(formatDate(existing.updatedAt))}</small>`;
      workspace.insertAdjacentElement('beforebegin',badge);
    }
  }
  function addHistoryReportButtons(){
    const plant=activePlant();
    if(!plant)return;
    document.querySelectorAll('[data-open-visit]').forEach(open=>{
      const visitId=open.dataset.openVisit;
      if(!visitId||open.parentElement?.querySelector(`[data-history-report="${CSS.escape(visitId)}"]`))return;
      const report=getReport(plant.id,visitId);
      if(!report)return;
      const visit=(plant.visits||[]).find(item=>item.id===visitId);
      if(!visit)return;
      const button=document.createElement('button');
      button.type='button';
      button.dataset.historyReport=visitId;
      button.textContent='Besuchsbericht';
      button.onclick=event=>{event.stopPropagation();showReportDialog({plant,visit,finishAfter:false,existingOnly:true})};
      open.insertAdjacentElement('afterend',button);
    });
  }
  function enhanceVisitReports(){
    addVisitModeReportButton();
    addHistoryReportButtons();
  }
  function scheduleEnhancement(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;try{enhanceVisitReports()}catch(error){console.warn('Besuchsbericht-Erweiterung konnte nicht aktualisiert werden.',error)}});
  }

  document.addEventListener('click',event=>{
    rememberVisitFromElement(event.target);
    const finish=event.target.closest?.('#finishVisit');
    if(!finish)return;
    const context=currentVisitContext();
    if(!context)return;
    const {plant,visit}=context;
    if(finishBypassVisitId===visit.id){finishBypassVisitId='';return}
    if(visit.modeStatus==='completed'||/wieder öffnen/i.test(finish.textContent||''))return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showReportDialog({plant,visit,finishAfter:true,existingOnly:false});
  },true);

  const observer=new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',scheduleEnhancement);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleEnhancement()});
  document.addEventListener('DOMContentLoaded',scheduleEnhancement,{once:true});
  scheduleEnhancement();
})();