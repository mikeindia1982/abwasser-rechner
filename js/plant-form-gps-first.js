(() => {
  const BUILD='0.11.0-alpha.72-gps-first1';
  let scheduled=false;

  function isNewPlantForm(form){
    const title=form.querySelector('.page-header h1')?.textContent?.trim()||'';
    return title==='Neue Anlage';
  }

  function updateCapturedState(section,status){
    if(!section||!status)return;
    const text=(status.textContent||'').toLowerCase();
    const captured=/koordinaten erfasst|standort und adresse wurden übernommen|zwischenspeicher übernommen/.test(text);
    section.classList.toggle('is-captured',captured);
    const state=section.querySelector('[data-gps-first-state]');
    if(state)state.textContent=captured?'Standort erfasst':'Noch nicht erfasst';
  }

  function upgrade(form){
    if(!form||form.dataset.gpsFirst===BUILD||!isNewPlantForm(form))return;
    const captureCard=form.querySelector('.location-capture-card');
    const pageHeader=form.querySelector('.page-header');
    if(!captureCard||!pageHeader)return;

    const section=document.createElement('section');
    section.className='form-section plant-gps-first-section';
    section.dataset.gpsFirstSection=BUILD;
    section.innerHTML=`
      <div class="plant-gps-first-head">
        <div>
          <p class="eyebrow">Schritt 1 · Standort</p>
          <h2>Anlage per GPS erfassen</h2>
          <p class="form-note">Direkt vor Ort starten: GPS übernimmt die Koordinaten. Bei Internetverbindung werden Adresse und mögliche Betreiberinformationen anschließend automatisch ergänzt.</p>
        </div>
        <span class="plant-gps-first-state" data-gps-first-state>Noch nicht erfasst</span>
      </div>`;
    section.append(captureCard);
    pageHeader.insertAdjacentElement('afterend',section);

    const button=captureCard.querySelector('#capturePlantLocation');
    if(button&&button.textContent.trim()==='Aktuellen Standort erfassen')button.textContent='GPS-Standort jetzt erfassen';

    const status=captureCard.querySelector('#locationCaptureStatus');
    if(status){
      updateCapturedState(section,status);
      new MutationObserver(()=>updateCapturedState(section,status)).observe(status,{childList:true,subtree:true,characterData:true,attributes:true});
    }

    form.dataset.gpsFirst=BUILD;
  }

  function reconcile(){
    const form=document.querySelector('#plantForm');
    if(form)upgrade(form);
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;reconcile()});
  }

  const root=document.querySelector('#applicationView')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);
  queue();

  globalThis.VTAPlantGpsFirst=Object.freeze({build:BUILD,reconcile});
})();
