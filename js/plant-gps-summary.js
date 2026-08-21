(() => {
  const BUILD='0.11.0-alpha.73-gps-summary1';
  let queued=false;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);

  function field(form,name){
    return form.elements.namedItem(name);
  }

  function value(form,name){
    return String(field(form,name)?.value||'').trim();
  }

  function coordinate(raw){
    const number=Number(String(raw||'').trim().replace(',','.'));
    return Number.isFinite(number)?number:null;
  }

  function operatorState(form){
    const operator=value(form,'operator.name');
    const lookupText=(form.querySelector('#operatorLookupStatus')?.textContent||'').trim();
    if(operator)return {label:operator,state:'ready'};
    if(/gesucht|wird|loading|ermittelt/i.test(lookupText))return {label:'Suche läuft …',state:'loading'};
    if(/kein betreiber|nicht gefunden/i.test(lookupText))return {label:'Nicht automatisch erkannt',state:'warning'};
    return {label:'Noch nicht erkannt',state:'idle'};
  }

  function ensureSummary(form){
    const section=form.querySelector('.form-section:has(.location-capture-card)');
    const capture=section?.querySelector('.location-capture-card');
    if(!section||!capture)return null;
    let summary=section.querySelector('[data-gps-summary]');
    if(summary)return summary;
    summary=document.createElement('div');
    summary.className='plant-gps-summary';
    summary.dataset.gpsSummary=BUILD;
    summary.hidden=true;
    capture.insertAdjacentElement('afterend',summary);
    return summary;
  }

  function render(form){
    const summary=ensureSummary(form);
    if(!summary)return;
    const latitude=coordinate(value(form,'address.latitude'));
    const longitude=coordinate(value(form,'address.longitude'));
    if(latitude===null||longitude===null){
      summary.hidden=true;
      summary.innerHTML='';
      return;
    }

    const city=value(form,'address.city');
    const postal=value(form,'address.postalCode');
    const street=value(form,'address.street');
    const accuracy=value(form,'address.accuracy');
    const operator=operatorState(form);
    const place=[postal,city].filter(Boolean).join(' ')||'Standort erfasst';
    const address=[street,place!=='Standort erfasst'?place:''].filter(Boolean).join(' · ')||'Adresse wird ergänzt';
    const coordinateLabel=`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    const complete=Boolean(city&&operator.state==='ready');

    summary.hidden=false;
    summary.classList.toggle('is-complete',complete);
    summary.innerHTML=`
      <div class="plant-gps-summary-head">
        <div>
          <span class="plant-gps-summary-kicker">Standort übernommen</span>
          <strong>${esc(place)}</strong>
          <small>${esc(address)}</small>
        </div>
        <span class="plant-gps-summary-state ${esc(operator.state)}">${complete?'Bereit':'Wird ergänzt'}</span>
      </div>
      <div class="plant-gps-summary-grid">
        <div><span>Koordinaten</span><strong>${esc(coordinateLabel)}</strong></div>
        <div><span>Genauigkeit</span><strong>${esc(accuracy||'–')}</strong></div>
        <div class="plant-gps-summary-wide"><span>Betreiber / Verband</span><strong>${esc(operator.label)}</strong></div>
      </div>`;
  }

  function bind(form){
    if(!form||form.dataset.gpsSummaryBound===BUILD)return;
    form.dataset.gpsSummaryBound=BUILD;
    ensureSummary(form);
    const names=['address.latitude','address.longitude','address.street','address.postalCode','address.city','address.accuracy','operator.name'];
    names.forEach(name=>{
      const element=field(form,name);
      element?.addEventListener('input',()=>render(form));
      element?.addEventListener('change',()=>render(form));
    });
    ['#locationCaptureStatus','#operatorLookupStatus'].forEach(selector=>{
      const status=form.querySelector(selector);
      if(status)new MutationObserver(()=>render(form)).observe(status,{childList:true,subtree:true,characterData:true,attributes:true});
    });
    render(form);
  }

  function reconcile(){
    bind(document.querySelector('#plantForm'));
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;reconcile();});
  }

  const root=document.querySelector('#applicationView')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);
  queue();

  globalThis.VTAPlantGpsSummary=Object.freeze({build:BUILD,reconcile});
})();
