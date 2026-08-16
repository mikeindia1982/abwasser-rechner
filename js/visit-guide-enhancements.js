(()=>{
  const STORAGE_PLANTS='abwasser-plants-v07';
  const STORAGE_ACTIVE_PLANT='abwasser-active-plant-v07';
  const GUIDE_STORAGE='vta-visit-guide-v01';
  const NEW_PLANT_PENDING='vta-new-plant-first-intake-pending-v01';
  const FIRST_INTAKE_START='vta-first-intake-start-v01';
  const INTAKE_TRANSFER='vta-first-intake-transfer-v01';
  const MAX_PENDING_AGE=10*60*1000;

  const REASONS=[
    ['routine','Routinebesuch','Allgemeiner Anlagencheck ohne konkretes Störungsbild.'],
    ['problem','Betriebsproblem','Eine aktuelle Auffälligkeit oder Prozessstörung untersuchen.'],
    ['dosing','Dosierungsoptimierung','Produkt, Dosiermenge oder Dosierstrategie optimieren.'],
    ['technical','Technikproblem','Aggregat, Pumpe, Tank oder Messtechnik prüfen.'],
    ['trial','Versuch / Produkttest','Produktversuch starten, begleiten oder auswerten.'],
    ['complaint','Reklamation','Reklamation strukturiert aufnehmen und dokumentieren.'],
    ['other','Sonstiges','Freier Besuch mit geführter Dokumentation.']
  ];
  const LABELS={
    operationalState:{normal:'Unauffällig',attention:'Auffällig',critical:'Kritisch'},
    problemArea:{biology:'Biologie',outlet:'Ablauf',sludge:'Schlamm',dosing:'Dosierung',dewatering:'Entwässerung',technology:'Technik',other:'Sonstiges'},
    severity:{low:'Beobachten',medium:'Handlungsbedarf',high:'Kritisch'},
    dosingTarget:{phosphorus:'Phosphatfällung',polymer:'Polymer',product:'Produktwechsel',consumption:'Verbrauch',fault:'Störung / Dosiertechnik'},
    dosingFinding:{no:'Keine weitere Auffälligkeit',yes:'Auffälligkeit dokumentieren'},
    technicalArea:{dosing:'Dosierstation',dewatering:'Entwässerung',tank:'Tankanlage',pump:'Pumpe',measurement:'Messtechnik',other:'Sonstiges'},
    trialPhase:{start:'Versuchsstart',check:'Zwischenkontrolle',finish:'Versuchsabschluss',evaluation:'Auswertung'},
    complaintArea:{product:'Produkt',delivery:'Lieferung',technical:'Technik',process:'Prozesswirkung',other:'Sonstiges'}
  };

  function readJson(storage,key,fallback){
    try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback}catch{return fallback}
  }
  function writeJson(storage,key,value){
    try{storage.setItem(key,JSON.stringify(value));return true}catch{return false}
  }
  function readPlants(){
    const rows=readJson(localStorage,STORAGE_PLANTS,[]);
    return Array.isArray(rows)?rows:[];
  }
  function activePlantId(){return localStorage.getItem(STORAGE_ACTIVE_PLANT)||''}
  function activePlant(){
    const id=activePlantId();
    return readPlants().find(plant=>plant?.id===id)||null;
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }
  function guideMap(){
    const value=readJson(localStorage,GUIDE_STORAGE,{});
    return value&&typeof value==='object'?value:{};
  }
  function guideKey(plantId,visitId){return `${plantId}:${visitId}`}
  function getGuideState(plantId,visitId){return guideMap()[guideKey(plantId,visitId)]||null}
  function saveGuideState(plantId,visitId,state){
    const all=guideMap();
    all[guideKey(plantId,visitId)]={...state,updatedAt:new Date().toISOString()};
    const keys=Object.keys(all);
    if(keys.length>40){
      keys.sort((a,b)=>String(all[a]?.updatedAt||'').localeCompare(String(all[b]?.updatedAt||'')));
      keys.slice(0,keys.length-30).forEach(key=>delete all[key]);
    }
    writeJson(localStorage,GUIDE_STORAGE,all);
  }
  function latestActiveVisit(plant){
    return [...(plant?.visits||[])]
      .filter(visit=>visit?.modeStatus==='active')
      .sort((a,b)=>String(b.startedAt||b.start||'').localeCompare(String(a.startedAt||a.start||'')))[0]||null;
  }
  function currentVisitContext(){
    const plant=activePlant();
    if(!plant)return null;
    const visit=latestActiveVisit(plant);
    return visit?{plant,visit}:null;
  }
  function defaultGuideState(plant,visit){
    const requested=readJson(sessionStorage,FIRST_INTAKE_START,null);
    const firstIntake=requested?.plantId===plant.id&&Date.now()-(requested?.createdAt||0)<MAX_PENDING_AGE;
    if(firstIntake)sessionStorage.removeItem(FIRST_INTAKE_START);
    return {
      mode:firstIntake?'first-intake':'standard',
      reason:'',
      step:0,
      answers:{},
      intake:{},
      intakePhase:'collect',
      showAll:false,
      createdAt:new Date().toISOString()
    };
  }
  function ensureGuideState(plant,visit){
    let state=getGuideState(plant.id,visit.id);
    if(!state){state=defaultGuideState(plant,visit);saveGuideState(plant.id,visit.id,state)}
    state.answers=state.answers&&typeof state.answers==='object'?state.answers:{};
    state.intake=state.intake&&typeof state.intake==='object'?state.intake:{};
    state.intakePhase=state.intakePhase||'collect';
    state.step=Math.max(0,Number(state.step)||0);
    return state;
  }

  function choiceStep(id,title,text,options){return {kind:'choice',id,title,text,options}}
  function panelStep(panel,title,text){return {kind:'panel',panel,title,text}}
  function finishStep(title='Besuch abschließen',text='Prüfe die letzten Angaben und schließe den Besuch anschließend ab.'){return {kind:'finish',title,text}}
  function normalSteps(state){
    const reason=state.reason;
    const answers=state.answers||{};
    let steps=[];
    if(reason==='routine'){
      steps=[
        choiceStep('operationalState','Wie läuft die Anlage heute?','Wähle nur den aktuellen Gesamteindruck. Weitere Fragen erscheinen nur bei Bedarf.',[
          ['normal','Unauffällig','Keine relevante Auffälligkeit festgestellt.'],['attention','Auffällig','Etwas sollte genauer angesehen werden.'],['critical','Kritisch','Akuter Handlungsbedarf oder deutliche Abweichung.']
        ]),
        panelStep('Vor-Ort-Werte','Relevante Betriebswerte erfassen','Erfasse nur die Werte, die heute tatsächlich vorliegen.'),
        ...(answers.operationalState&&answers.operationalState!=='normal'?[panelStep('Auffälligkeiten und Aufgaben','Auffälligkeit konkretisieren','Dokumentiere nur die Punkte, die heute wirklich auffallen.')]:[]),
        panelStep('Strukturierte Dokumentation','Besuch kurz dokumentieren','Halte Ausgangssituation, Tätigkeit, Ergebnis und Empfehlung strukturiert fest.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze bei Bedarf eine kurze Gesprächs- oder Abschlussnotiz.'),
        finishStep()
      ];
    }else if(reason==='problem'){
      steps=[
        choiceStep('problemArea','Wo liegt das Betriebsproblem?','Der ausgewählte Bereich steuert den weiteren Kontext.',[
          ['biology','Biologie'],['outlet','Ablauf'],['sludge','Schlamm'],['dosing','Dosierung'],['dewatering','Entwässerung'],['technology','Technik'],['other','Sonstiges']
        ]),
        choiceStep('severity','Wie dringlich ist die Situation?','Eine grobe Einordnung reicht für den Leitfaden.',[
          ['low','Beobachten'],['medium','Handlungsbedarf'],['high','Kritisch']
        ]),
        panelStep('Vor-Ort-Werte','Messwerte zum Problem','Erfasse die verfügbaren Werte, die das Fehlerbild beschreiben.'),
        panelStep('Auffälligkeiten und Aufgaben','Feststellungen dokumentieren','Formuliere Beobachtungen und leite bei Bedarf direkt Aufgaben ab.'),
        panelStep('Fotodokumentation','Fotos nur wenn hilfreich','Dokumentiere sichtbare Auffälligkeiten oder relevante Anlagenteile.'),
        panelStep('Strukturierte Dokumentation','Maßnahme und Ergebnis','Halte fest, was geprüft oder verändert wurde und welches Ergebnis vorliegt.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze Gesprächsergebnisse oder Vereinbarungen.'),
        finishStep()
      ];
    }else if(reason==='dosing'){
      steps=[
        choiceStep('dosingTarget','Was soll optimiert werden?','Wähle den Schwerpunkt der Dosierungsprüfung.',[
          ['phosphorus','Phosphatfällung'],['polymer','Polymer'],['product','Produktwechsel'],['consumption','Verbrauch'],['fault','Störung / Dosiertechnik']
        ]),
        panelStep('Vor-Ort-Werte','Ausgangswerte erfassen','Erfasse die für die Dosierung relevanten Betriebswerte.'),
        panelStep('Vergleich der Optimierung','Vorher / Nachher vergleichen','Nutze den Vergleich für Produkt, Dosierung, Kosten oder Ergebnisqualität.'),
        choiceStep('dosingFinding','Gibt es zusätzlich eine Auffälligkeit?','Wenn nein, überspringt der Leitfaden die Fehlerdokumentation.',[
          ['no','Nein, keine weitere Auffälligkeit'],['yes','Ja, dokumentieren']
        ]),
        ...(answers.dosingFinding==='yes'?[panelStep('Auffälligkeiten und Aufgaben','Auffälligkeit festhalten','Dokumentiere die zusätzliche Beobachtung und mögliche Aufgabe.')]:[]),
        panelStep('Strukturierte Dokumentation','Optimierung dokumentieren','Halte Änderung, Ergebnis und Empfehlung fest.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze Vereinbarungen oder nächste Schritte.'),
        finishStep()
      ];
    }else if(reason==='technical'){
      steps=[
        choiceStep('technicalArea','Welche Technik ist betroffen?','Nur der relevante Technikbereich wird als Kontext übernommen.',[
          ['dosing','Dosierstation'],['dewatering','Entwässerung'],['tank','Tankanlage'],['pump','Pumpe'],['measurement','Messtechnik'],['other','Sonstiges']
        ]),
        choiceStep('severity','Wie dringlich ist das Problem?','Eine grobe Einordnung genügt.',[
          ['low','Beobachten'],['medium','Handlungsbedarf'],['high','Kritisch']
        ]),
        panelStep('Auffälligkeiten und Aufgaben','Fehlerbild und Aufgabe','Beschreibe das technische Fehlerbild und erstelle bei Bedarf direkt eine Aufgabe.'),
        panelStep('Fotodokumentation','Technik fotografieren','Fotos helfen bei Ersatzteilen, Service und späterer Abstimmung.'),
        panelStep('Strukturierte Dokumentation','Technische Maßnahme dokumentieren','Halte Prüfung, Änderung, Ergebnis und Empfehlung fest.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze Absprachen oder benötigte Ersatzteile.'),
        finishStep()
      ];
    }else if(reason==='trial'){
      steps=[
        choiceStep('trialPhase','In welcher Phase ist der Versuch?','Der Leitfaden bleibt auf die aktuelle Versuchsphase fokussiert.',[
          ['start','Versuchsstart'],['check','Zwischenkontrolle'],['finish','Versuchsabschluss'],['evaluation','Auswertung']
        ]),
        panelStep('Vor-Ort-Werte','Versuchswerte erfassen','Erfasse nur die Messwerte, die für den Versuch relevant sind.'),
        panelStep('Vergleich der Optimierung','Versuchsvergleich','Stelle Ausgangszustand und aktuellen Zustand gegenüber.'),
        panelStep('Fotodokumentation','Versuch dokumentieren','Fotos können Produkt, Dosierstelle oder Ergebnis festhalten.'),
        panelStep('Strukturierte Dokumentation','Versuchsergebnis dokumentieren','Halte Vorgehen, Ergebnis, Empfehlung und nächste Schritte fest.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze Absprachen zur weiteren Versuchsdauer oder Auswertung.'),
        finishStep()
      ];
    }else if(reason==='complaint'){
      steps=[
        choiceStep('complaintArea','Worauf bezieht sich die Reklamation?','Der Leitfaden strukturiert die Aufnahme nach dem betroffenen Bereich.',[
          ['product','Produkt'],['delivery','Lieferung'],['technical','Technik'],['process','Prozesswirkung'],['other','Sonstiges']
        ]),
        choiceStep('severity','Wie schwerwiegend ist die Reklamation?','Ordne die Situation für die weitere Bearbeitung ein.',[
          ['low','Beobachten'],['medium','Handlungsbedarf'],['high','Kritisch']
        ]),
        panelStep('Auffälligkeiten und Aufgaben','Sachverhalt festhalten','Dokumentiere konkrete Feststellungen und notwendige Aufgaben.'),
        panelStep('Fotodokumentation','Belege dokumentieren','Füge Fotos hinzu, wenn sie den Sachverhalt nachvollziehbar machen.'),
        panelStep('Strukturierte Dokumentation','Reklamation dokumentieren','Halte Ausgangssituation, Prüfung, Ergebnis und weitere Empfehlung fest.'),
        panelStep('Besuchsnotiz','Absprachen festhalten','Dokumentiere Zusagen, Rückmeldungen oder nächste Schritte.'),
        finishStep()
      ];
    }else if(reason==='other'){
      steps=[
        panelStep('Auffälligkeiten und Aufgaben','Relevante Punkte festhalten','Dokumentiere nur die Themen, die sich während des Besuchs ergeben.'),
        panelStep('Strukturierte Dokumentation','Besuch dokumentieren','Halte Ausgangssituation, Tätigkeit, Ergebnis und Empfehlung fest.'),
        panelStep('Besuchsnotiz','Abschlussnotiz','Ergänze Gesprächsergebnisse oder Vereinbarungen.'),
        finishStep()
      ];
    }
    return steps;
  }

  function firstIntakeSteps(state){
    if(state.intakePhase==='post-transfer'){
      return [
        panelStep('Fotodokumentation','Anlage fotografisch ergänzen','Füge bei Bedarf einige aussagekräftige Fotos zur Erstaufnahme hinzu.'),
        panelStep('Auffälligkeiten und Aufgaben','Offene Punkte festhalten','Halte fehlende Informationen oder direkt erkannte Maßnahmen als Aufgabe fest.'),
        panelStep('Besuchsnotiz','Erstaufnahme zusammenfassen','Ergänze eine kurze Abschlussnotiz zur neu aufgenommenen Anlage.'),
        finishStep('Erstaufnahme abschließen','Die Anlagenakte wurde ergänzt. Schließe jetzt den Erstbesuch ab.')
      ];
    }
    const intake=state.intake||{};
    return [
      {kind:'intake-process',title:'Anlage verfahrenstechnisch einordnen'},
      {kind:'intake-systems',title:'Welche Technik ist vor Ort vorhanden?'},
      ...(intake.dosingPresent==='yes'?[{kind:'intake-dosing',title:'Dosierung kurz aufnehmen'}]:[]),
      ...(intake.dewateringPresent==='yes'?[{kind:'intake-dewatering',title:'Schlammentwässerung aufnehmen'}]:[]),
      {kind:'intake-access',title:'Zugang und Vor-Ort-Hinweise'},
      {kind:'intake-review',title:'Erstaufnahme prüfen'}
    ];
  }
  function currentSteps(state){return state.mode==='first-intake'?firstIntakeSteps(state):normalSteps(state)}

  function panels(workspace){return [...workspace.children].filter(child=>child.classList.contains('visit-panel'))}
  function panelByTitle(workspace,title){return panels(workspace).find(panel=>panel.querySelector('h2')?.textContent.trim()===title)||null}
  function applyPanelVisibility(workspace,state,step){
    const list=panels(workspace);
    if(state.showAll){list.forEach(panel=>panel.classList.remove('visit-guide-hidden'));return}
    list.forEach(panel=>panel.classList.add('visit-guide-hidden'));
    const checklist=panelByTitle(workspace,'Besuchscheckliste');
    checklist?.classList.add('visit-guide-hidden');
    if(step?.kind==='panel')panelByTitle(workspace,step.panel)?.classList.remove('visit-guide-hidden');
  }
  function answerText(id,value){return LABELS[id]?.[value]||value||''}
  function reasonLabel(reason){return REASONS.find(([id])=>id===reason)?.[1]||''}
  function contextItems(state){
    const items=[];
    if(state.reason)items.push(['Anlass',reasonLabel(state.reason)]);
    for(const [id,value] of Object.entries(state.answers||{})){
      const label={operationalState:'Anlagenzustand',problemArea:'Bereich',severity:'Dringlichkeit',dosingTarget:'Schwerpunkt',dosingFinding:'Auffälligkeit',technicalArea:'Technikbereich',trialPhase:'Versuchsphase',complaintArea:'Reklamationsbereich'}[id];
      if(label&&value)items.push([label,answerText(id,value)]);
    }
    return items;
  }
  function prefillReportContext(state,workspace){
    if(state.mode!=='standard')return;
    const textarea=workspace.querySelector('[name="vr.initialSituation"]');
    if(!textarea||textarea.value.trim())return;
    const items=contextItems(state);
    if(!items.length)return;
    textarea.value=`Leitfaden: ${items.map(([label,value])=>`${label}: ${value}`).join(' · ')}`;
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function syncOverviewProgress(root,state,steps){
    const progressCard=root.querySelector('.visit-overview article:first-child');
    if(!progressCard)return;
    const strong=progressCard.querySelector('strong');
    const span=progressCard.querySelector(':scope > span');
    const bar=progressCard.querySelector('.visit-progress span');
    const total=Math.max(1,steps.length);
    const done=Math.min(total,state.step);
    if(span)span.textContent=state.mode==='first-intake'?'Erstaufnahme':'Leitfaden';
    if(strong)strong.textContent=`${done}/${total}`;
    if(bar)bar.style.width=`${Math.round(done/total*100)}%`;
  }

  function guideHeader(state,steps){
    const modeLabel=state.mode==='first-intake'?'Erstaufnahme vor Ort':'Interaktiver Besuchsleitfaden';
    const total=Math.max(1,steps.length);
    const current=Math.min(total,state.step+1);
    return `<div class="visit-guide-head"><div><p class="eyebrow">${escapeHtml(modeLabel)}</p><h2>${state.mode==='first-intake'?'Neue Anlage strukturiert aufnehmen':'Schritt für Schritt durch den Besuch'}</h2><p>${state.mode==='first-intake'?'Nur relevante Angaben werden abgefragt und anschließend in die Anlagenakte übertragen.':'Antworten steuern, welche Bereiche als Nächstes erscheinen. Irrelevante Abschnitte bleiben verborgen.'}</p></div><div class="visit-guide-head-actions"><span>${current} / ${total}</span><button type="button" class="button secondary compact" data-guide-toggle-all>${state.showAll?'Geführte Ansicht':'Alle Bereiche'}</button></div></div>`;
  }
  function contextHtml(state){
    const items=contextItems(state);
    return items.length?`<div class="visit-guide-context">${items.map(([label,value])=>`<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`).join('')}</div>`:'';
  }
  function choiceHtml(step,state){
    const selected=state.answers?.[step.id]||'';
    return `<div class="visit-guide-question"><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text||'')}</p><div class="visit-guide-choice-grid">${step.options.map(option=>{
      const [value,label,description='']=option;
      return `<button type="button" class="visit-guide-choice ${selected===value?'selected':''}" data-guide-choice="${escapeHtml(value)}"><strong>${escapeHtml(label)}</strong>${description?`<small>${escapeHtml(description)}</small>`:''}</button>`;
    }).join('')}</div></div>`;
  }
  function navigationHtml(state,{next=true,nextLabel='Weiter'}={}){
    return `<div class="visit-guide-nav">${state.step>0?'<button type="button" class="button secondary" data-guide-back>Zurück</button>':'<span></span>'}${next?`<button type="button" class="button primary" data-guide-next>${escapeHtml(nextLabel)}</button>`:''}</div>`;
  }
  function panelStepHtml(step,state){
    return `<div class="visit-guide-question"><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text||'')}</p><div class="visit-guide-current-panel">Der passende Arbeitsbereich ist direkt unter diesem Leitfaden eingeblendet.</div></div>${navigationHtml(state)}`;
  }
  function intakeProcessHtml(state){
    const x=state.intake;
    const processes=[['activated-sludge','Belebtschlammverfahren'],['sbr','SBR'],['mbr','Membranbelebungsverfahren (MBR)'],['trickling-filter','Tropfkörper'],['rotating-biological-contactor','Scheibentauchkörper'],['mbbr','MBBR'],['fixed-bed','Festbettverfahren'],['biofilter','Biofilter'],['constructed-wetland','Pflanzenkläranlage'],['lagoon','Abwasserteich / Lagune'],['anaerobic','Anaerobes Verfahren'],['physico-chemical','Physikalisch-chemisches Verfahren'],['other','Sonstiges']];
    return `<form class="visit-guide-form" data-intake-form="process"><h3>Wie ist die Anlage grundsätzlich aufgebaut?</h3><p>Nur die wichtigsten Eckdaten. Details können später ergänzt werden.</p><div class="visit-guide-form-grid"><label>Hauptverfahren<select name="mainProcess">${processes.map(([value,label])=>`<option value="${value}" ${x.mainProcess===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Ausbaugröße [EW]<input name="capacityPE" type="number" inputmode="numeric" value="${escapeHtml(x.capacityPE||'')}"></label><label>Tatsächliche Belastung [EW]<input name="actualPE" type="number" inputmode="numeric" value="${escapeHtml(x.actualPE||'')}"></label></div>${navigationHtml(state,{next:false})}<div class="visit-guide-form-submit"><button class="button primary" type="submit">Übernehmen und weiter</button></div></form>`;
  }
  function intakeSystemsHtml(state){
    const x=state.intake;
    return `<form class="visit-guide-form" data-intake-form="systems"><h3>Welche Bereiche sind vorhanden?</h3><p>Nur wenn ein Bereich vorhanden ist, folgen Detailfragen dazu.</p><div class="visit-guide-binary-grid"><label class="visit-guide-binary"><input type="radio" name="dosingPresent" value="yes" ${x.dosingPresent==='yes'?'checked':''}><span><strong>Dosierung vorhanden</strong><small>Fällmittel, Polymer oder andere Chemie</small></span></label><label class="visit-guide-binary"><input type="radio" name="dosingPresent" value="no" ${x.dosingPresent==='no'?'checked':''}><span><strong>Keine Dosierung</strong></span></label><label class="visit-guide-binary"><input type="radio" name="dewateringPresent" value="yes" ${x.dewateringPresent==='yes'?'checked':''}><span><strong>Schlammentwässerung vorhanden</strong></span></label><label class="visit-guide-binary"><input type="radio" name="dewateringPresent" value="no" ${x.dewateringPresent==='no'?'checked':''}><span><strong>Keine eigene Entwässerung</strong></span></label></div>${navigationHtml(state,{next:false})}<div class="visit-guide-form-submit"><button class="button primary" type="submit">Übernehmen und weiter</button></div></form>`;
  }
  function intakeDosingHtml(state){
    const x=state.intake;
    return `<form class="visit-guide-form" data-intake-form="dosing"><h3>Dosierung kurz aufnehmen</h3><p>Für die Erstaufnahme reichen Zweck und eingesetztes Produkt.</p><div class="visit-guide-form-grid"><label>Verwendungszweck<select name="dosingPurpose"><option value="precipitant" ${x.dosingPurpose==='precipitant'?'selected':''}>Fällmittel</option><option value="polymer" ${x.dosingPurpose==='polymer'?'selected':''}>Polymer</option><option value="carbon" ${x.dosingPurpose==='carbon'?'selected':''}>Kohlenstoffquelle</option><option value="neutralization" ${x.dosingPurpose==='neutralization'?'selected':''}>Neutralisationsmittel</option><option value="defoamer" ${x.dosingPurpose==='defoamer'?'selected':''}>Entschäumer</option><option value="other" ${x.dosingPurpose==='other'?'selected':''}>Sonstiges</option></select></label><label>Produkt / Medium<input name="dosingProduct" value="${escapeHtml(x.dosingProduct||'')}" placeholder="z. B. PAC"></label><label>Hersteller Dosierstation<input name="dosingManufacturer" value="${escapeHtml(x.dosingManufacturer||'')}"></label></div>${navigationHtml(state,{next:false})}<div class="visit-guide-form-submit"><button class="button primary" type="submit">Übernehmen und weiter</button></div></form>`;
  }
  function intakeDewateringHtml(state){
    const x=state.intake;
    return `<form class="visit-guide-form" data-intake-form="dewatering"><h3>Welche Entwässerung steht vor Ort?</h3><p>Maschinentyp und Fabrikat reichen für die erste Aufnahme.</p><div class="visit-guide-form-grid"><label>Verfahren<select name="dewateringProcess"><option value="screw-press" ${x.dewateringProcess==='screw-press'?'selected':''}>Schneckenpresse</option><option value="belt-press" ${x.dewateringProcess==='belt-press'?'selected':''}>Siebbandpresse</option><option value="filter-press" ${x.dewateringProcess==='filter-press'?'selected':''}>Kammerfilterpresse</option><option value="centrifuge" ${x.dewateringProcess==='centrifuge'?'selected':''}>Zentrifuge</option><option value="mobile" ${x.dewateringProcess==='mobile'?'selected':''}>Mobile Entwässerung</option><option value="dryingBed" ${x.dewateringProcess==='dryingBed'?'selected':''}>Trockenbeet</option><option value="other" ${x.dewateringProcess==='other'?'selected':''}>Sonstiges</option></select></label><label>Hersteller<input name="dewateringManufacturer" value="${escapeHtml(x.dewateringManufacturer||'')}"></label><label>Typ / Modell<input name="dewateringModel" value="${escapeHtml(x.dewateringModel||'')}"></label><label>Baujahr<input name="dewateringYear" type="number" inputmode="numeric" value="${escapeHtml(x.dewateringYear||'')}"></label></div>${navigationHtml(state,{next:false})}<div class="visit-guide-form-submit"><button class="button primary" type="submit">Übernehmen und weiter</button></div></form>`;
  }
  function intakeAccessHtml(state){
    const x=state.intake;
    return `<form class="visit-guide-form" data-intake-form="access"><h3>Was muss man für den nächsten Besuch wissen?</h3><p>Diese Angaben landen direkt im Bereich Zufahrt und Besuch.</p><div class="visit-guide-form-grid"><label>Parkmöglichkeit<input name="parking" value="${escapeHtml(x.parking||'')}"></label><label>Tor / Zufahrt<input name="gate" value="${escapeHtml(x.gate||'')}"></label><label>Anmeldung vor Ort<input name="registration" value="${escapeHtml(x.registration||'')}"></label><label>Erforderliche PSA<input name="ppe" value="${escapeHtml(x.ppe||'')}"></label></div>${navigationHtml(state,{next:false})}<div class="visit-guide-form-submit"><button class="button primary" type="submit">Übernehmen und weiter</button></div></form>`;
  }
  function intakeReviewHtml(state,plant){
    const x=state.intake;
    const rows=[
      ['Hauptverfahren',x.mainProcess||'–'],['Ausbaugröße',x.capacityPE?`${x.capacityPE} EW`:'–'],['Belastung',x.actualPE?`${x.actualPE} EW`:'–'],
      ['Dosierung',x.dosingPresent==='yes'?[x.dosingProduct,x.dosingPurpose].filter(Boolean).join(' · ')||'vorhanden':'nicht erfasst / nicht vorhanden'],
      ['Entwässerung',x.dewateringPresent==='yes'?[x.dewateringManufacturer,x.dewateringModel].filter(Boolean).join(' ')||x.dewateringProcess||'vorhanden':'nicht erfasst / nicht vorhanden'],
      ['Zugang',[x.gate,x.registration,x.ppe].filter(Boolean).join(' · ')||'–']
    ];
    return `<div class="visit-guide-question"><h3>Erstaufnahme für ${escapeHtml(plant?.master?.name||'die neue Anlage')}</h3><p>Die Angaben werden zuerst in das bestehende Anlagenformular eingetragen. Du kannst sie dort prüfen, bevor sie endgültig gespeichert werden.</p><dl class="visit-guide-review">${rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><div class="visit-guide-transfer-note">Nach dem Speichern der Anlagenakte führt dich die App automatisch zurück zu diesem Erstbesuch.</div></div><div class="visit-guide-nav">${state.step>0?'<button type="button" class="button secondary" data-guide-back>Zurück</button>':'<span></span>'}<button type="button" class="button primary" data-intake-transfer>In Anlagenakte übernehmen</button></div>`;
  }
  function finishHtml(step,state){
    return `<div class="visit-guide-question visit-guide-finish"><span class="visit-guide-finish-icon">✓</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text||'')}</p><p>Der vorhandene Abschlussdialog schlägt anschließend passende Aufgaben oder Folgetermine vor.</p></div><div class="visit-guide-nav">${state.step>0?'<button type="button" class="button secondary" data-guide-back>Zurück</button>':'<span></span>'}<button type="button" class="button primary" data-guide-finish>Besuch beenden</button></div>`;
  }
  function stepBody(step,state,plant){
    if(!step)return '<div class="visit-guide-question"><h3>Leitfaden abgeschlossen</h3></div>';
    if(step.kind==='choice')return choiceHtml(step,state);
    if(step.kind==='panel')return panelStepHtml(step,state);
    if(step.kind==='intake-process')return intakeProcessHtml(state);
    if(step.kind==='intake-systems')return intakeSystemsHtml(state);
    if(step.kind==='intake-dosing')return intakeDosingHtml(state);
    if(step.kind==='intake-dewatering')return intakeDewateringHtml(state);
    if(step.kind==='intake-access')return intakeAccessHtml(state);
    if(step.kind==='intake-review')return intakeReviewHtml(state,plant);
    if(step.kind==='finish')return finishHtml(step,state);
    return '';
  }

  function renderReasonStart(panel,state,plant,visit){
    panel.innerHTML=`${guideHeader(state,[{kind:'reason'}])}<div class="visit-guide-question"><h3>Was ist heute der Hauptgrund für den Besuch?</h3><p>Der Leitfaden zeigt danach nur die für diesen Besuch relevanten Bereiche.</p><div class="visit-guide-choice-grid reason-grid">${REASONS.map(([value,label,description])=>`<button type="button" class="visit-guide-choice" data-guide-reason="${value}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></button>`).join('')}</div></div>`;
    panel.querySelectorAll('[data-guide-reason]').forEach(button=>button.onclick=()=>{
      state.reason=button.dataset.guideReason;
      state.step=0;
      state.answers={};
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    });
    bindCommonGuideActions(panel,state,plant,visit);
  }
  function renderClassic(panel,state,plant,visit,steps){
    panel.innerHTML=`${guideHeader(state,steps)}<div class="visit-guide-question"><h3>Alle Besuchsbereiche sind eingeblendet</h3><p>Du kannst jederzeit wieder in die geführte Ansicht wechseln. Deine bisherigen Leitfaden-Antworten bleiben erhalten.</p></div>`;
    bindCommonGuideActions(panel,state,plant,visit);
  }
  function bindCommonGuideActions(panel,state,plant,visit){
    panel.querySelector('[data-guide-toggle-all]')?.addEventListener('click',()=>{
      state.showAll=!state.showAll;
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    });
  }
  function bindStepActions(panel,state,plant,visit,step,steps){
    bindCommonGuideActions(panel,state,plant,visit);
    panel.querySelectorAll('[data-guide-choice]').forEach(button=>button.onclick=()=>{
      state.answers[step.id]=button.dataset.guideChoice;
      state.step=Math.min(state.step+1,currentSteps(state).length-1);
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    });
    panel.querySelector('[data-guide-back]')?.addEventListener('click',()=>{
      state.step=Math.max(0,state.step-1);
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    });
    panel.querySelector('[data-guide-next]')?.addEventListener('click',()=>{
      state.step=Math.min(state.step+1,currentSteps(state).length-1);
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    });
    panel.querySelector('[data-guide-finish]')?.addEventListener('click',()=>{
      document.querySelector('#finishVisit')?.click();
    });
    panel.querySelectorAll('[data-intake-form]').forEach(form=>form.addEventListener('submit',event=>{
      event.preventDefault();
      const fd=new FormData(form);
      for(const [key,value] of fd.entries())state.intake[key]=String(value||'').trim();
      state.step=Math.min(state.step+1,currentSteps(state).length-1);
      saveGuideState(plant.id,visit.id,state);
      refreshGuide();
    }));
    panel.querySelector('[data-intake-transfer]')?.addEventListener('click',()=>beginIntakeTransfer(plant,visit,state));
  }

  function enhanceVisitMode(){
    const root=document.querySelector('#applicationView');
    const workspace=root?.querySelector('.visit-workspace');
    if(!root||!workspace||root.querySelector('#visitGuideEnhancement'))return;
    const context=currentVisitContext();
    if(!context)return;
    const {plant,visit}=context;
    const state=ensureGuideState(plant,visit);
    const steps=currentSteps(state);
    if(state.step>=steps.length)state.step=Math.max(0,steps.length-1);
    const step=steps[state.step];
    applyPanelVisibility(workspace,state,step);
    if(step?.kind==='panel'&&step.panel==='Strukturierte Dokumentation')prefillReportContext(state,workspace);
    syncOverviewProgress(root,state,steps);
    const panel=document.createElement('section');
    panel.id='visitGuideEnhancement';
    panel.className='visit-guide-panel';
    const overview=root.querySelector('.visit-overview');
    if(overview)overview.insertAdjacentElement('afterend',panel);else workspace.insertAdjacentElement('beforebegin',panel);
    if(state.showAll){
      renderClassic(panel,state,plant,visit,steps);
      return;
    }
    if(state.mode==='standard'&&!state.reason){
      renderReasonStart(panel,state,plant,visit);
      return;
    }
    panel.innerHTML=`${guideHeader(state,steps)}${contextHtml(state)}${stepBody(step,state,plant)}`;
    bindStepActions(panel,state,plant,visit,step,steps);
  }
  function refreshGuide(){
    document.querySelector('#visitGuideEnhancement')?.remove();
    const workspace=document.querySelector('.visit-workspace');
    if(workspace)panels(workspace).forEach(panel=>panel.classList.remove('visit-guide-hidden'));
    requestAnimationFrame(enhanceVisitMode);
  }

  function armNewPlantPrompt(form){
    const heading=form.querySelector('.page-header h1')?.textContent.trim()||'';
    if(heading!=='Neue Anlage')return;
    writeJson(sessionStorage,NEW_PLANT_PENDING,{beforeIds:readPlants().map(plant=>plant.id),createdAt:Date.now()});
  }
  function showFirstIntakePrompt(plant){
    if(document.querySelector('#firstIntakePrompt'))return;
    const dialog=document.createElement('dialog');
    dialog.id='firstIntakePrompt';
    dialog.className='first-intake-dialog';
    dialog.innerHTML=`<div class="first-intake-dialog-content"><span class="first-intake-icon">⌖</span><p class="eyebrow">Neue Anlage angelegt</p><h2>Erstaufnahme vor Ort starten?</h2><p><strong>${escapeHtml(plant?.master?.name||'Neue Anlage')}</strong> ist gespeichert. Wenn du gerade vor Ort bist, führt dich der Leitfaden jetzt durch die wichtigsten Anlagen- und Technikdaten.</p><div class="first-intake-dialog-actions"><button type="button" class="button primary" data-first-intake-start>Erstaufnahme jetzt starten</button><button type="button" class="button secondary" data-first-intake-skip>Nur Anlage speichern</button></div></div>`;
    document.body.appendChild(dialog);
    const close=()=>{try{dialog.close()}catch{}dialog.remove()};
    dialog.querySelector('[data-first-intake-skip]').onclick=close;
    dialog.querySelector('[data-first-intake-start]').onclick=()=>{
      writeJson(sessionStorage,FIRST_INTAKE_START,{plantId:plant.id,createdAt:Date.now()});
      close();
      const start=document.querySelector('#startVisit')||document.querySelector('#startVisitCockpit');
      if(start)start.click();
    };
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function handleNewPlantPrompt(){
    const pending=readJson(sessionStorage,NEW_PLANT_PENDING,null);
    if(!pending||Date.now()-(pending.createdAt||0)>MAX_PENDING_AGE){
      if(pending)sessionStorage.removeItem(NEW_PLANT_PENDING);
      return;
    }
    if(!document.querySelector('#startVisit'))return;
    const before=new Set(Array.isArray(pending.beforeIds)?pending.beforeIds:[]);
    const rows=readPlants();
    const candidates=rows.filter(plant=>!before.has(plant.id));
    if(!candidates.length)return;
    const currentId=activePlantId();
    const created=candidates.find(plant=>plant.id===currentId)||candidates[0];
    sessionStorage.removeItem(NEW_PLANT_PENDING);
    showFirstIntakePrompt(created);
  }

  function transferState(){return readJson(sessionStorage,INTAKE_TRANSFER,null)}
  function saveTransfer(value){writeJson(sessionStorage,INTAKE_TRANSFER,value)}
  function clearTransfer(){sessionStorage.removeItem(INTAKE_TRANSFER)}
  function beginIntakeTransfer(plant,visit,state){
    state.intakePhase='transferring';
    saveGuideState(plant.id,visit.id,state);
    saveTransfer({plantId:plant.id,visitId:visit.id,data:state.intake,phase:'open-edit',createdAt:Date.now()});
    document.querySelector('#leaveVisit')?.click();
    scheduleEnhancement();
  }
  function setFormValue(form,name,value){
    if(value===undefined||value===null||String(value).trim()==='')return;
    const element=form.elements.namedItem(name);
    if(!element)return;
    element.value=String(value);
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function setFormCheckbox(form,name,checked){
    const element=form.elements.namedItem(name);
    if(!element)return;
    element.checked=Boolean(checked);
    element.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function applyIntakeToPlantForm(form,transfer){
    if(form.dataset.firstIntakePrefilled==='true')return;
    form.dataset.firstIntakePrefilled='true';
    const x=transfer.data||{};
    setFormValue(form,'master.mainProcess',x.mainProcess);
    setFormValue(form,'master.capacityPE',x.capacityPE);
    setFormValue(form,'master.actualPE',x.actualPE);
    setFormValue(form,'access.parking',x.parking);
    setFormValue(form,'access.gate',x.gate);
    setFormValue(form,'access.registration',x.registration);
    setFormValue(form,'access.ppe',x.ppe);
    if(x.dewateringPresent==='yes'){
      setFormCheckbox(form,'sludgeDewatering.enabled',true);
      setFormValue(form,'sludgeDewatering.process',x.dewateringProcess);
      setFormValue(form,'sludgeDewatering.manufacturer',x.dewateringManufacturer);
      setFormValue(form,'sludgeDewatering.model',x.dewateringModel);
      setFormValue(form,'sludgeDewatering.year',x.dewateringYear);
    }else if(x.dewateringPresent==='no'){
      setFormCheckbox(form,'sludgeDewatering.enabled',false);
    }
    if(x.dosingPresent==='yes'){
      if(!form.elements.namedItem('dosing.0.purpose'))document.querySelector('#addDosingSystem')?.click();
      setFormValue(form,'dosing.0.purpose',x.dosingPurpose);
      setFormValue(form,'dosing.0.productName',x.dosingProduct);
      setFormValue(form,'dosing.0.stationManufacturer',x.dosingManufacturer);
      setFormValue(form,'dosing.0.name',x.dosingProduct?`Dosierung ${x.dosingProduct}`:'Dosieranlage 1');
    }
    const banner=document.createElement('div');
    banner.className='first-intake-transfer-banner';
    banner.innerHTML='<strong>Daten aus der Erstaufnahme wurden eingetragen.</strong><span>Bitte kurz prüfen und anschließend unten „Anlage speichern“ wählen. Danach geht es automatisch zurück zum Besuch.</span>';
    form.querySelector('.page-header')?.insertAdjacentElement('afterend',banner);
    transfer.phase='await-save';
    saveTransfer(transfer);
  }
  function handleTransferWorkflow(){
    const transfer=transferState();
    if(!transfer)return;
    if(Date.now()-(transfer.createdAt||0)>MAX_PENDING_AGE){clearTransfer();return}
    if(transfer.plantId!==activePlantId())return;
    if(transfer.phase==='open-edit'){
      const edit=document.querySelector('#editPlant');
      if(edit){transfer.phase='opening-edit';saveTransfer(transfer);edit.click();}
      return;
    }
    if(transfer.phase==='opening-edit'||transfer.phase==='prefill'){
      const form=document.querySelector('#plantForm');
      const heading=form?.querySelector('.page-header h1')?.textContent.trim();
      if(form&&heading==='Anlage bearbeiten'){
        transfer.phase='prefill';saveTransfer(transfer);applyIntakeToPlantForm(form,transfer);
      }
      return;
    }
    if(transfer.phase==='return-dashboard'){
      const visitsButton=document.querySelector('[data-plant-page="visits"]');
      if(visitsButton){transfer.phase='open-visits';saveTransfer(transfer);visitsButton.click();}
      return;
    }
    if(transfer.phase==='open-visits'){
      const visitButton=document.querySelector(`[data-open-visit="${CSS.escape(transfer.visitId)}"]`);
      if(visitButton){
        const state=getGuideState(transfer.plantId,transfer.visitId)||{};
        state.mode='first-intake';state.intakePhase='post-transfer';state.step=0;state.showAll=false;
        saveGuideState(transfer.plantId,transfer.visitId,state);
        clearTransfer();
        visitButton.click();
      }
    }
  }

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='plantForm')return;
    armNewPlantPrompt(form);
    const transfer=transferState();
    if(transfer?.phase==='await-save'&&transfer.plantId===activePlantId()){
      transfer.phase='return-dashboard';
      saveTransfer(transfer);
    }
  },true);

  let scheduled=false;
  function scheduleEnhancement(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      try{
        handleNewPlantPrompt();
        handleTransferWorkflow();
        enhanceVisitMode();
      }catch(error){console.warn('Besuchsleitfaden konnte nicht aktualisiert werden.',error)}
    });
  }
  const observer=new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',scheduleEnhancement);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleEnhancement()});
  document.addEventListener('DOMContentLoaded',scheduleEnhancement,{once:true});
  scheduleEnhancement();
})();
