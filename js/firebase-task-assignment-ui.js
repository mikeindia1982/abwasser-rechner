import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.46';
const PLANTS_KEY='abwasser-plants-v07';
const TASKS='tasks';
let firestoreApi=null;
let authApi=null;
let db=null;
let auth=null;
let dialog=null;
let observer=null;
let scheduled=false;

const session=()=>window.VTAFirebaseSession||null;
const uid=()=>session()?.user?.uid||session()?.profile?.uid||'';
const role=()=>session()?.role||'';
const manager=()=>['admin','teamlead'].includes(role());
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function users(){
  const source=window.VTACloudTasks?.users||[];
  const list=Array.isArray(source)?source.slice():[];
  const me=session()?.profile||session()?.user||{};
  const myUid=uid();
  if(myUid&&!list.some(user=>(user.uid||user.id)===myUid))list.unshift({uid:myUid,...me});
  return list.filter(user=>user&&user.active!==false&&(user.uid||user.id));
}

function userId(user){return String(user?.uid||user?.id||'')}
function userName(user){
  const name=[user?.firstName,user?.lastName].filter(Boolean).join(' ').trim();
  return name||user?.name||user?.email||'Mitarbeiter';
}

function readTask(taskId){
  try{
    const plants=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');
    if(!Array.isArray(plants))return null;
    for(const plant of plants){
      const action=(Array.isArray(plant?.actions)?plant.actions:[]).find(item=>String(item?.id||'')===String(taskId));
      if(action)return {plant,action};
    }
  }catch(error){console.warn('Aufgabendetail konnte nicht gelesen werden',error)}
  return null;
}

async function ensureFirebase(){
  if(db&&auth?.currentUser)return;
  const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  authApi=authModule;firestoreApi=firestoreModule;
  const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(firebaseConfig);
  auth=authModule.getAuth(app);db=firestoreModule.getFirestore(app);
  if(!auth.currentUser)throw new Error('Keine aktive Firebase-Anmeldung.');
}

async function assignTask(taskId,newUid){
  if(!manager())throw new Error('Nur Administratoren und Teamleitungen können Aufgaben zuweisen.');
  const target=users().find(user=>userId(user)===String(newUid));
  if(!target)throw new Error('Der ausgewählte Mitarbeiter wurde nicht gefunden.');
  await ensureFirebase();
  await firestoreApi.updateDoc(firestoreApi.doc(db,TASKS,String(taskId)),{
    assignedToUserId:userId(target),
    assignedToName:userName(target),
    updatedAt:new Date().toISOString(),
    updatedByUserId:uid()
  });
  window.dispatchEvent(new CustomEvent('vta:task-assignment-changed',{detail:{taskId:String(taskId),assignedToUserId:userId(target),assignedToName:userName(target),build:BUILD}}));
  return target;
}

function dueLabel(value){
  if(!value)return 'Ohne Fälligkeit';
  const date=new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('de-DE');
}

function priorityLabel(value){return value==='high'?'Hoch':'Normal'}

function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='firebaseTaskDetailDialog';
  dialog.className='firebase-task-detail-dialog';
  document.body.append(dialog);
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  return dialog;
}

function plantOpenButton(card){
  return [...card.querySelectorAll('button')].find(button=>button.textContent.trim()==='Anlage öffnen'&&!button.hidden)||null;
}

function renderAssignmentChoices(taskId,currentUid){
  if(!manager())return '';
  const list=users();
  if(!list.length)return '<p class="firebase-task-detail-note">Mitarbeiterliste wird geladen …</p>';
  return `<div class="firebase-task-people" role="list">${list.map(user=>{
    const id=userId(user),selected=id===currentUid;
    return `<button type="button" class="firebase-task-person ${selected?'selected':''}" data-task-assign-user="${esc(id)}" role="listitem" aria-pressed="${selected?'true':'false'}"><span class="firebase-task-person-avatar">${esc(userName(user).split(/\s+/).map(part=>part[0]||'').join('').slice(0,2).toUpperCase()||'MA')}</span><span><strong>${esc(userName(user))}</strong><small>${esc(user?.role||'Mitarbeiter')}${selected?' · aktuell':''}</small></span><span class="firebase-task-person-check">${selected?'✓':'→'}</span></button>`;
  }).join('')}</div>`;
}

