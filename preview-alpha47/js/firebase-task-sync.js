import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.44';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const FILTER_KEY='vta-cloud-task-filter-v01';
const TASKS='tasks';
const USERS='users';

let authApi=null;
let firestoreApi=null;
let auth=null;
let db=null;
let unsubscribe=null;
let users=[];
let cloudTasks=new Map();
let cloudReady=false;
let cloudError='';
let started=false;
let syncing=false;
let decorating=false;
let applyingCloud=false;
let legacyIds=new Set();
let fingerprints=new Map();
let pendingAssignment=null;

const session=()=>window.VTAFirebaseSession||null;
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const uid=()=>session()?.user?.uid||session()?.profile?.uid||'';
const role=()=>session()?.role||'';
const manager=()=>['admin','teamlead'].includes(role());
const online=()=>Boolean(session()?.authenticated&&!session()?.offline&&!isDemo());
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function readPlants(){
  try{const value=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');return Array.isArray(value)?value:[]}
  catch(error){console.warn('Cloud-Aufgaben: lokale Anlagen konnten nicht gelesen werden',error);return []}
}

function writePlants(plants,reason){
  try{
    applyingCloud=true;
    localStorage.setItem(PLANTS_KEY,JSON.stringify(plants));
    window.dispatchEvent(new CustomEvent('vta:cloud-tasks-updated',{detail:{reason,build:BUILD}}));
    return true;
  }catch(error){console.error('Cloud-Aufgaben: lokaler Cache konnte nicht geschrieben werden',error);return false}
  finally{applyingCloud=false}
}

function localTasks(plants=readPlants()){
  return plants.flatMap(plant=>(Array.isArray(plant?.actions)?plant.actions:[]).map(action=>({plant,action})));
}

function findLocal(taskId,plants=readPlants()){
  for(const plant of plants){
    const action=(plant.actions||[]).find(item=>item?.id===taskId);
    if(action)return {plant,action};
  }
  return null;
}

function userName(profile){
  const name=[profile?.firstName,profile?.lastName].filter(Boolean).join(' ').trim();
  return name||profile?.name||profile?.email||'Mitarbeiter';
}
const me=()=>userName(session()?.profile||session()?.user||{});
const userById=id=>users.find(user=>user.uid===id)||null;

function fingerprint(action){
  return ['title','status','priority','dueDate','taskType','contactName','completedAt','completionOutcome']
    .map(key=>`${key}:${String(action?.[key]??'')}`).join('|');
}

function remember(){
  fingerprints=new Map();
  localTasks().forEach(({action})=>{if(action?.id)fingerprints.set(action.id,fingerprint(action))});
}

function seedLegacy(){
  legacyIds=new Set(localTasks().filter(({action})=>action?.id&&!action.cloudTaskId).map(({action})=>action.id));
}

async function ensureFirebase(){
  if(db&&auth?.currentUser)return;
  const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)
  ]);
  authApi=authModule;firestoreApi=firestoreModule;
  const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(firebaseConfig);
  auth=authModule.getAuth(app);db=firestoreModule.getFirestore(app);
  if(!auth.currentUser)throw new Error('Keine aktive Firebase-Anmeldung.');
}

function messageFor(error){
  const code=String(error?.code||'');
  if(code.includes('permission-denied'))return 'Firestore-Regeln für Cloud-Aufgaben sind noch nicht freigeschaltet.';
  if(code.includes('network')||code==='unavailable')return 'Firebase ist momentan nicht erreichbar.';
  return error?.message||'Cloud-Aufgaben konnten nicht synchronisiert werden.';
}

async function loadUsers(){
  await ensureFirebase();
  if(manager()){
    const snap=await firestoreApi.getDocs(firestoreApi.collection(db,USERS));
    users=snap.docs.map(doc=>({uid:doc.id,...doc.data()})).filter(user=>user.active!==false);
  }else users=[{uid:uid(),...(session()?.profile||{})}];
  if(!users.some(user=>user.uid===uid()))users.unshift({uid:uid(),...(session()?.profile||{})});
}

