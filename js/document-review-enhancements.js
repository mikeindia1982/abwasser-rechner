(()=>{
  const DB_NAME='abwasser-rechner-v011';
  const DOCUMENT_STORE='documents';
  const STORAGE_PLANTS='abwasser-plants-v07';
  const STORAGE_PRODUCTS='abwasser-products-v092';

  const TYPE_LABELS={
    sds:'Sicherheitsdatenblatt',factsheet:'Factsheet','product-data':'Produktdatenblatt','technical-sheet':'Technisches Merkblatt',
    offer:'Angebot','order-confirmation':'Auftragsbestätigung','purchase-order':'Bestellung','delivery-note':'Lieferschein',
    invoice:'Rechnung','credit-note':'Gutschrift',contract:'Vertrag',tender:'Ausschreibung','lab-report':'Laborbericht',
    'trial-report':'Versuchsbericht','visit-report':'Besuchsbericht',certificate:'Zertifikat',other:'Sonstiges Dokument'
  };

  function text(value=''){return String(value??'').trim()}
  function normalized(value=''){
    return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  }
  function readLocalArray(key){
    try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return []}
  }
  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Dokumentdatenbank konnte nicht geöffnet werden.'));
    });
  }
  async function listDocuments(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const request=db.transaction(DOCUMENT_STORE,'readonly').objectStore(DOCUMENT_STORE).getAll();
      request.onsuccess=()=>{const rows=request.result||[];db.close();resolve(rows)};
      request.onerror=()=>{const error=request.error;db.close();reject(error)};
    });
  }
  async function findDocument(form){
    const fileName=text(form.querySelector('.page-header h1')?.textContent);
    if(!fileName)return null;
    const rows=(await listDocuments()).filter(row=>row?.fileName===fileName);
    if(!rows.length)return null;
    const type=text(form.elements.namedItem('type')?.value);
    const status=text(form.elements.namedItem('status')?.value);
    return rows.sort((a,b)=>{
      const aMatch=(a.type===type?2:0)+(a.status===status?1:0);
      const bMatch=(b.type===type?2:0)+(b.status===status?1:0);
      return bMatch-aMatch||String(b.importedAt||'').localeCompare(String(a.importedAt||''));
    })[0];
  }
  function documentHaystack(doc){
    return normalized([
      doc?.fileName,doc?.textPreview,doc?.documentNumber,doc?.customer,doc?.sender,doc?.recipient,doc?.project,
      doc?.extracted?.name,doc?.extracted?.materialNumber
    ].filter(Boolean).join(' '));
  }
  function scorePlant(doc,plant){
    const hay=documentHaystack(doc);
    if(!hay)return 0;
    let score=0;
    const name=normalized(plant?.master?.name);
    const internal=normalized(plant?.master?.internalNumber);
    const city=normalized(plant?.address?.city);
    const operator=normalized(plant?.operator?.name);
    if(name.length>=5&&hay.includes(name))score+=8;
    if(internal.length>=3&&hay.includes(internal))score+=7;
    if(city.length>=4&&hay.includes(city))score+=4;
    if(operator.length>=5&&hay.includes(operator))score+=3;
    return score;
  }
  function suggestPlant(doc,plants){
    if(doc?.plantId){const existing=plants.find(p=>p.id===doc.plantId);if(existing)return {item:existing,score:99,reason:'bereits zugeordnet'}}
    const ranked=plants.map(item=>({item,score:scorePlant(doc,item)})).sort((a,b)=>b.score-a.score);
    return ranked[0]?.score>=4?{...ranked[0],reason:'aus Dokumentinhalt oder Dateinamen erkannt'}:null;
  }
  function scoreProduct(doc,product){
    const hay=documentHaystack(doc);
    if(!hay)return 0;
    let score=0;
    const productName=normalized(product?.name);
    const material=normalized(product?.materialNumber);
    const inferredName=normalized(doc?.extracted?.name);
    if(productName.length>=5&&hay.includes(productName))score+=9;
    if(material.length>=2&&hay.includes(material))score+=8;
    if(inferredName.length>=5&&productName&&(productName.includes(inferredName)||inferredName.includes(productName)))score+=6;
    return score;
  }
  function suggestProduct(doc,products){
    const existingId=Array.isArray(doc?.productIds)?doc.productIds[0]:'';
    if(existingId){const existing=products.find(p=>p.id===existingId);if(existing)return {item:existing,score:99,reason:'bereits zugeordnet'}}
    const ranked=products.map(item=>({item,score:scoreProduct(doc,item)})).sort((a,b)=>b.score-a.score);
    return ranked[0]?.score>=6?{...ranked[0],reason:'Produktname oder Materialnummer erkannt'}:null;
  }
  function setSelectValue(select,value){
    if(!select||!value)return false;
    const option=[...select.options].find(item=>item.value===value);
    if(!option)return false;
    select.value=value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function setInputValue(input,value,{overwrite=false}={}){
    if(!input||!text(value))return false;
    if(!overwrite&&text(input.value))return false;
    input.value=text(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function selectProduct(multiselect,productId){
    if(!multiselect||!productId)return false;
    const option=[...multiselect.options].find(item=>item.value===productId);
    if(!option)return false;
    option.selected=true;
    multiselect.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function typeLabel(type){return TYPE_LABELS[type]||'Sonstiges Dokument'}
  function keyFacts(doc){
    const inferred=doc?.extracted||{};
    const technical=inferred.technical||{};
    const safety=inferred.safety||{};
    const facts=[
      ['Dokumenttyp',typeLabel(doc?.type)],
      ['Produkt',inferred.name],
      ['Materialnummer',inferred.materialNumber],
      ['Dokumentstand',doc?.documentDate||inferred.documentDate||doc?.version],
      ['Signalwort',safety.signalWord],
      ['UN-Nummer',safety.unNumber],
      ['pH-Wert',technical.ph],
      ['Dichte',technical.density],
      ['Kunde',doc?.customer]
    ];
    return facts.filter(([,value])=>text(value)).slice(0,7);
  }
  function stageHtml(status){
    const stages=[['imported','Eingang'],['review','In Prüfung'],['approved','Freigegeben']];
    const current=status==='archived'?'archived':status;
    return `<div class="document-review-stages" aria-label="Prüfstatus">${stages.map(([id,label],index)=>{
      const currentIndex=stages.findIndex(([stage])=>stage===current);
      const active=id===current,done=currentIndex>index||current==='archived';
      return `<span class="${active?'active':''} ${done?'done':''}"><b>${done?'✓':index+1}</b>${label}</span>`;
    }).join('')}${current==='archived'?'<span class="active archived"><b>✓</b>Archiv</span>':''}</div>`;
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }
  function renderAssistant(form,doc){
    const plants=readLocalArray(STORAGE_PLANTS);
    const products=readLocalArray(STORAGE_PRODUCTS);
    const plantSuggestion=suggestPlant(doc,plants);
    const productSuggestion=suggestProduct(doc,products);
    const facts=keyFacts(doc);
    const status=text(form.elements.namedItem('status')?.value)||doc?.status||'imported';
    const hasText=Boolean(doc?.textExtracted||text(doc?.textPreview));
    const inferredName=text(doc?.extracted?.name);
    const panel=document.createElement('section');
    panel.className='document-review-assistant';
    panel.dataset.documentReviewAssistant='true';
    panel.innerHTML=`
      <div class="document-review-assistant-head">
        <div><p class="eyebrow">Prüfassistent</p><h2>Dokument prüfen und zuordnen</h2><p>Erkannte Angaben werden nur als Vorschlag übernommen. Das Original-PDF bleibt unverändert.</p></div>
        <div class="document-review-detection"><span>${hasText?'Text erkannt':'Keine Textschicht'}</span><strong>${escapeHtml(typeLabel(doc?.type||'other'))}</strong></div>
      </div>
      ${stageHtml(status)}
      <div class="document-review-assistant-grid">
        <article class="document-review-facts"><h3>Erkannte Kerndaten</h3>${facts.length?`<dl>${facts.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`:'<p class="muted-small">Aus dieser PDF konnten noch keine strukturierten Kerndaten sicher erkannt werden. Die manuelle Prüfung bleibt möglich.</p>'}</article>
        <article class="document-review-suggestions"><h3>Zuordnungsvorschläge</h3>
          <div class="document-review-suggestion ${plantSuggestion?'has-match':''}"><span>Anlage</span><strong>${escapeHtml(plantSuggestion?.item?.master?.name||'Kein sicherer Treffer')}</strong><small>${escapeHtml(plantSuggestion?.reason||'Bitte manuell zuordnen')}</small></div>
          <div class="document-review-suggestion ${productSuggestion||inferredName?'has-match':''}"><span>Produkt</span><strong>${escapeHtml(productSuggestion?.item?.name||inferredName||'Kein sicherer Treffer')}</strong><small>${escapeHtml(productSuggestion?.reason||(inferredName?'Neues Produkt aus erkanntem Namen möglich':'Bitte manuell zuordnen'))}</small></div>
        </article>
      </div>
      <div class="document-review-assistant-actions">
        <button type="button" class="button primary" data-document-apply>Vorschläge übernehmen</button>
        <button type="button" class="button secondary" data-document-change-assignment>Zuordnung ändern</button>
        <button type="button" class="button secondary" data-document-archive>Archivieren</button>
        <span data-document-review-message>Nichts wird ohne „Dokument speichern“ endgültig übernommen.</span>
      </div>`;
    const header=form.querySelector('.page-header');
    if(header)header.insertAdjacentElement('afterend',panel);else form.prepend(panel);

    const message=panel.querySelector('[data-document-review-message]');
    panel.querySelector('[data-document-apply]').onclick=()=>{
      const inferred=doc?.extracted||{};
      setSelectValue(form.elements.namedItem('type'),doc?.type||'other');
      setInputValue(form.elements.namedItem('documentDate'),doc?.documentDate||inferred.documentDate||'');
      if(plantSuggestion)setSelectValue(form.elements.namedItem('plantId'),plantSuggestion.item.id);
      const productSelect=form.elements.namedItem('productIds');
      if(productSuggestion){
        selectProduct(productSelect,productSuggestion.item.id);
        const newName=form.elements.namedItem('newProductName');
        if(newName)newName.value='';
      }else{
        setInputValue(form.elements.namedItem('newProductName'),inferred.name||'');
        setInputValue(form.elements.namedItem('newMaterialNumber'),inferred.materialNumber||'');
        setInputValue(form.elements.namedItem('newProductCategory'),inferred.category||'');
      }
      const statusSelect=form.elements.namedItem('status');
      if(statusSelect?.value==='imported')setSelectValue(statusSelect,'review');
      message.textContent='Vorschläge sind eingetragen. Bitte prüfen und anschließend „Dokument speichern“ wählen.';
      message.classList.add('success');
      panel.querySelector('.document-review-stages')?.replaceWith(htmlToElement(stageHtml(statusSelect?.value||status)));
    };
    panel.querySelector('[data-document-change-assignment]').onclick=()=>{
      const target=form.elements.namedItem('plantId')||form.elements.namedItem('productIds');
      target?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>target?.focus(),350);
      message.textContent='Anlagen- und Produktzuordnung können unten manuell geändert werden.';
    };
    panel.querySelector('[data-document-archive]').onclick=()=>{
      if(!confirm(`Dokument „${doc?.fileName||'PDF'}“ archivieren?`))return;
      const statusSelect=form.elements.namedItem('status');
      if(!setSelectValue(statusSelect,'archived'))return;
      message.textContent='Archivstatus gesetzt. Dokument wird gespeichert …';
      if(typeof form.requestSubmit==='function')form.requestSubmit();else form.querySelector('button[type="submit"]')?.click();
    };
  }
  function htmlToElement(html){
    const template=document.createElement('template');
    template.innerHTML=html.trim();
    return template.content.firstElementChild;
  }
  async function enhanceReviewForm(){
    const form=document.querySelector('#documentReviewForm');
    if(!form||form.dataset.documentAssistantState)return;
    form.dataset.documentAssistantState='loading';
    try{
      const doc=await findDocument(form);
      if(!form.isConnected)return;
      if(!doc){form.dataset.documentAssistantState='missing';return;}
      renderAssistant(form,doc);
      form.dataset.documentAssistantState='ready';
    }catch(error){
      console.warn('Dokument-Prüfassistent konnte nicht initialisiert werden.',error);
      if(form.isConnected)form.dataset.documentAssistantState='error';
    }
  }

  let scheduled=false;
  function scheduleEnhancement(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;enhanceReviewForm()});
  }
  const observer=new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',scheduleEnhancement,{once:true});
  scheduleEnhancement();
})();