function openDetail(card){
  const taskId=card?.dataset?.actionId||'';
  const found=readTask(taskId);
  if(!found)return;
  const {plant,action}=found;
  const currentUid=String(action.assignedToUserId||uid());
  const currentName=action.assignedToName||userName(users().find(user=>userId(user)===currentUid))||'Mitarbeiter';
  const dlg=ensureDialog();
  dlg.innerHTML=`<div class="firebase-task-detail-card">
    <header class="firebase-task-detail-head"><div><p class="eyebrow">Aufgabe</p><h2>${esc(action.title||'Aufgabe')}</h2><p>${esc(plant?.master?.name||'Kläranlage')}</p></div><button type="button" data-task-detail-close aria-label="Schließen">×</button></header>
    <div class="firebase-task-detail-facts"><div><span>Status</span><strong>${action.status==='done'?'Erledigt':'Offen'}</strong></div><div><span>Priorität</span><strong>${esc(priorityLabel(action.priority))}</strong></div><div><span>Fälligkeit</span><strong>${esc(dueLabel(action.dueDate))}</strong></div><div><span>Zuständig</span><strong>${esc(currentName)}</strong></div></div>
    ${action.contactName?`<p class="firebase-task-detail-note"><strong>Ansprechpartner:</strong> ${esc(action.contactName)}</p>`:''}
    ${action.description?`<p class="firebase-task-detail-note">${esc(action.description)}</p>`:''}
    <section class="firebase-task-detail-section"><div><p class="eyebrow">Zuweisung</p><h3>${manager()?'Mitarbeiter auswählen':'Zuständigkeit'}</h3></div>${manager()?renderAssignmentChoices(taskId,currentUid):`<p class="firebase-task-detail-note">${esc(currentName)}</p>`}</section>
    <footer class="firebase-task-detail-actions"><button type="button" class="button secondary" data-task-detail-close>Schließen</button>${plantOpenButton(card)?'<button type="button" class="button primary" data-task-open-plant>Anlage öffnen</button>':''}</footer>
  </div>`;
  dlg.querySelectorAll('[data-task-detail-close]').forEach(button=>button.addEventListener('click',()=>dlg.close()));
  dlg.querySelector('[data-task-open-plant]')?.addEventListener('click',()=>{dlg.close();plantOpenButton(card)?.click()});
  dlg.querySelectorAll('[data-task-assign-user]').forEach(button=>button.addEventListener('click',async()=>{
    const newUid=button.dataset.taskAssignUser;
    dlg.querySelectorAll('[data-task-assign-user]').forEach(item=>item.disabled=true);
    try{
      const target=await assignTask(taskId,newUid);
      action.assignedToUserId=userId(target);action.assignedToName=userName(target);
      button.closest('.firebase-task-detail-section')?.insertAdjacentHTML('beforeend',`<p class="firebase-task-save-ok">Zugewiesen an ${esc(userName(target))}.</p>`);
      window.setTimeout(()=>{decorate();openDetail(card)},350);
    }catch(error){
      console.error('Aufgabe konnte nicht zugewiesen werden',error);
      button.closest('.firebase-task-detail-section')?.insertAdjacentHTML('beforeend',`<p class="firebase-task-save-error">${esc(error?.message||'Zuweisung fehlgeschlagen.')}</p>`);
      dlg.querySelectorAll('[data-task-assign-user]').forEach(item=>item.disabled=false);
    }
  }));
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
}

async function openAssignment(card){
  openDetail(card);
  window.setTimeout(()=>dialog?.querySelector('.firebase-task-detail-section')?.scrollIntoView({block:'nearest'}),0);
}

function dedupePlantButtons(card){
  const buttons=[...card.querySelectorAll('button')].filter(button=>button.textContent.trim()==='Anlage öffnen');
  buttons.slice(1).forEach(button=>button.hidden=true);
}

function decorateCard(card){
  const taskId=card.dataset.actionId||'';
  if(!taskId)return;
  const found=readTask(taskId);
  const host=card.querySelector('.firebase-task-assignee');
  if(host){
    const action=found?.action||{};
    const assignedName=action.assignedToName||host.querySelector('select option:checked')?.textContent||session()?.profile?.firstName||'Mitarbeiter';
    if(manager()){
      if(!host.querySelector('[data-task-assign-open]')){
        host.innerHTML=`<span class="firebase-task-assignee-name">Zuständig: <strong>${esc(assignedName)}</strong></span><button type="button" class="firebase-task-assign-button" data-task-assign-open>Zuweisen</button><span class="firebase-task-cloud-chip">Cloud</span>`;
        host.querySelector('[data-task-assign-open]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openAssignment(card)});
      }
    }
  }
  let actions=card.querySelector('.task-actions');
  if(!actions){actions=document.createElement('div');actions.className='task-actions';card.append(actions)}
  if(!actions.querySelector('[data-task-detail-open]')){
    const button=document.createElement('button');button.type='button';button.className='firebase-task-open-button';button.dataset.taskDetailOpen='';button.textContent='Aufgabe öffnen';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDetail(card)});
    actions.insertBefore(button,actions.firstChild);
  }
  dedupePlantButtons(card);
}

function decorate(){
  if(document.querySelector('.global-task-list'))document.querySelectorAll('.global-task-list [data-action-id][data-plant-id]').forEach(decorateCard);
}

function queueDecorate(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;decorate()});
}

function start(){
  decorate();
  const root=document.querySelector('#mainContent')||document.body;
  observer=new MutationObserver(queueDecorate);
  observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('vta:cloud-tasks-updated',queueDecorate);
  window.addEventListener('vta:firebase-session',queueDecorate);
  window.addEventListener('pageshow',queueDecorate);
}

window.VTATaskAssignmentUI={build:BUILD,openTask:taskId=>{const card=document.querySelector(`[data-action-id="${CSS.escape(String(taskId))}"]`);if(card)openDetail(card)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