function cloudRecord(plant,action,assignment={}){
  const previous=cloudTasks.get(action.id)||{};
  const assignedId=assignment.uid||previous.assignedToUserId||action.assignedToUserId||uid();
  const assignedName=assignment.name||previous.assignedToName||action.assignedToName||userName(userById(assignedId))||(assignedId===uid()?me():'Mitarbeiter');
  const now=new Date().toISOString();
  return {
    id:String(action.id),cloudVersion:1,
    plantId:String(plant.id||''),plantName:String(plant?.master?.name||'Kläranlage'),
    title:String(action.title||'Aufgabe'),description:String(action.description||''),
    status:String(action.status||'open'),priority:String(action.priority||'normal'),dueDate:String(action.dueDate||''),
    taskType:String(action.taskType||'general'),contactName:String(action.contactName||''),component:String(action.component||''),
    sourceVisitId:String(action.sourceVisitId||''),autoGenerated:Boolean(action.autoGenerated),
    followUpType:String(action.followUpType||''),followUpSourceId:String(action.followUpSourceId||''),
    completionOutcome:String(action.completionOutcome||''),completedAt:String(action.completedAt||''),
    assignedToUserId:String(assignedId),assignedToName:String(assignedName),
    createdByUserId:String(previous.createdByUserId||action.createdByUserId||uid()),
    createdByName:String(previous.createdByName||action.createdByName||me()),
    createdAt:String(previous.createdAt||action.createdAt||now),updatedAt:now,updatedByUserId:String(uid())
  };
}

function cloudToLocal(data){
  return {
    id:String(data.id),title:String(data.title||'Aufgabe'),status:String(data.status||'open'),
    priority:String(data.priority||'normal'),dueDate:String(data.dueDate||''),component:String(data.component||''),
    sourceVisitId:String(data.sourceVisitId||''),createdAt:String(data.createdAt||new Date().toISOString()),
    completedAt:String(data.completedAt||''),autoGenerated:Boolean(data.autoGenerated),
    followUpType:String(data.followUpType||''),followUpSourceId:String(data.followUpSourceId||''),
    taskType:String(data.taskType||'general'),contactName:String(data.contactName||''),
    completionOutcome:String(data.completionOutcome||''),cloudTaskId:String(data.id),
    assignedToUserId:String(data.assignedToUserId||''),assignedToName:String(data.assignedToName||''),
    createdByUserId:String(data.createdByUserId||''),createdByName:String(data.createdByName||''),updatedAt:String(data.updatedAt||'')
  };
}

function cacheCloudTask(data){
  cloudTasks.set(data.id,data);
  legacyIds.delete(data.id);
  const plants=readPlants();
  const plant=plants.find(item=>item.id===data.plantId);
  if(!plant)return;
  plant.actions=Array.isArray(plant.actions)?plant.actions:[];
  const index=plant.actions.findIndex(action=>action.id===data.id);
  const incoming=cloudToLocal(data);
  if(index>=0)plant.actions[index]={...plant.actions[index],...incoming};
  else plant.actions.push(incoming);
  writePlants(plants,'cloud-upsert');
}

function removeCachedTask(taskId){
  cloudTasks.delete(taskId);
  const plants=readPlants();let changed=false;
  for(const plant of plants){
    const before=(plant.actions||[]).length;
    plant.actions=(plant.actions||[]).filter(action=>!(action.id===taskId&&action.cloudTaskId));
    changed=changed||before!==plant.actions.length;
  }
  if(changed)writePlants(plants,'cloud-remove');
}

async function subscribeTasks(){
  unsubscribe?.();unsubscribe=null;
  await ensureFirebase();
  const base=firestoreApi.collection(db,TASKS);
  const source=manager()?base:firestoreApi.query(base,firestoreApi.where('assignedToUserId','==',uid()));
  unsubscribe=firestoreApi.onSnapshot(source,snap=>{
    cloudReady=true;cloudError='';
    snap.docChanges().forEach(change=>{
      if(change.type==='removed')removeCachedTask(change.doc.id);
      else cacheCloudTask({id:change.doc.id,...change.doc.data()});
    });
    remember();queueDecorate();
  },error=>{cloudReady=false;cloudError=messageFor(error);console.error('Cloud-Aufgaben Listener',error);queueDecorate()});
}

async function createCloud(plant,action,assignment={}){
  await ensureFirebase();
  const record=cloudRecord(plant,action,assignment);
  await firestoreApi.setDoc(firestoreApi.doc(db,TASKS,action.id),record);
  cloudTasks.set(action.id,record);legacyIds.delete(action.id);
  const plants=readPlants();const local=findLocal(action.id,plants);
  if(local){Object.assign(local.action,cloudToLocal(record));writePlants(plants,'cloud-created')}
}

async function updateCloud(plant,action){
  const current=cloudTasks.get(action.id);if(!current)return;
  await ensureFirebase();const ref=firestoreApi.doc(db,TASKS,action.id);const now=new Date().toISOString();
  if(manager()){
    const record=cloudRecord(plant,action);
    await firestoreApi.setDoc(ref,record,{merge:true});cloudTasks.set(action.id,{...current,...record});
  }else{
    const patch={status:String(action.status||'open'),completedAt:String(action.completedAt||''),completionOutcome:String(action.completionOutcome||''),updatedAt:now,updatedByUserId:uid()};
    await firestoreApi.updateDoc(ref,patch);cloudTasks.set(action.id,{...current,...patch});
  }
}

