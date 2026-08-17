const BUILD='0.11.0-alpha.49';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const DUE_KEY='vta-sales-next-step-due-v01';
const STAGES=[['analysis','Kontakt / Bedarf'],['trial','Versuch läuft'],['offer','Angebot'],['order','Auftrag / Kunde'],['aftercare','Nachbetreuung']];
let scheduled=false,busy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const stageLabel=s=>STAGES.find(([id])=>id===s)?.[1]||'Kontakt / Bedarf';
function plants(){try{const v=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function activePlant(){const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';return plants().find(p=>p?.id===id)||null}
function state(plant){
  const pipeline=plant?.salesPipeline&&typeof plant.salesPipeline==='object'?plant.salesPipeline:{};
  let list=Array.isArray(pipeline.opportunities)?pipeline.opportunities:[];
  if(!list.length)list=[{id:'sales-main',...(plant?.salesFunnel||{})}];
  const wanted=String(pipeline.activeOpportunityId||list[0]?.id||'sales-main');
  const active=list.find(x=>String(x?.id)===wanted)||list[0]||{};
  return {pipeline,list,active:{...active,id:String(active.id||'sales-main'),stage:STAGES.some(([id])=>id===active.stage)?active.stage:'analysis',nextStep:String(active.nextStep||''),lastContactDate:String(active.lastContactDate||''),notes:String(active.notes||''),history:Array.isArray(active.history)?active.history:[]}};
}
function dueMap(){try{const v=JSON.parse(localStorage.getItem(DUE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
const dueKey=(pid,oid)=>`${pid}::${oid}`;
function getDue(plant,opp){const map=dueMap();return String(map[dueKey(plant.id,opp.id)]??opp.nextStepDueDate??'')}
function setDue(plant,opp,value){const map=dueMap(),key=dueKey(plant.id,opp.id);if(value)map[key]=value;else delete map[key];localStorage.setItem(DUE_KEY,JSON.stringify(map))}
function fmt(value){if(!value)return '—';const raw=String(value),iso=raw.includes('T')?raw.slice(0,10):raw,d=new Date(`${iso}T00:00:00`);return Number.isNaN(d.getTime())?raw:d.toLocaleDateString('de-DE')}
function historyHtml(items=[]){const list=items.slice(-5).reverse();return list.length?`<div class="sales-simple-history-list">${list.map(x=>`<div><span>${esc(fmt(x.changedAt))}</span><strong>${esc(stageLabel(x.stage))}</strong><small>${esc(x.note||'Status geändert')}</small></div>`).join('')}</div>`:'<p class="sales-simple-empty">Noch keine Statusänderungen dokumentiert.</p>'}
function waitFor(selector,previous=null,timeout=1800){const start=Date.now();return new Promise(resolve=>{const tick=()=>{const el=document.querySelector(selector);if(el&&el!==previous)return resolve(el);if(Date.now()-start>timeout)return resolve(el||null);requestAnimationFrame(tick)};tick()})}
function dataOf(form){const d=new FormData(form),stage=String(d.get('stage')||'analysis');return {stage:STAGES.some(([id])=>id===stage)?stage:'analysis',nextStep:String(d.get('nextStep')||'').trim(),lastContactDate:String(d.get('lastContactDate')||''),dueDate:String(d.get('dueDate')||''),notes:String(d.get('notes')||'').trim()}}
async function saveViaApp(data,plant,s){
  let original=document.querySelector('.sales-funnel-section');if(!original)return false;
  if(data.stage!==s.active.stage){const b=original.querySelector(`[data-funnel-stage="${CSS.escape(data.stage)}"]`);if(!b)return false;const prev=original;b.click();original=await waitFor('.sales-funnel-section',prev);if(!original)return false}
  const form=original.querySelector('#salesFunnelForm');if(!form)return false;
  const set=(n,v)=>{const f=form.elements.namedItem(n);if(f)f.value=v};
  set('salesFunnelNextStep',data.nextStep);set('salesFunnelLastContact',data.lastContactDate);set('salesFunnelNotes',data.notes);
  const prev=original;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor('.sales-funnel-section',prev);setDue(plant,s.active,data.dueDate);return true;
}
function hasTask(plantId,title,due){const p=plants().find(x=>x?.id===plantId);return Boolean(p&&(p.actions||[]).some(a=>a?.status!=='done'&&String(a?.title||'').trim()===title&&String(a?.dueDate||'')===String(due||'')&&(a?.taskType==='commercial'||a?.followUpType==='sales-next-step')))}
async function createTask(plantId,title,due){
  if(hasTask(plantId,title,due)){document.querySelector('[data-plant-page="tasks"]')?.click();return true}
  const nav=document.querySelector('[data-plant-page="tasks"]');if(!nav)return false;nav.click();
  const form=await waitFor('#quickActionForm');if(!form)return false;
  const set=(n,v)=>{const f=form.elements.namedItem(n);if(f)f.value=v};
  set('taskType','commercial');set('title',title);set('priority','normal');set('dueDate',due||'');
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,120));const ok=hasTask(plantId,title,due);if(ok)setTimeout(()=>window.VTACloudTasks?.sync?.(),80);return ok;
}
function render(simple,plant,s){
  const a=s.active,due=getDue(plant,a),extra=Math.max(0,s.list.length-1);simple.dataset.salesSimplified=BUILD;
  simple.innerHTML=`<div class="section-heading sales-simple-heading"><div><p class="eyebrow">Vertrieb</p><h2>Vertriebsstatus</h2><p class="form-note">Status, nächster Schritt und Nachverfolgung – ohne Forecast und komplexe Pipeline.</p></div><span class="status-chip blue">${esc(stageLabel(a.stage))}</span></div>
  <form class="sales-simple-form" id="salesSimpleForm"><div class="sales-simple-grid">
  <label class="field-label">Aktueller Status<select name="stage">${STAGES.map(([id,l])=>`<option value="${id}" ${a.stage===id?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
  <label class="field-label">Letzter Kontakt<input name="lastContactDate" type="date" value="${esc(a.lastContactDate)}"></label>
  <label class="field-label sales-simple-span-2">Nächster Schritt<input name="nextStep" value="${esc(a.nextStep)}" placeholder="z. B. Versuchsergebnis mit Betreiber besprechen"></label>
  <label class="field-label">Fällig am<input name="dueDate" type="date" value="${esc(due)}"></label>
  <div class="sales-simple-task-hint"><span>Nachverfolgung</span><strong>${a.nextStep?'Als Aufgabe übernehmbar':'Nächsten Schritt eintragen'}</strong></div>
  <label class="field-label sales-simple-span-2">Notiz<textarea name="notes" rows="4" placeholder="Kurzer Stand zum Kunden, Versuch oder Angebot">${esc(a.notes)}</textarea></label></div>
  ${extra?`<p class="sales-simple-legacy-note">${extra} weitere ältere Verkaufschance${extra===1?' bleibt':'n bleiben'} im Datenbestand erhalten.</p>`:''}
  <div class="sales-simple-actions"><button type="submit" class="button primary">Speichern</button><button type="button" class="button secondary" data-sales-create-task ${a.nextStep?'':'disabled'}>Als Aufgabe anlegen</button></div><p class="sales-simple-message" role="status" aria-live="polite"></p></form>
  <details class="sales-simple-history"><summary>Verlauf anzeigen</summary>${historyHtml(a.history)}</details>`;
  const form=simple.querySelector('#salesSimpleForm'),msg=simple.querySelector('.sales-simple-message'),task=simple.querySelector('[data-sales-create-task]');
  form.addEventListener('input',()=>{task.disabled=!dataOf(form).nextStep||busy});
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;msg.textContent='Speichere …';const ok=await saveViaApp(dataOf(form),plant,s);busy=false;if(!ok){msg.textContent='Speichern nicht möglich.';return}queue()});
  task.addEventListener('click',async()=>{if(busy)return;const data=dataOf(form);if(!data.nextStep)return;busy=true;task.disabled=true;msg.textContent='Vertriebsstand wird gespeichert …';const saved=await saveViaApp(data,plant,s);if(!saved){busy=false;msg.textContent='Speichern nicht möglich.';task.disabled=false;return}const ok=await createTask(plant.id,data.nextStep,data.dueDate);busy=false;if(!ok){const m=document.querySelector('.sales-simple-message');if(m)m.textContent='Aufgabe konnte nicht angelegt werden.'}});
}
function enhance(){
  if(isDemo())return;const original=document.querySelector('.sales-funnel-section');if(!original)return;original.hidden=true;original.dataset.salesSimpleOriginal=BUILD;
  let simple=document.querySelector('.sales-simplified-section');if(!simple){simple=document.createElement('section');simple.className='dashboard-section sales-simplified-section';original.before(simple)}
  const plant=activePlant();if(!plant)return;if(simple.dataset.salesSimplified!==BUILD)render(simple,plant,state(plant));
  document.querySelectorAll('#applicationView .dashboard-section').forEach(section=>{const title=section.querySelector('h2')?.textContent?.trim();if(title==='Interne Anfrage erstellen'){section.querySelector('.info-box')?.remove();const p=section.querySelector('.section-heading p.form-note');if(p)p.textContent='Produkt auswählen und interne Angebots- oder Bestellanfrage vorbereiten.'}if(title==='Produktaktesammlung')section.hidden=true});
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function start(){queue();new MutationObserver(queue).observe(document.querySelector('#mainContent')||document.body,{childList:true,subtree:true});window.addEventListener('pageshow',queue)}
window.VTASalesSimple={build:BUILD,refresh:queue};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
