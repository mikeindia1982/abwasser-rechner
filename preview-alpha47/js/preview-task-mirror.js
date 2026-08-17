(() => {
  const BUILD='preview-alpha47-taskfix1';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
  const TASK_TYPES={
    general:{label:'Aufgabe',icon:'✓'},
    call:{label:'Anruf',icon:'☎'},
    scheduling:{label:'Termin vereinbaren',icon:'◷'},
    email:{label:'E-Mail',icon:'✉'},
    followup:{label:'Nachfassen',icon:'↻'},
    review:{label:'Kontrolle',icon:'◎'},
    technical:{label:'Technische Maßnahme',icon:'⚙'},
    commercial:{label:'Angebot / Bestellung',icon:'€'},
    'spare-part':{label:'Ersatzteil',icon:'▣'}
  };

  let scheduled=false;
  let observing=false;

  const tenant=()=>globalThis.__ABWASSER_PREVIEW_TENANT__||'';
  const storageBridge=()=>globalThis.AbwasserPreviewStorage||null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const meta=type=>TASK_TYPES[type]||TASK_TYPES.general;

  function readJson(value,fallback){
    try{return JSON.parse(value??'')}
    catch{return fallback}
  }

  function productivePlants(){
    if(tenant()!=='vta')return [];
    const raw=storageBridge()?.readProductive?.(PLANTS_KEY);
    const value=readJson(raw,[]);
    return Array.isArray(value)?value:[];
  }

  function productiveTasks(){
    return productivePlants().flatMap(plant=>(Array.isArray(plant?.actions)?plant.actions:[])
      .filter(action=>action&&action.status!=='done')
      .map(action=>({plant,action}))
    );
  }

  function dueLabel(value){
    if(!value)return 'Ohne Fälligkeit';
    const date=new Date(`${String(value).slice(0,10)}T00:00:00`);
    return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('de-DE');
  }

  function cardHtml(plant,action){
    const taskMeta=meta(action.taskType);
    const assigned=String(action.assignedToName||'').trim();
    return `<article class="global-task-card task-type-${esc(action.taskType||'general')} ${action.priority==='high'?'high':''}" data-action-id="${esc(action.id)}" data-plant-id="${esc(plant.id||'')}" data-preview-productive-task="${BUILD}">
      <div class="task-type-badge"><span class="task-type-icon">${esc(taskMeta.icon)}</span>${esc(taskMeta.label)}</div>
      <div class="task-content">
        <span>${esc(plant?.master?.name||'Kläranlage')}</span>
        <strong>${esc(action.title||'Aufgabe')}</strong>
        <div class="task-meta"><span>${esc(dueLabel(action.dueDate))}</span><span>${action.priority==='high'?'Hohe Priorität':'Normal'}</span>${assigned?`<span>Zuständig: ${esc(assigned)}</span>`:''}<span>Produktivdaten · nur lesend</span></div>
      </div>
      <div class="task-actions"><button type="button" data-preview-open-plant="${esc(plant.id||'')}">Anlage öffnen</button></div>
    </article>`;
  }

  function taskSignature(plant,action){
    return JSON.stringify([plant?.master?.name||'',action?.title||'',action?.taskType||'general',action?.priority||'normal',action?.dueDate||'',action?.assignedToName||'']);
  }

  function ensureNotice(list,count){
    let notice=list.parentElement?.querySelector?.('[data-preview-task-mirror-notice]');
    if(!count){notice?.remove();return}
    if(!notice){
      notice=document.createElement('div');
      notice.className='empty-panel compact';
      notice.dataset.previewTaskMirrorNotice=BUILD;
      notice.innerHTML='<p><strong>Preview-Aufgaben:</strong> Aktuelle lokale Aufgaben aus dem produktiven VTA-Datenraum werden hier nur lesend gespiegelt. Änderungen in der Preview bleiben getrennt.</p>';
      list.parentElement?.insertBefore(notice,list);
    }
  }

  function reconcile(){
    if(tenant()!=='vta')return;
    const list=document.querySelector('.global-task-list');
    if(!list)return;

    const localIds=new Set([...list.querySelectorAll('[data-action-id]:not([data-preview-productive-task])')].map(card=>String(card.dataset.actionId||'')));
    const mirrored=productiveTasks()
      .filter(({action})=>String(action?.id||'')&&!localIds.has(String(action.id)))
      .sort((a,b)=>String(a.action.dueDate||'9999-12-31').localeCompare(String(b.action.dueDate||'9999-12-31'))||String(a.action.title||'').localeCompare(String(b.action.title||'')));
    const desired=new Map(mirrored.map(item=>[String(item.action.id),item]));

    list.querySelectorAll('[data-preview-productive-task]').forEach(card=>{
      const id=String(card.dataset.actionId||'');
      const item=desired.get(id);
      if(!item){card.remove();return}
      const signature=taskSignature(item.plant,item.action);
      if(card.dataset.previewTaskSignature!==signature){
        const holder=document.createElement('div');
        holder.innerHTML=cardHtml(item.plant,item.action);
        const replacement=holder.firstElementChild;
        replacement.dataset.previewTaskSignature=signature;
        card.replaceWith(replacement);
      }
      desired.delete(id);
    });

    for(const {plant,action} of desired.values()){
      const holder=document.createElement('div');
      holder.innerHTML=cardHtml(plant,action);
      const card=holder.firstElementChild;
      card.dataset.previewTaskSignature=taskSignature(plant,action);
      list.append(card);
    }

    const visibleCards=[...list.querySelectorAll('[data-action-id]')];
    list.querySelectorAll('.empty-panel').forEach(panel=>panel.hidden=visibleCards.length>0);
    ensureNotice(list,mirrored.length);
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;reconcile()});
  }

  function openPlant(plantId){
    if(!plantId)return;
    const select=document.querySelector('#activePlantSelect');
    if(!select||![...select.options].some(option=>option.value===String(plantId))){
      alert('Die Anlage ist in diesem Preview-Datenraum noch nicht vorhanden. Die Aufgabe wird trotzdem in der Übersicht angezeigt.');
      return;
    }
    localStorage.setItem(ACTIVE_PLANT_KEY,String(plantId));
    localStorage.setItem(PLANT_PAGE_KEY,'tasks');
    select.value=String(plantId);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>document.querySelector('[data-plant-page="tasks"]')?.click(),80);
  }

  function bind(){
    if(observing)return;
    observing=true;
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-preview-open-plant]');
      if(!button)return;
      event.preventDefault();
      openPlant(button.dataset.previewOpenPlant);
    },true);
    const root=document.querySelector('#mainContent')||document.body;
    new MutationObserver(queue).observe(root,{childList:true,subtree:true});
    window.addEventListener('storage',queue);
    window.addEventListener('pageshow',queue);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  }

  function init(){bind();queue()}
  globalThis.AbwasserPreviewTaskMirror=Object.freeze({build:BUILD,refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