async function reassign(taskId,newUid){
  if(!manager())return;const current=cloudTasks.get(taskId);if(!current)return;
  const name=userById(newUid)?userName(userById(newUid)):'Mitarbeiter';const patch={assignedToUserId:newUid,assignedToName:name,updatedAt:new Date().toISOString(),updatedByUserId:uid()};
  await ensureFirebase();await firestoreApi.updateDoc(firestoreApi.doc(db,TASKS,taskId),patch);cloudTasks.set(taskId,{...current,...patch});
  const plants=readPlants();const local=findLocal(taskId,plants);if(local){Object.assign(local.action,patch,{cloudTaskId:taskId});writePlants(plants,'cloud-reassign')}
}

async function deleteCloud(taskId){
  if(!manager()||!cloudTasks.has(taskId))return;await ensureFirebase();await firestoreApi.deleteDoc(firestoreApi.doc(db,TASKS,taskId));cloudTasks.delete(taskId);
}

function assignmentFrom(form){
  const selected=form?.querySelector('[name="assignedToUserId"]')?.value||uid();
  return {uid:selected,name:userById(selected)?userName(userById(selected)):(selected===uid()?me():'Mitarbeiter')};
}

async function syncLocal(){
  if(syncing||applyingCloud||!online())return;syncing=true;
  try{
    const plants=readPlants();const newItems=[];const changed=[];
    for(const plant of plants){for(const action of plant.actions||[]){
      if(!action?.id)continue;const old=fingerprints.get(action.id),now=fingerprint(action);
      if(cloudTasks.has(action.id)&&old&&old!==now)changed.push({plant,action});
      if(!cloudTasks.has(action.id)&&!legacyIds.has(action.id)&&!fingerprints.has(action.id))newItems.push({plant,action});
    }}
    for(const item of newItems){
      const assignment=pendingAssignment?.plantId===item.plant.id?pendingAssignment.assignment:{uid:uid(),name:me()};
      try{await createCloud(item.plant,item.action,assignment)}catch(error){cloudError=messageFor(error);console.error('Neue Cloud-Aufgabe',error)}
    }
    pendingAssignment=null;
    for(const item of changed){try{await updateCloud(item.plant,item.action)}catch(error){cloudError=messageFor(error);console.error('Cloud-Aufgabe aktualisieren',error)}}
    remember();
  }finally{syncing=false;queueDecorate()}
}

function legacyCandidates(){return localTasks().filter(({action})=>action?.id&&action.status!=='done'&&!cloudTasks.has(action.id))}

async function migrateLegacy(){
  const candidates=legacyCandidates();if(!candidates.length)return;
  if(!confirm(`${candidates.length} offene lokale Aufgabe${candidates.length===1?'':'n'} in die Cloud übernehmen?\n\nSie werden zunächst dir (${me()}) zugewiesen.`))return;
  let done=0;
  for(const item of candidates){try{await createCloud(item.plant,item.action,{uid:uid(),name:me()});done++}catch(error){cloudError=messageFor(error);console.error(error);break}}
  remember();queueDecorate();if(done)alert(`${done} Aufgabe${done===1?'':'n'} erfolgreich übernommen.`);
}

function options(selected){return users.map(user=>`<option value="${esc(user.uid)}" ${user.uid===selected?'selected':''}>${esc(userName(user))}</option>`).join('')}

function decorateForm(){
  const form=document.querySelector('#quickActionForm');if(!form||form.querySelector('[name="assignedToUserId"]'))return;
  const submit=form.querySelector('button[type="submit"]');if(!submit)return;
  const label=document.createElement('label');label.className='firebase-task-assignee-field';label.innerHTML='<span>Zuständig</span>';
  const select=document.createElement('select');select.name='assignedToUserId';select.innerHTML=options(uid());if(!manager())select.disabled=true;label.append(select);form.insertBefore(label,submit);
}

