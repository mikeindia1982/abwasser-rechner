(()=>{
'use strict';

const BUILD='0.11.0-alpha.52';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const DUE_KEY='vta-sales-next-step-due-v01';
const STAGES=[['analysis','Kontakt / Bedarf'],['trial','Versuch läuft'],['offer','Angebot'],['order','Auftrag / Kunde'],['aftercare','Nachbetreuung']];
let scheduled=false,busy=false;

const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageLabel=s=>STAGES.find(([id])=>id===s)?.[1]||'Kontakt / Bedarf';
function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function plants(){const v=readJson(PLANTS_KEY,[]);return Array.isArray(v)?v:[]}
function activePlant(){const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';return plants().find(p=>p?.id===id)||null}
function state(plant){
  const pipeline=plant?.salesPipeline&&typeof plant.salesPipeline==='object'?plant.salesPipeline:{};
  let list=Array.isArray(pipeline.opportunities)?pipeline.opportunities:[];
  if(!list.length)list=[{id:'sales-main',...(plant?.salesFunnel||{})}];
  const wanted=String(pipeline.activeOpportunityId||list[0]?.id||'sales-main');
  const active=list.find(x=>String(x?.id)===wanted)||list[0]||{};
  return {pipeline,list,active:{...active,id:String(active.id||'sales-main'),stage:STAGES.some(([id])=>id===active.stage)?active.stage:'analysis',nextStep:String(active.nextStep||''),lastContactDate:String(active.lastContactDate||''),notes:String(active.notes||''),history:Array.isArray(active.history)?active.history:[]}};
}
function dueMap(){const v=readJson(DUE_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
const dueKey=(pid,oid)=>`${pid}::${oid}`;
function getDue(plant,opp){const map=dueMap();return String(map[dueKey(plant.id,opp.id)]??opp.nextStepDueDate??'')}
function setDue(plant,opp,value){const map=dueMap(),key=dueKey(plant.id,opp.id);if(value)map[key]=value;else delete map[key];localStorage.setItem(DUE_KEY,JSON.stringify(map))}
function fmt(value){if(!value)return '—';const raw=String(value),iso=raw.includes('T')?raw.slice(0,10):raw,d=new Date(`${iso}T00:00:00`);return Number.isNaN(d.getTime())?raw:d.toLocaleDateString('de-DE')}
function historyHtml(items=[]){const list=items.slice(-5).reverse();return list.length?`<div class="sales-simple-history-list">${list.map(x=>`<div><span>${esc(fmt(x.changedAt))}</span><strong>${esc(stageLabel(x.stage))}</strong><small>${esc(x.note||'Status geändert')}</small></div>`).join('')}</div>`:'<p class="sales-simple-empty">Noch keine Statusänderungen dokumentiert.</p>'}
function dataOf(form){const d=new FormData(form),stage=String(d.get('stage')||'analysis');return {stage:STAGES.some(([id])=>id===stage)?stage:'analysis',nextStep:String(d.get('nextStep')||'').trim(),lastContactDate:String(d.get('lastContactDate')||''),dueDate:String(d.get('dueDate')||''),notes:String(d.get('notes')||'').trim()}}
function fingerprint(plant,s){const a=s.active;return JSON.stringify([plant.id,a.id,a.stage,a.nextStep,a.lastContactDate,a.notes,getDue(plant,a),a.history?.length||0,s.list.length])}
function sourceRoot(section){return section?.querySelector('[data-sales-original-content]')||section}
function sourceForm(section){return sourceRoot(section)?.querySelector('#salesFunnelForm')||null}
function waitForForm(previous=null,timeout=2200){const start=Date.now();return new Promise(resolve=>{const tick=()=>{const section=document.querySelector('.sales-funnel-section');const form=sourceForm(section);if(form&&form!==previous)return resolve({section,form});if(Date.now()-start>timeout)return resolve(form?{section,form}:null);requestAnimationFrame(tick)};tick()})}

async function saveViaApp(data,plant,s){
  let section=document.querySelector('.sales-funnel-section');
  if(!section)return false;
  let form=sourceForm(section);
  if(!form)return false;
  if(data.stage!==s.active.stage){
    const stageButton=sourceRoot(section)?.querySelector(`[data-funnel-stage="${CSS.escape(data.stage)}"]`);
    if(!stageButton)return false;
    const previousForm=form;
    stageButton.click();
    const fresh=await waitForForm(previousForm);
    if(!fresh)return false;
    section=fresh.section;form=fresh.form;
  }
  const set=(name,value)=>{const field=form.elements.namedItem(name);if(field)field.value=value};
  set('salesFunnelNextStep',data.nextStep);
  set('salesFunnelLastContact',data.lastContactDate);
  set('salesFunnelNotes',data.notes);
  const previousForm=form;
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await waitForForm(previousForm);
  setDue(plant,s.active,data.dueDate);
  return true;
}
function hasTask(plantId,title,due){const p=plants().find(x=>x?.id===plantId);return Boolean(p&&(p.actions||[]).some(a=>a?.status!=='done'&&String(a?.title||'').trim()===title&&String(a?.dueDate||'')===String(due||'')&&(a?.taskType==='commercial'||a?.followUpType==='sales-next-step')))}
async function createTask(plantId,title,due){
  if(hasTask(plantId,title,due)){document.querySelector('[data-plant-page="tasks"]')?.click();return true}
  const nav=document.querySelector('[data-plant-page="tasks"]');if(!nav)return false;nav.click();
  const start=Date.now();let form=null;while(Date.now()-start<2200){form=document.querySelector('#quickActionForm');if(form)break;await new Promise(r=>requestAnimationFrame(r))}
  if(!form)return false;
  const set=(name,value)=>{const field=form.elements.namedItem(name);if(field)field.value=value};
  set('taskType','commercial');set('title',title);set('priority','normal');set('dueDate',due||'');
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,160));
  const ok=hasTask(plantId,title,due);if(ok)setTimeout(()=>window.VTACloudTasks?.sync?.(),80);return ok;
}

function renderHost(host,plant,s){
  const a=s.active,due=getDue(plant,a),extra=Math.max(0,s.list.length-1);
  host.dataset.salesWorkspaceFingerprint=fingerprint(plant,s);
  host.innerHTML=`<div class="section-heading sales-simple-heading"><div><p class="eyebrow">Vertrieb</p><h2>Vertriebsstatus</h2><p class="form-note">Status, nächster Schritt und Nachverfolgung – ohne Forecast und komplexe Pipeline.</p></div><span class="status-chip blue">${esc(stageLabel(a.stage))}</span></div>
  <form class="sales-simple-form" data-sales-workspace-form><div class="sales-simple-grid">
  <label class="field-label">Aktueller Status<select name="stage">${STAGES.map(([id,label])=>`<option value="${id}" ${a.stage===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
  <label class="field-label">Letzter Kontakt<input name="lastContactDate" type="date" value="${esc(a.lastContactDate)}"></label>
  <label class="field-label sales-simple-span-2">Nächster Schritt<input name="nextStep" value="${esc(a.nextStep)}" placeholder="z. B. Versuchsergebnis mit Betreiber besprechen"></label>
  <label class="field-label">Fällig am<input name="dueDate" type="date" value="${esc(due)}"></label>
  <div class="sales-simple-task-hint"><span>Nachverfolgung</span><strong>${a.nextStep?'Als Aufgabe übernehmbar':'Nächsten Schritt eintragen'}</strong></div>
  <label class="field-label sales-simple-span-2">Notiz<textarea name="notes" rows="4" placeholder="Kurzer Stand zum Kunden, Versuch oder Angebot">${esc(a.notes)}</textarea></label></div>
  ${extra?`<p class="sales-simple-legacy-note">${extra} weitere ältere Verkaufschance${extra===1?' bleibt':'n bleiben'} im Datenbestand erhalten.</p>`:''}
  <div class="sales-simple-actions"><button type="submit" class="button primary">Speichern</button><button type="button" class="button secondary" data-sales-create-task ${a.nextStep?'':'disabled'}>Als Aufgabe anlegen</button></div><p class="sales-simple-message" role="status" aria-live="polite"></p></form>
  <details class="sales-simple-history"><summary>Verlauf anzeigen</summary>${historyHtml(a.history)}</details>`;
  const form=host.querySelector('[data-sales-workspace-form]'),msg=host.querySelector('.sales-simple-message'),task=host.querySelector('[data-sales-create-task]');
  form.addEventListener('input',()=>{task.disabled=!dataOf(form).nextStep||busy});
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const data=dataOf(form);busy=true;msg.textContent='Speichere …';const ok=await saveViaApp(data,plant,s);busy=false;if(!ok){msg.textContent='Speichern nicht möglich.';return}queue()});
  task.addEventListener('click',async()=>{if(busy)return;const data=dataOf(form);if(!data.nextStep)return;busy=true;task.disabled=true;msg.textContent='Vertriebsstand wird gespeichert …';const saved=await saveViaApp(data,plant,s);if(!saved){busy=false;msg.textContent='Speichern nicht möglich.';task.disabled=false;return}const ok=await createTask(plant.id,data.nextStep,data.dueDate);busy=false;if(!ok){const current=document.querySelector('.sales-simple-message');if(current)current.textContent='Aufgabe konnte nicht angelegt werden.'}});
}
function prepareSection(section,plant,s){
  if(!section)return;
  let source=section.querySelector('[data-sales-original-content]');
  let host=section.querySelector('[data-sales-workspace-host]');
  if(!source){
    source=document.createElement('div');source.dataset.salesOriginalContent=BUILD;source.hidden=true;
    while(section.firstChild)source.appendChild(section.firstChild);
    section.appendChild(source);
  }else source.hidden=true;
  if(!host){host=document.createElement('div');host.dataset.salesWorkspaceHost=BUILD;section.insertBefore(host,source)}
  section.classList.add('sales-simplified-section');
  section.dataset.salesWorkspace=BUILD;
  const nextFingerprint=fingerprint(plant,s);
  if(host.dataset.salesWorkspaceFingerprint!==nextFingerprint)renderHost(host,plant,s);
}
function simplifyOtherSections(){document.querySelectorAll('#applicationView .dashboard-section').forEach(section=>{const title=section.querySelector('h2')?.textContent?.trim();if(title==='Interne Anfrage erstellen'){section.querySelector('.info-box')?.remove();const p=section.querySelector('.section-heading p.form-note');if(p)p.textContent='Produkt auswählen und interne Angebots- oder Bestellanfrage vorbereiten.'}if(title==='Produktaktesammlung')section.hidden=true})}
function enhance(){
  if(isDemo())return;
  const section=document.querySelector('.sales-funnel-section');
  const plant=activePlant();
  if(section&&plant)prepareSection(section,plant,state(plant));
  simplifyOtherSections();
  window.VTASalesOffers?.refresh?.();
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function start(){queue();new MutationObserver(queue).observe(document.querySelector('#mainContent')||document.body,{childList:true,subtree:true});window.addEventListener('pageshow',queue);window.addEventListener('vta:sales-offers-updated',queue)}
window.VTASalesWorkspace={build:BUILD,refresh:queue};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
