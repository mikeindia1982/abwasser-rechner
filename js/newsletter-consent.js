(() => {
  const BUILD='0.11.0-alpha.74-newsletter-consent1';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PROFILE_KEY='abwasser-employee-profile-v087';
  const CONFIG_KEY='vta-newsletter-consent-config-v1';
  const REGISTRY_KEY='abwasser-marketing-consent-registry-v1';
  const CONSENT_TEXT_VERSION='newsletter-email-v1.0-2026-08-21';
  const PURPOSE='email-newsletter';
  const CHANNEL='email';
  let queued=false;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);
  const makeId=()=>globalThis.crypto?.randomUUID?.()||`consent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const normalizeEmail=value=>String(value||'').trim().toLowerCase();
  const emailValid=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  const nowIso=()=>new Date().toISOString();
  const formatDate=value=>{
    const date=new Date(value||'');
    return Number.isNaN(date.getTime())?'–':date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'});
  };

  function readJson(key,fallback){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      return parsed??fallback;
    }catch{return fallback}
  }
  function readPlants(){
    const value=readJson(PLANTS_KEY,[]);
    return Array.isArray(value)?value:[];
  }
  function activePlant(){
    const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
    return readPlants().find(plant=>String(plant?.id||'')===String(id))||null;
  }
  function employeeName(){
    const profile=readJson(PROFILE_KEY,{});
    const full=[profile?.firstName,profile?.lastName].map(v=>String(v||'').trim()).filter(Boolean).join(' ');
    return full||'Lokaler Benutzer';
  }
  function profileCompany(){
    return String(readJson(PROFILE_KEY,{})?.company||'').trim();
  }

  function loadConfig(){
    const source=readJson(CONFIG_KEY,{});
    return {
      controller:String(source?.controller||'').trim(),
      privacyUrl:String(source?.privacyUrl||'').trim(),
      withdrawalEmail:String(source?.withdrawalEmail||'').trim(),
      updatedAt:String(source?.updatedAt||'')
    };
  }
  function privacyUrlValid(value){
    try{
      const url=new URL(String(value||''));
      return url.protocol==='https:'||url.protocol==='http:';
    }catch{return false}
  }
  function configErrors(config=loadConfig()){
    const errors=[];
    if(config.controller.length<3)errors.push('vollständige Firmierung des Verantwortlichen');
    if(!privacyUrlValid(config.privacyUrl))errors.push('gültige URL zum Datenschutzhinweis');
    if(!emailValid(config.withdrawalEmail))errors.push('gültige E-Mail-Adresse für Widerrufe');
    return errors;
  }
  function configReady(config=loadConfig()){return configErrors(config).length===0}

  function loadRegistry(){
    const source=readJson(REGISTRY_KEY,{});
    return {
      schemaVersion:1,
      events:Array.isArray(source?.events)?source.events:[]
    };
  }
  function saveRegistry(registry){
    localStorage.setItem(REGISTRY_KEY,JSON.stringify({schemaVersion:1,events:registry.events||[]}));
    window.dispatchEvent(new CustomEvent('vta:newsletter-consent-updated'));
  }
  function appendEvent(payload){
    const registry=loadRegistry();
    const event={id:makeId(),createdAt:nowIso(),...payload};
    registry.events.push(event);
    saveRegistry(registry);
    return event;
  }
  function relevantEvents(plantId,contactName,email){
    const normalizedEmail=normalizeEmail(email);
    return loadRegistry().events.filter(event=>{
      if(String(event?.plantId||'')!==String(plantId||''))return false;
      if(event?.purpose!==PURPOSE||event?.channel!==CHANNEL)return false;
      if(normalizedEmail&&normalizeEmail(event?.email)===normalizedEmail)return true;
      return !normalizedEmail&&String(contactName||'').trim()&&String(event?.contactName||'').trim()===String(contactName||'').trim();
    });
  }
  function latestEvent(plantId,contactName,email){
    return relevantEvents(plantId,contactName,email).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null;
  }
  function statusMeta(event){
    if(!event)return {label:'Nicht erfasst',tone:'idle',detail:'Noch keine Newsletter-Entscheidung dokumentiert.'};
    if(event.status==='confirmed')return {label:'Bestätigt',tone:'confirmed',detail:`Double-Opt-In bestätigt am ${formatDate(event.createdAt)}.`};
    if(event.status==='pending')return {label:'Bestätigung ausstehend',tone:'pending',detail:'Vor-Ort-Einwilligung dokumentiert. Newsletter-Versand erst nach Double-Opt-In.'};
    if(event.status==='revoked')return {label:'Widerrufen',tone:'revoked',detail:`Widerruf dokumentiert am ${formatDate(event.createdAt)}.`};
    if(event.status==='declined')return {label:'Keine Einwilligung',tone:'declined',detail:`Keine Einwilligung dokumentiert am ${formatDate(event.createdAt)}.`};
    return {label:'Nicht erfasst',tone:'idle',detail:'Noch keine Newsletter-Entscheidung dokumentiert.'};
  }

  function consentText(config){
    return `Ich willige ein, dass ${config.controller} meine angegebene E-Mail-Adresse verwendet, um mir in unregelmäßigen Abständen per E-Mail Newsletter und Fachinformationen zu Produkten und Anwendungen, Dienstleistungen, Veranstaltungen sowie Unternehmensneuigkeiten aus dem Bereich Wasser- und Abwassertechnik zuzusenden. Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden, insbesondere per E-Mail an ${config.withdrawalEmail}. Weitere Informationen zur Datenverarbeitung: ${config.privacyUrl}`;
  }

  function currentVisit(plant){
    const visits=Array.isArray(plant?.visits)?plant.visits:[];
    const active=visits.filter(visit=>visit?.modeStatus==='active').sort((a,b)=>String(b.startedAt||b.start||'').localeCompare(String(a.startedAt||a.start||'')))[0];
    if(active)return active;
    return [...visits].sort((a,b)=>String(b.startedAt||b.start||'').localeCompare(String(a.startedAt||a.start||'')))[0]||null;
  }
  function selectedContact(plant,visit,name=''){
    const contacts=Array.isArray(plant?.contacts)?plant.contacts:[];
    const requested=String(name||visit?.contact||'').trim();
    return contacts.find(contact=>String(contact?.name||'').trim()===requested)||contacts.find(contact=>emailValid(contact?.email))||contacts[0]||null;
  }
  function reviewKey(plant,visit){return `vta-newsletter-review:${plant?.id||''}:${visit?.id||''}`}
  function markReviewed(plant,visit){try{sessionStorage.setItem(reviewKey(plant,visit),'1')}catch{}}
  function wasReviewed(plant,visit){try{return sessionStorage.getItem(reviewKey(plant,visit))==='1'}catch{return false}}

  function closeDialog(dialog){
    if(dialog?.open)dialog.close();
    else dialog?.remove();
  }
  function createDialog(className){
    document.querySelector(`dialog.${className}`)?.remove();
    const dialog=document.createElement('dialog');
    dialog.className=className;
    document.body.appendChild(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    return dialog;
  }

  function openConsentDialog({plant,visit,contactName,email,onSaved}){
    const config=loadConfig();
    const errors=configErrors(config);
    if(errors.length){
      alert(`Newsletter-Einwilligung ist noch nicht freigeschaltet. Bitte in Einstellungen → Newsletter ergänzen: ${errors.join(', ')}.`);
      return;
    }
    if(!String(contactName||'').trim())return alert('Bitte zuerst einen Ansprechpartner auswählen.');
    if(!emailValid(email))return alert('Bitte eine gültige E-Mail-Adresse des Ansprechpartners eintragen.');
    const text=consentText(config);
    const dialog=createDialog('newsletter-consent-dialog');
    dialog.innerHTML=`<div class="newsletter-consent-dialog-card">
      <button type="button" class="newsletter-dialog-close" aria-label="Schließen">×</button>
      <p class="eyebrow">Freiwillige Einwilligung</p>
      <h2>Newsletter & Fachinformationen</h2>
      <div class="newsletter-handover-note"><strong>Bitte das Gerät an den Ansprechpartner übergeben.</strong><span>Die Einwilligung darf nicht vorausgewählt oder vorausgesetzt werden.</span></div>
      <dl class="newsletter-consent-person"><div><dt>Person</dt><dd>${esc(contactName)}</dd></div><div><dt>E-Mail</dt><dd>${esc(email)}</dd></div><div><dt>Verantwortlicher</dt><dd>${esc(config.controller)}</dd></div></dl>
      <div class="newsletter-consent-text">${esc(text)}</div>
      <label class="newsletter-consent-check"><input type="checkbox" data-newsletter-affirm><span>Ja, ich willige wie oben beschrieben in den Erhalt der E-Mails ein.</span></label>
      <p class="newsletter-consent-legal-note">Die Vor-Ort-Bestätigung wird als Nachweis gespeichert. Der Newsletter-Status bleibt bis zu einer technischen E-Mail-Bestätigung (Double-Opt-In) auf „ausstehend“.</p>
      <div class="newsletter-dialog-actions"><button type="button" class="button secondary" data-newsletter-cancel>Abbrechen</button><button type="button" class="button primary" data-newsletter-confirm disabled>Einwilligung erteilen</button></div>
    </div>`;
    const checkbox=dialog.querySelector('[data-newsletter-affirm]');
    const confirmButton=dialog.querySelector('[data-newsletter-confirm]');
    checkbox.addEventListener('change',()=>{confirmButton.disabled=!checkbox.checked});
    dialog.querySelector('.newsletter-dialog-close').onclick=()=>closeDialog(dialog);
    dialog.querySelector('[data-newsletter-cancel]').onclick=()=>closeDialog(dialog);
    confirmButton.onclick=()=>{
      if(!checkbox.checked)return;
      const previous=latestEvent(plant.id,contactName,email);
      const event=appendEvent({
        eventType:'consent',status:'pending',purpose:PURPOSE,channel:CHANNEL,
        plantId:String(plant.id||''),plantName:String(plant?.master?.name||''),
        contactName:String(contactName).trim(),email:normalizeEmail(email),visitId:String(visit?.id||''),
        controller:config.controller,privacyUrl:config.privacyUrl,withdrawalEmail:config.withdrawalEmail,
        consentTextVersion:CONSENT_TEXT_VERSION,consentText:text,
        source:'visit',method:'in-person-device-confirmation',capturedBy:employeeName(),
        relatedEventId:previous?.id||'',doiStatus:'pending',appBuild:BUILD
      });
      markReviewed(plant,visit);
      closeDialog(dialog);
      onSaved?.(event);
      queue();
    };
    dialog.showModal();
  }

  function recordDecline({plant,visit,contactName,email}){
    if(!confirm(`Hat ${contactName||'der Ansprechpartner'} ausdrücklich keine Newsletter-Einwilligung erteilt?`))return false;
    const previous=latestEvent(plant.id,contactName,email);
    appendEvent({
      eventType:'decision',status:'declined',purpose:PURPOSE,channel:CHANNEL,
      plantId:String(plant.id||''),plantName:String(plant?.master?.name||''),contactName:String(contactName||'').trim(),
      email:normalizeEmail(email),visitId:String(visit?.id||''),source:'visit',method:'in-person-record',capturedBy:employeeName(),
      relatedEventId:previous?.id||'',appBuild:BUILD
    });
    markReviewed(plant,visit);
    queue();
    return true;
  }

  function recordRevocation({plant,visit,contactName,email}){
    const previous=latestEvent(plant.id,contactName,email);
    if(!previous||!['pending','confirmed'].includes(previous.status))return;
    if(!confirm(`Widerruf für ${contactName||email} wirklich dokumentieren? Die bisherige Einwilligung bleibt als Nachweis in der Historie erhalten.`))return;
    appendEvent({
      eventType:'revocation',status:'revoked',purpose:PURPOSE,channel:CHANNEL,
      plantId:String(plant.id||''),plantName:String(plant?.master?.name||''),contactName:String(contactName||'').trim(),
      email:normalizeEmail(email),visitId:String(visit?.id||''),source:'visit',method:'in-person-record',capturedBy:employeeName(),
      relatedEventId:previous.id,revokedAt:nowIso(),appBuild:BUILD
    });
    markReviewed(plant,visit);
    queue();
  }

  function openHistoryDialog(plant,contactName,email){
    const events=relevantEvents(plant.id,contactName,email).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const dialog=createDialog('newsletter-history-dialog');
    dialog.innerHTML=`<div class="newsletter-consent-dialog-card">
      <button type="button" class="newsletter-dialog-close" aria-label="Schließen">×</button>
      <p class="eyebrow">Nachweis</p><h2>Newsletter-Historie</h2>
      <p class="newsletter-history-person">${esc(contactName||'Ansprechpartner')} · ${esc(email||'keine E-Mail')}</p>
      <div class="newsletter-history-list">${events.length?events.map(event=>{
        const meta=statusMeta(event);
        return `<article><span class="newsletter-status ${meta.tone}">${esc(meta.label)}</span><strong>${esc(formatDate(event.createdAt))}</strong><small>${esc(event.capturedBy||'System')} · ${esc(event.source||'')}</small>${event.consentTextVersion?`<small>Textversion: ${esc(event.consentTextVersion)}</small>`:''}</article>`;
      }).join(''):'<p>Noch keine Einträge vorhanden.</p>'}</div>
      <div class="newsletter-dialog-actions"><button type="button" class="button secondary" data-newsletter-close>Schließen</button></div>
    </div>`;
    dialog.querySelector('.newsletter-dialog-close').onclick=()=>closeDialog(dialog);
    dialog.querySelector('[data-newsletter-close]').onclick=()=>closeDialog(dialog);
    dialog.showModal();
  }

  function panelSignature(plant,visit,contactName,email,event,config){
    return JSON.stringify([plant?.id,visit?.id,contactName,email,event?.id,event?.status,config.controller,config.privacyUrl,config.withdrawalEmail]);
  }
  function renderVisitPanel(panel,plant,visit,preferredContactName=''){
    const contacts=Array.isArray(plant?.contacts)?plant.contacts:[];
    const contact=selectedContact(plant,visit,preferredContactName);
    const contactName=String(contact?.name||preferredContactName||visit?.contact||'').trim();
    const storedEmail=String(panel.querySelector('[data-newsletter-email]')?.value||'').trim();
    const email=storedEmail||String(contact?.email||'').trim();
    const event=latestEvent(plant.id,contactName,email);
    const meta=statusMeta(event);
    const config=loadConfig();
    const errors=configErrors(config);
    const signature=panelSignature(plant,visit,contactName,email,event,config);
    if(panel.dataset.signature===signature)return;
    panel.dataset.signature=signature;
    panel.innerHTML=`
      <div class="newsletter-consent-head">
        <div><p class="eyebrow">Kommunikation & Newsletter</p><h2>Fachinformationen per E-Mail</h2><p>Freiwillige Einwilligung des Ansprechpartners getrennt vom Besuch erfassen und nachvollziehbar dokumentieren.</p></div>
        <span class="newsletter-status ${meta.tone}">${esc(meta.label)}</span>
      </div>
      ${errors.length?`<div class="newsletter-config-warning"><strong>Vor Nutzung konfigurieren</strong><span>Es fehlen: ${esc(errors.join(', '))}. Unter „Mehr → Einstellungen“ den Bereich Newsletter ausfüllen.</span></div>`:''}
      <div class="newsletter-consent-fields">
        <label>Ansprechpartner<select data-newsletter-contact>${contacts.length?contacts.map(item=>`<option value="${esc(item.name||'')}" ${String(item.name||'').trim()===contactName?'selected':''}>${esc(item.name||'Unbenannt')}${item.role?` · ${esc(item.role)}`:''}</option>`).join(''):'<option value="">Kein Ansprechpartner hinterlegt</option>'}</select></label>
        <label>E-Mail-Adresse<input type="email" inputmode="email" autocomplete="email" data-newsletter-email value="${esc(email)}" placeholder="name@unternehmen.de"></label>
      </div>
      <div class="newsletter-consent-status-copy"><strong>${esc(meta.label)}</strong><span>${esc(meta.detail)}</span></div>
      <div class="newsletter-consent-actions">
        ${event&&['pending','confirmed'].includes(event.status)?`<button type="button" class="button secondary" data-newsletter-history>Nachweis anzeigen</button><button type="button" class="button secondary newsletter-revoke" data-newsletter-revoke>Widerruf erfassen</button>`:`<button type="button" class="button primary" data-newsletter-capture ${errors.length?'disabled':''}>Einwilligung erfassen</button><button type="button" class="button secondary" data-newsletter-decline>Keine Einwilligung</button>${event?'<button type="button" class="button secondary" data-newsletter-history>Historie</button>':''}`}
      </div>
      <p class="newsletter-doi-note"><strong>Double-Opt-In:</strong> Eine Vor-Ort-Einwilligung wird zunächst als „Bestätigung ausstehend“ gespeichert. Eine echte E-Mail-Bestätigung kann erst ein angebundener Newsletter-Dienst setzen.</p>`;

    const contactSelect=panel.querySelector('[data-newsletter-contact]');
    const emailInput=panel.querySelector('[data-newsletter-email]');
    contactSelect?.addEventListener('change',()=>{
      const next=contacts.find(item=>String(item?.name||'')===contactSelect.value)||null;
      if(emailInput)emailInput.value=String(next?.email||'');
      panel.dataset.signature='';
      renderVisitPanel(panel,plant,visit,contactSelect.value);
    });
    emailInput?.addEventListener('change',()=>{panel.dataset.signature='';renderVisitPanel(panel,plant,visit,contactSelect?.value||contactName)});
    panel.querySelector('[data-newsletter-capture]')?.addEventListener('click',()=>openConsentDialog({
      plant,visit,contactName:contactSelect?.value||contactName,email:emailInput?.value||'',onSaved:()=>{panel.dataset.signature='';renderVisitPanel(panel,plant,visit,contactSelect?.value||contactName)}
    }));
    panel.querySelector('[data-newsletter-decline]')?.addEventListener('click',()=>{
      recordDecline({plant,visit,contactName:contactSelect?.value||contactName,email:emailInput?.value||''});
      panel.dataset.signature='';renderVisitPanel(panel,plant,visit,contactSelect?.value||contactName);
    });
    panel.querySelector('[data-newsletter-revoke]')?.addEventListener('click',()=>{
      recordRevocation({plant,visit,contactName:contactSelect?.value||contactName,email:emailInput?.value||''});
      panel.dataset.signature='';renderVisitPanel(panel,plant,visit,contactSelect?.value||contactName);
    });
    panel.querySelector('[data-newsletter-history]')?.addEventListener('click',()=>openHistoryDialog(plant,contactSelect?.value||contactName,emailInput?.value||''));
  }

  function bindFinishReminder(button,panel,plant,visit){
    if(!button||button.dataset.newsletterReminderBound===BUILD)return;
    button.dataset.newsletterReminderBound=BUILD;
    button.addEventListener('click',event=>{
      if(button.dataset.newsletterBypass==='1'){button.dataset.newsletterBypass='';return}
      if(visit?.modeStatus==='completed'||wasReviewed(plant,visit)||!configReady())return;
      const contact=selectedContact(plant,visit,panel.querySelector('[data-newsletter-contact]')?.value||'');
      const contactName=String(contact?.name||panel.querySelector('[data-newsletter-contact]')?.value||'').trim();
      const email=String(panel.querySelector('[data-newsletter-email]')?.value||contact?.email||'').trim();
      if(!contactName||!emailValid(email))return;
      const latest=latestEvent(plant.id,contactName,email);
      if(latest&&['pending','confirmed','declined','revoked'].includes(latest.status))return;
      event.preventDefault();event.stopImmediatePropagation();
      const dialog=createDialog('newsletter-finish-dialog');
      dialog.innerHTML=`<div class="newsletter-consent-dialog-card compact">
        <p class="eyebrow">Besuchsabschluss</p><h2>Newsletter-Einwilligung noch offen</h2>
        <p>Für ${esc(contactName)} wurde noch keine Entscheidung dokumentiert. Die Newsletter-Einwilligung ist freiwillig und der Besuch kann ohne sie abgeschlossen werden.</p>
        <div class="newsletter-dialog-actions"><button type="button" class="button primary" data-newsletter-review>Jetzt prüfen</button><button type="button" class="button secondary" data-newsletter-skip>Ohne Newsletter abschließen</button></div>
      </div>`;
      dialog.querySelector('[data-newsletter-review]').onclick=()=>{closeDialog(dialog);panel.scrollIntoView({behavior:'smooth',block:'center'})};
      dialog.querySelector('[data-newsletter-skip]').onclick=()=>{
        markReviewed(plant,visit);closeDialog(dialog);button.dataset.newsletterBypass='1';button.click();
      };
      dialog.showModal();
    },true);
  }

  function reconcileVisit(){
    const workspace=document.querySelector('.visit-workspace');
    const finish=document.querySelector('#finishVisit');
    if(!workspace||!finish)return;
    const plant=activePlant();
    const visit=plant&&currentVisit(plant);
    if(!plant||!visit)return;
    let panel=workspace.querySelector(':scope > [data-newsletter-visit-panel]');
    if(!panel){
      panel=document.createElement('section');
      panel.className='newsletter-consent-panel span-full';
      panel.dataset.newsletterVisitPanel=BUILD;
      const summary=[...workspace.children].find(child=>child.querySelector('h2')?.textContent.trim()==='Besuchsnotiz');
      if(summary)summary.insertAdjacentElement('beforebegin',panel);else workspace.appendChild(panel);
    }
    renderVisitPanel(panel,plant,visit,panel.querySelector('[data-newsletter-contact]')?.value||'');
    bindFinishReminder(finish,panel,plant,visit);
  }

  function downloadRegistry(){
    const config=loadConfig();
    const registry=loadRegistry();
    const payload={schema:'vta-newsletter-consent-export-v1',exportedAt:nowIso(),consentTextVersion:CONSENT_TEXT_VERSION,controller:config.controller,events:registry.events};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=`newsletter-einwilligungsnachweise-${new Date().toISOString().slice(0,10)}.json`;anchor.click();URL.revokeObjectURL(url);
  }

  function reconcileSettings(){
    const root=document.querySelector('#applicationView');
    const heading=root?.querySelector('.global-page-header h1');
    if(!root||heading?.textContent.trim()!=='Einstellungen')return;
    if(root.querySelector('#newsletterConsentSettings'))return;
    const config=loadConfig();
    const eventCount=loadRegistry().events.length;
    const section=document.createElement('section');
    section.id='newsletterConsentSettings';
    section.className='form-section newsletter-consent-settings';
    section.innerHTML=`<div class="section-heading"><div><p class="eyebrow">Recht & Kommunikation</p><h2>Newsletter-Einwilligung</h2><p class="form-note">Diese Angaben werden in den Einwilligungsnachweis übernommen. Bitte die vollständige juristische Firmierung verwenden.</p></div><span class="newsletter-status ${configReady(config)?'confirmed':'pending'}">${configReady(config)?'Konfiguriert':'Konfiguration fehlt'}</span></div>
      <div class="form-grid">
        <label class="field-label">Verantwortliches Unternehmen<input data-newsletter-config="controller" value="${esc(config.controller||profileCompany())}" placeholder="vollständige juristische Firmierung"></label>
        <label class="field-label">E-Mail für Widerrufe<input data-newsletter-config="withdrawalEmail" type="email" value="${esc(config.withdrawalEmail)}" placeholder="datenschutz@unternehmen.de"></label>
        <label class="field-label span-2">Datenschutzhinweis / Datenschutz-URL<input data-newsletter-config="privacyUrl" type="url" value="${esc(config.privacyUrl)}" placeholder="https://..."></label>
      </div>
      <div class="newsletter-settings-info"><strong>Double-Opt-In</strong><span>Die App dokumentiert die Vor-Ort-Einwilligung. Sie versendet derzeit keine automatische Bestätigungsmail; daher bleibt der Status bis zur späteren Newsletter-Anbindung „Bestätigung ausstehend“.</span></div>
      <div class="form-actions"><button type="button" class="button primary" data-newsletter-save-config>Newsletter-Einstellungen speichern</button><button type="button" class="button secondary" data-newsletter-export>Nachweise exportieren (${eventCount})</button></div>
      <p class="form-note">Textversion: ${CONSENT_TEXT_VERSION}. Vor Produktiveinsatz sollte die konkrete Firmierung, Datenschutzerklärung und der Einwilligungstext durch Datenschutz/Legal freigegeben werden.</p>`;
    root.appendChild(section);
    section.querySelector('[data-newsletter-save-config]').onclick=()=>{
      const next={
        controller:String(section.querySelector('[data-newsletter-config="controller"]')?.value||'').trim(),
        withdrawalEmail:String(section.querySelector('[data-newsletter-config="withdrawalEmail"]')?.value||'').trim(),
        privacyUrl:String(section.querySelector('[data-newsletter-config="privacyUrl"]')?.value||'').trim(),
        updatedAt:nowIso()
      };
      const errors=configErrors(next);
      if(errors.length)return alert(`Bitte ergänzen: ${errors.join(', ')}.`);
      localStorage.setItem(CONFIG_KEY,JSON.stringify(next));
      section.remove();reconcileSettings();queue();
    };
    section.querySelector('[data-newsletter-export]').onclick=downloadRegistry;
  }

  function reconcileOverview(){
    const plant=activePlant();
    const page=document.querySelector('.plant-page[data-current-page="overview"]');
    if(!plant||!page)return;
    const cards=[...page.querySelectorAll('.plant-master-card')];
    const card=cards.find(item=>item.querySelector('h3')?.textContent.trim()==='Ansprechpartner');
    if(!card)return;
    const contact=Array.isArray(plant.contacts)?plant.contacts[0]:null;
    const event=contact?latestEvent(plant.id,contact.name,contact.email):null;
    const meta=statusMeta(event);
    const signature=`${contact?.name||''}|${contact?.email||''}|${event?.id||''}|${event?.status||''}`;
    let host=card.querySelector('[data-newsletter-contact-status]');
    if(host?.dataset.signature===signature)return;
    if(!host){host=document.createElement('div');host.className='newsletter-contact-status';host.dataset.newsletterContactStatus=BUILD;card.appendChild(host)}
    host.dataset.signature=signature;
    host.innerHTML=`<span>Newsletter</span><strong class="newsletter-status ${meta.tone}">${esc(meta.label)}</strong><small>${esc(meta.detail)}</small>`;
  }

  function confirmDoubleOptIn(eventId,confirmationReference=''){
    const registry=loadRegistry();
    const source=registry.events.find(event=>event.id===eventId&&event.status==='pending');
    if(!source)return false;
    appendEvent({
      eventType:'confirmation',status:'confirmed',purpose:PURPOSE,channel:CHANNEL,
      plantId:source.plantId,plantName:source.plantName,contactName:source.contactName,email:source.email,visitId:source.visitId,
      controller:source.controller,privacyUrl:source.privacyUrl,withdrawalEmail:source.withdrawalEmail,
      consentTextVersion:source.consentTextVersion,consentText:source.consentText,
      source:'double-opt-in',method:'newsletter-provider-confirmation',capturedBy:'Newsletter-System',
      relatedEventId:source.id,doiStatus:'confirmed',confirmationReference:String(confirmationReference||''),appBuild:BUILD
    });
    queue();
    return true;
  }

  function reconcile(){
    reconcileVisit();
    reconcileSettings();
    reconcileOverview();
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;reconcile()});
  }

  const root=document.querySelector('#mainContent')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);
  window.addEventListener('storage',queue);
  window.addEventListener('vta:newsletter-consent-updated',queue);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  queue();

  globalThis.VTANewsletterConsent=Object.freeze({
    build:BUILD,
    consentTextVersion:CONSENT_TEXT_VERSION,
    refresh:queue,
    exportRegistry:downloadRegistry,
    confirmDoubleOptIn
  });
})();