function decorateCards(){
  document.querySelectorAll('[data-action-id][data-plant-id]').forEach(card=>{
    const taskId=card.dataset.actionId;const cloud=cloudTasks.get(taskId);let host=card.querySelector('.firebase-task-assignee');
    if(!host){host=document.createElement('div');host.className='firebase-task-assignee';(card.querySelector('.task-content')||card).append(host)}
    if(!cloud){host.innerHTML='<span class="firebase-task-local-chip">Nur lokal</span>';return}
    if(manager()){
      host.innerHTML=`<label>Zuständig <select>${options(cloud.assignedToUserId||uid())}</select></label><span class="firebase-task-cloud-chip">Cloud</span>`;
      host.querySelector('select')?.addEventListener('change',async event=>{event.target.disabled=true;try{await reassign(taskId,event.target.value)}catch(error){cloudError=messageFor(error);console.error(error)}finally{event.target.disabled=false;queueDecorate()}});
    }else{
      host.innerHTML=`<span class="firebase-task-assignee-name">Zuständig: ${esc(cloud.assignedToName||me())}</span><span class="firebase-task-cloud-chip">Cloud</span>`;
      card.querySelectorAll('[data-delete-action]').forEach(button=>button.hidden=true);
    }
  });
}

function filterMode(){return manager()&&localStorage.getItem(FILTER_KEY)==='all'?'all':'mine'}
function applyFilter(){
  const list=document.querySelector('.global-task-list');if(!list)return;const mode=filterMode();
  list.querySelectorAll('[data-action-id]').forEach(card=>{const cloud=cloudTasks.get(card.dataset.actionId);card.hidden=mode==='mine'&&cloud?.assignedToUserId&&cloud.assignedToUserId!==uid()});
}

function decorateToolbar(){
  const list=document.querySelector('.global-task-list');if(!list)return;let bar=document.querySelector('#firebaseTaskCloudToolbar');
  if(!bar){bar=document.createElement('section');bar.id='firebaseTaskCloudToolbar';bar.className='firebase-task-toolbar';list.before(bar)}
  const count=legacyCandidates().length,mode=filterMode(),status=cloudReady?'Cloud synchronisiert':cloudError||'Cloud wird verbunden …';
  bar.innerHTML=`<div class="firebase-task-toolbar-status"><span class="firebase-task-dot ${cloudReady?'ok':cloudError?'error':'loading'}"></span><div><strong>${esc(status)}</strong><small>${esc(me())} · ${esc(role()||'Mitarbeiter')}</small></div></div><div class="firebase-task-toolbar-actions">${manager()?`<div class="firebase-task-filter"><button type="button" data-filter="mine" class="${mode==='mine'?'active':''}">Meine</button><button type="button" data-filter="all" class="${mode==='all'?'active':''}">Alle</button></div>`:''}${count?`<button type="button" class="button secondary compact" data-migrate-local>${count} lokale Aufgabe${count===1?'':'n'} übernehmen</button>`:''}</div>`;
  bar.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{localStorage.setItem(FILTER_KEY,button.dataset.filter);queueDecorate()});
  bar.querySelector('[data-migrate-local]')?.addEventListener('click',migrateLegacy);applyFilter();
}

function queueDecorate(){
  if(decorating)return;decorating=true;requestAnimationFrame(()=>{decorating=false;decorateForm();decorateCards();decorateToolbar()});
}

function bindHooks(){
  document.addEventListener('submit',event=>{if(event.target?.id==='quickActionForm')pendingAssignment={plantId:localStorage.getItem(ACTIVE_PLANT_KEY)||'',assignment:assignmentFrom(event.target)};setTimeout(syncLocal,60)},true);
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-toggle-action],[data-task-action],[data-delete-action],[data-followup-custom-submit]');if(!button)return;
    const deleteId=button.matches('[data-delete-action]')?button.dataset.deleteAction:'';const wasCloud=deleteId&&cloudTasks.has(deleteId);
    setTimeout(async()=>{await syncLocal();if(wasCloud&&manager()&&!findLocal(deleteId)){try{await deleteCloud(deleteId)}catch(error){cloudError=messageFor(error);console.error(error)}}},80);
  },true);
  const main=document.querySelector('#mainContent');if(main)new MutationObserver(queueDecorate).observe(main,{childList:true,subtree:true});
  window.addEventListener('vta:cloud-tasks-updated',queueDecorate);window.addEventListener('pageshow',()=>{queueDecorate();syncLocal()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueDecorate();syncLocal()}});
}

async function startSession(){
  if(!online()){unsubscribe?.();unsubscribe=null;cloudReady=false;queueDecorate();return}
  try{await ensureFirebase();await loadUsers();await subscribeTasks();queueDecorate()}
  catch(error){cloudReady=false;cloudError=messageFor(error);console.error('Cloud-Aufgaben Start',error);queueDecorate()}
}

function init(){if(started)return;started=true;seedLegacy();remember();bindHooks();startSession()}

window.VTACloudTasks={build:BUILD,get ready(){return cloudReady},get error(){return cloudError},get users(){return users.slice()},sync:syncLocal,migrateLocal:migrateLegacy};
window.addEventListener('vta:firebase-session',startSession);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
