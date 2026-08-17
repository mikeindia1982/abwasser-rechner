const BUILD='0.11.0-alpha.48';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const BACKUP_KEY='abwasser-plants-backup-v087';
const STAGES=[
  ['analysis','Kontakt / Bedarf'],
  ['trial','Versuch läuft'],
  ['offer','Angebot'],
  ['order','Auftrag / Kunde'],
  ['aftercare','Nachbetreuung']
];

let scheduled=false;
let observer=null;

const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stageLabel=stage=>STAGES.find(([id])=>id===stage)?.[1]||'Kontakt / Bedarf';
const makeId=()=>globalThis.crypto?.randomUUID?.()||`vta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

function readPlants(){
  try{
    const value=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch(error){
    console.warn('Vertrieb: Anlagen konnten nicht gelesen werden',error);
    return [];
  }
}

function activePlant(plants=readPlants()){
  const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
  return plants.find(plant=>plant?.id===id)||null;
}

function normalizeOpportunity(value={}){
  const source=value&&typeof value==='object'?value:{};
  return {
    ...source,
    id:String(source.id||makeId()),
    title:String(source.title||'Vertrieb'),
    stage:STAGES.some(([id])=>id===source.stage)?source.stage:'analysis',
    nextStep:String(source.nextStep||''),
    nextStepDueDate:String(source.nextStepDueDate||''),
    lastContactDate:String(source.lastContactDate||''),
    notes:String(source.notes||''),
    history:Array.isArray(source.history)?source.history:[],
    createdAt:String(source.createdAt||new Date().toISOString()),
    updatedAt:String(source.updatedAt||new Date().toISOString())
  };
}

function salesState(plant){
  const pipeline=plant?.salesPipeline&&typeof plant.salesPipeline==='object'?plant.salesPipeline:{};
  let opportunities=Array.isArray(pipeline.opportunities)?pipeline.opportunities.map(normalizeOpportunity):[];
  if(!opportunities.length){
    opportunities=[normalizeOpportunity({id:'sales-main',...(plant?.salesFunnel||{})})];
  }
  const activeOpportunityId=String(pipeline.activeOpportunityId||opportunities[0].id);
  const activeIndex=Math.max(0,opportunities.findIndex(item=>item.id===activeOpportunityId));
  return {pipeline,opportunities,activeIndex,active:opportunities[activeIndex]};
}

function writePlants(plants){
  try{
    const previous=localStorage.getItem(PLANTS_KEY);
    if(previous)localStorage.setItem(BACKUP_KEY,previous);
    localStorage.setItem(PLANTS_KEY,JSON.stringify(plants));
    window.dispatchEvent(new CustomEvent('vta:sales-simplified-updated',{detail:{build:BUILD}}));
    return true;
  }catch(error){
    console.error('Vertrieb: Speichern fehlgeschlagen',error);
    return false;
  }
}

function formatDate(value){
  if(!value)return '—';
  const date=new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('de-DE');
}

function renderHistory(items=[]){
  const history=items.slice(-5).reverse();
  if(!history.length)return '<p class="sales-simple-empty">Noch keine Statusänderungen dokumentiert.</p>';
  return `<div class="sales-simple-history-list">${history.map(item=>`<div><span>${esc(formatDate(String(item.changedAt||'').slice(0,10)))}</span><strong>${esc(stageLabel(item.stage))}</strong><small>${esc(item.note||'Status geändert')}</small></div>`).join('')}</div>`;
}

function renderFingerprint(state){
  const active=state.active;
  return JSON.stringify([active.stage,active.nextStep,active.nextStepDueDate,active.lastContactDate,active.notes,active.history?.length||0,state.opportunities.length]);
}

function renderSection(section,plant,state){
  const active=state.active;
  const extraCount=Math.max(0,state.opportunities.length-1);
  section.dataset.salesSimplified=BUILD;
  section.dataset.salesSimpleFingerprint=renderFingerprint(state);
  section.className='dashboard-section sales-simplified-section';
  section.innerHTML=`
    <div class="section-heading sales-simple-heading">
      <div>
        <p class="eyebrow">Vertrieb</p>
        <h2>Vertriebsstatus</h2>
        <p class="form-note">Nur Status, nächster Schritt und Nachverfolgung – ohne Forecast und komplexe Pipeline.</p>
      </div>
      <span class="status-chip blue">${esc(stageLabel(active.stage))}</span>
    </div>

    <form class="sales-simple-form" id="salesSimpleForm">
      <div class="sales-simple-grid">
        <label class="field-label">Aktueller Status
          <select name="stage">${STAGES.map(([id,label])=>`<option value="${id}" ${active.stage===id?'selected':''}>${esc(label)}</option>`).join('')}</select>
        </label>
        <label class="field-label">Letzter Kontakt
          <input name="lastContactDate" type="date" value="${esc(active.lastContactDate)}">
        </label>
        <label class="field-label sales-simple-span-2">Nächster Schritt
          <input name="nextStep" value="${esc(active.nextStep)}" placeholder="z. B. Versuchsergebnis mit Betreiber besprechen">
        </label>
        <label class="field-label">Fällig am
          <input name="nextStepDueDate" type="date" value="${esc(active.nextStepDueDate)}">
        </label>
        <div class="sales-simple-task-hint">
          <span>Nachverfolgung</span>
          <strong>${active.nextStep?'Als Aufgabe übernehmbar':'Nächsten Schritt eintragen'}</strong>
        </div>
        <label class="field-label sales-simple-span-2">Notiz
          <textarea name="notes" rows="4" placeholder="Kurzer Stand zum Kunden, Versuch oder Angebot">${esc(active.notes)}</textarea>
        </label>
      </div>
      ${extraCount?`<p class="sales-simple-legacy-note">${extraCount} weitere ältere Verkaufschance${extraCount===1?' bleibt':'n bleiben'} im Datenbestand erhalten, wird hier aber nicht mehr separat dargestellt.</p>`:''}
      <div class="sales-simple-actions">
        <button type="submit" class="button primary">Speichern</button>
        <button type="button" class="button secondary" data-sales-create-task ${active.nextStep?'':'disabled'}>Als Aufgabe anlegen</button>
      </div>
      <p class="sales-simple-message" role="status" aria-live="polite"></p>
    </form>

    <details class="sales-simple-history">
      <summary>Verlauf anzeigen</summary>
      ${renderHistory(active.history)}
    </details>`;

  const form=section.querySelector('#salesSimpleForm');
  const message=section.querySelector('.sales-simple-message');
  const taskButton=section.querySelector('[data-sales-create-task]');
  form?.addEventListener('input',()=>{
    const next=String(new FormData(form).get('nextStep')||'').trim();
    if(taskButton)taskButton.disabled=!next;
  });
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const result=saveForm(form,false);
    if(message)message.textContent=result?'Vertriebsstand gespeichert.':'Speichern nicht möglich.';
  });
  taskButton?.addEventListener('click',()=>{
    const result=saveForm(form,true);
    if(message)message.textContent=result?'Vertriebsstand gespeichert und Aufgabe angelegt.':'Aufgabe konnte nicht angelegt werden.';
  });
}

function saveForm(form,createTask){
  const plants=readPlants();
  const plant=activePlant(plants);
  if(!plant||!form)return false;
  const state=salesState(plant);
  const current=state.active;
  const data=new FormData(form);
  const nextStage=String(data.get('stage')||'analysis');
  const now=new Date().toISOString();
  const updated={
    ...current,
    stage:STAGES.some(([id])=>id===nextStage)?nextStage:'analysis',
    lastContactDate:String(data.get('lastContactDate')||''),
    nextStep:String(data.get('nextStep')||'').trim(),
    nextStepDueDate:String(data.get('nextStepDueDate')||''),
    notes:String(data.get('notes')||'').trim(),
    updatedAt:now
  };
  if(updated.stage!==current.stage){
    updated.history=[...(current.history||[]),{
      stage:updated.stage,
      changedAt:now,
      note:`Status geändert: ${stageLabel(updated.stage)}`
    }].slice(-20);
  }
  state.opportunities[state.activeIndex]=updated;
  plant.salesPipeline={
    ...state.pipeline,
    activeOpportunityId:updated.id,
    opportunities:state.opportunities
  };
  plant.salesFunnel={
    ...(plant.salesFunnel&&typeof plant.salesFunnel==='object'?plant.salesFunnel:{}),
    stage:updated.stage,
    nextStep:updated.nextStep,
    lastContactDate:updated.lastContactDate,
    notes:updated.notes,
    history:updated.history
  };

  if(createTask){
    if(!updated.nextStep)return false;
    plant.actions=Array.isArray(plant.actions)?plant.actions:[];
    const alreadyOpen=plant.actions.some(action=>
      action?.status!=='done'&&
      action?.followUpType==='sales-next-step'&&
      action?.followUpSourceId===updated.id&&
      String(action?.title||'').trim()===updated.nextStep
    );
    if(!alreadyOpen){
      plant.actions.push({
        id:makeId(),
        title:updated.nextStep,
        description:'Aus dem Vertriebsbereich der Anlagenakte erstellt.',
        status:'open',
        priority:'normal',
        dueDate:updated.nextStepDueDate,
        component:'',
        sourceVisitId:'',
        createdAt:now,
        completedAt:'',
        autoGenerated:false,
        followUpType:'sales-next-step',
        followUpSourceId:updated.id,
        taskType:'commercial',
        contactName:''
      });
    }
  }
  plant.updatedAt=now;
  if(!writePlants(plants))return false;
  if(createTask)window.setTimeout(()=>window.VTACloudTasks?.sync?.(),80);
  const section=document.querySelector('.sales-simplified-section');
  if(section)renderSection(section,plant,salesState(plant));
  return true;
}

function simplifyRequestSection(section){
  if(section.dataset.salesSimpleRequest===BUILD)return;
  const title=section.querySelector('h2')?.textContent?.trim();
  if(title!=='Interne Anfrage erstellen')return;
  section.dataset.salesSimpleRequest=BUILD;
  const heading=section.querySelector('.section-heading p.form-note');
  if(heading)heading.textContent='Produkt auswählen und interne Angebots- oder Bestellanfrage vorbereiten.';
  const info=section.querySelector('.info-box');
  if(info)info.remove();
}

function hideObsoleteProductSection(section){
  const title=section.querySelector('h2')?.textContent?.trim();
  if(title==='Produktaktesammlung')section.hidden=true;
}

function enhance(){
  if(isDemo())return;
  const sales=document.querySelector('.sales-funnel-section,.sales-simplified-section');
  if(!sales)return;
  const plants=readPlants();
  const plant=activePlant(plants);
  if(!plant)return;
  const state=salesState(plant);
  if(sales.dataset.salesSimplified!==BUILD||sales.dataset.salesSimpleFingerprint!==renderFingerprint(state))renderSection(sales,plant,state);
  document.querySelectorAll('#applicationView .dashboard-section').forEach(section=>{
    simplifyRequestSection(section);
    hideObsoleteProductSection(section);
  });
}

function queueEnhance(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;enhance()});
}

function start(){
  queueEnhance();
  const root=document.querySelector('#mainContent')||document.body;
  observer=new MutationObserver(queueEnhance);
  observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',queueEnhance);
  window.addEventListener('vta:sales-simplified-updated',queueEnhance);
}

window.VTASalesSimple={build:BUILD,refresh:queueEnhance};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
