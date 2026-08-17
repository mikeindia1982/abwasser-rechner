import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.43';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const BACKUP_KEY='vta-plant-cloud-migration-backup-v01';
const STATE_KEY='vta-plant-cloud-migration-state-v01';
const DEMO_PLANT_ID='vta-demo-plant-001';
const COLLECTION='plants';
const MAX_BATCH=300;

let appApi=null;
let authApi=null;
let firestoreApi=null;
let auth=null;
let db=null;
let dialog=null;
let preview=null;
let loading=false;

const $=selector=>document.querySelector(selector);
const session=()=>window.VTAFirebaseSession||null;
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const isAdmin=()=>session()?.role==='admin'&&session()?.authenticated&&!session()?.offline;

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function normalizeText(value=''){
  return String(value||'')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function readLocalPlants(){
  try{
    const parsed=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');
    return Array.isArray(parsed)
      ? parsed.filter(plant=>plant&&plant.id&&plant.id!==DEMO_PLANT_ID)
      : [];
  }catch(error){
    console.error('Lokale Anlagen konnten nicht gelesen werden',error);
    return [];
  }
}

function readState(){
  try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}
  catch{return {}}
}

function writeState(value){
  try{localStorage.setItem(STATE_KEY,JSON.stringify(value))}catch(error){console.warn('Migrationsstatus konnte nicht lokal gespeichert werden',error)}
}

function ensureLocalBackup(){
  try{
    if(localStorage.getItem(BACKUP_KEY))return;
    const raw=localStorage.getItem(PLANTS_KEY);
    if(raw)localStorage.setItem(BACKUP_KEY,raw);
  }catch(error){console.warn('Lokale Migrationssicherung konnte nicht erstellt werden',error)}
}

function cloudCore(plant){
  const safe=JSON.parse(JSON.stringify(plant||{}));
  delete safe.visits;
  delete safe.actions;
  delete safe.communications;
  return safe;
}

function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fingerprint(value){
  const text=stableStringify(value);
  let hash=2166136261;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return `fnv1a-${(hash>>>0).toString(16).padStart(8,'0')}`;
}

function identity(plant){
  return {
    id:String(plant?.id||''),
    name:normalizeText(plant?.master?.name),
    internalNumber:normalizeText(plant?.master?.internalNumber),
    postalCode:normalizeText(plant?.address?.postalCode),
    city:normalizeText(plant?.address?.city),
    street:normalizeText(plant?.address?.street)
  };
}

function sameAddress(a,b){
  return Boolean(a.postalCode&&a.city&&b.postalCode&&b.city&&a.postalCode===b.postalCode&&a.city===b.city&&(!a.street||!b.street||a.street===b.street));
}

function classify(local,cloudPlants){
  const localCore=cloudCore(local);
  const localFingerprint=fingerprint(localCore);
  const localIdentity=identity(local);
  const sameId=cloudPlants.find(item=>item.id===local.id);
  if(sameId){
    const cloudFingerprint=String(sameId?.cloud?.sourceFingerprint||fingerprint(cloudCore(sameId)));
    return cloudFingerprint===localFingerprint
      ? {status:'existing',reason:'Bereits mit gleicher Anlagen-ID in der Cloud vorhanden',cloud:sameId,fingerprint:localFingerprint}
      : {status:'conflict',reason:'Gleiche Anlagen-ID, aber abweichender Datenstand',cloud:sameId,fingerprint:localFingerprint};
  }

  const sameInternal=localIdentity.internalNumber
    ? cloudPlants.find(item=>identity(item).internalNumber===localIdentity.internalNumber)
    : null;
  if(sameInternal)return {status:'conflict',reason:'Gleiche interne Anlagennummer gefunden',cloud:sameInternal,fingerprint:localFingerprint};

  const sameNameAddress=cloudPlants.find(item=>{
    const candidate=identity(item);
    return localIdentity.name&&candidate.name===localIdentity.name&&sameAddress(localIdentity,candidate);
  });
  if(sameNameAddress)return {status:'conflict',reason:'Name und Standort ähneln einer bestehenden Cloud-Anlage',cloud:sameNameAddress,fingerprint:localFingerprint};

  const sameName=cloudPlants.find(item=>localIdentity.name&&identity(item).name===localIdentity.name);
  if(sameName)return {status:'conflict',reason:'Gleicher Anlagenname bereits in der Cloud',cloud:sameName,fingerprint:localFingerprint};

  return {status:'new',reason:'Kann sicher neu übernommen werden',cloud:null,fingerprint:localFingerprint};
}

function buildCloudDocument(plant,user,sourceFingerprint){
  const core=cloudCore(plant);
  const now=new Date().toISOString();
  return {
    ...core,
    id:String(plant.id),
    cloud:{
      version:1,
      source:'local-migration',
      migratedAt:now,
      migratedBy:user.uid,
      migratedByEmail:user.email||'',
      sourceFingerprint,
      sourceLocalUpdatedAt:plant.updatedAt||'',
      deferredWorkflow:{
        visits:Array.isArray(plant.visits)?plant.visits.length:0,
        tasks:Array.isArray(plant.actions)?plant.actions.length:0,
        communications:Array.isArray(plant.communications)?plant.communications.length:0
      }
    }
  };
}

async function ensureFirebase(){
  if(db&&auth?.currentUser)return {db,user:auth.currentUser};
  const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  appApi=appModule;
  authApi=authModule;
  firestoreApi=firestoreModule;
  const firebaseApp=appModule.getApps().length?appModule.getApp():appModule.initializeApp(firebaseConfig);
  auth=authModule.getAuth(firebaseApp);
  db=firestoreModule.getFirestore(firebaseApp);
  if(!auth.currentUser)throw new Error('Für die Cloud-Migration ist eine aktive Firebase-Anmeldung erforderlich.');
  return {db,user:auth.currentUser};
}

async function loadCloudPlants(){
  await ensureFirebase();
  const snapshot=await firestoreApi.getDocs(firestoreApi.collection(db,COLLECTION));
  return snapshot.docs.map(item=>({id:item.id,...item.data()}));
}

function createDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='firebasePlantMigrationDialog';
  dialog.className='firebase-plant-migration-dialog';
  dialog.innerHTML=`<div class="firebase-plant-migration-card">
    <header class="firebase-plant-migration-head">
      <div><p class="eyebrow">Firebase · Phase 2</p><h2>Lokale Anlagen in die Cloud übernehmen</h2></div>
      <button type="button" class="firebase-plant-migration-close" aria-label="Schließen">×</button>
    </header>
    <p class="firebase-plant-migration-intro">Die lokalen Anlagen werden zuerst nur geprüft. Es wird nichts automatisch hochgeladen oder lokal gelöscht.</p>
    <div id="firebasePlantMigrationContent" class="firebase-plant-migration-content"></div>
    <footer class="firebase-plant-migration-actions">
      <button type="button" class="button secondary" data-migration-close>Schließen</button>
      <button type="button" class="button secondary" id="firebasePlantMigrationRefresh">Neu prüfen</button>
      <button type="button" class="button primary" id="firebasePlantMigrationStart" disabled>Neue Anlagen übernehmen</button>
    </footer>
  </div>`;
  document.body.appendChild(dialog);
  dialog.querySelectorAll('[data-migration-close],.firebase-plant-migration-close').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  $('#firebasePlantMigrationRefresh')?.addEventListener('click',refreshPreview);
  $('#firebasePlantMigrationStart')?.addEventListener('click',migrateNewPlants);
  return dialog;
}

function plantLabel(plant){
  return String(plant?.master?.name||'Unbenannte Anlage').trim()||'Unbenannte Anlage';
}

function plantMeta(plant){
  return [plant?.address?.postalCode,plant?.address?.city,plant?.master?.internalNumber?`Nr. ${plant.master.internalNumber}`:''].filter(Boolean).join(' · ');
}

function renderPreview(){
  const host=$('#firebasePlantMigrationContent');
  const start=$('#firebasePlantMigrationStart');
  if(!host||!start)return;
  if(!preview){
    host.innerHTML='<div class="firebase-plant-migration-loading">Prüfung wird vorbereitet …</div>';
    start.disabled=true;
    return;
  }
  if(preview.error){
    host.innerHTML=`<div class="firebase-plant-migration-error"><strong>Cloud-Prüfung nicht möglich</strong><p>${escapeHtml(preview.error)}</p></div>`;
    start.disabled=true;
    return;
  }

  const groups={new:[],existing:[],conflict:[]};
  preview.items.forEach(item=>groups[item.status].push(item));
  const summary=`<div class="firebase-plant-migration-summary">
    <article><strong>${preview.localCount}</strong><span>lokal gefunden</span></article>
    <article class="ok"><strong>${groups.new.length}</strong><span>neu</span></article>
    <article><strong>${groups.existing.length}</strong><span>bereits Cloud</span></article>
    <article class="warn"><strong>${groups.conflict.length}</strong><span>prüfen</span></article>
  </div>`;

  const list=preview.items.length
    ? `<div class="firebase-plant-migration-list">${preview.items.map(item=>`<article class="firebase-plant-migration-row ${item.status}">
        <span class="firebase-plant-migration-status">${item.status==='new'?'Neu':item.status==='existing'?'Cloud':'Prüfen'}</span>
        <div><strong>${escapeHtml(plantLabel(item.local))}</strong><small>${escapeHtml(plantMeta(item.local)||'Keine Standortangabe')}</small><p>${escapeHtml(item.reason)}</p></div>
      </article>`).join('')}</div>`
    : '<div class="firebase-plant-migration-empty">Auf diesem Gerät wurden keine produktiven lokalen Anlagen gefunden.</div>';

  host.innerHTML=`${summary}
    <div class="firebase-plant-migration-note"><strong>Diese Phase übernimmt:</strong> Stammdaten, Betreiber, Kontakte, Technik, Parameter und Fließschema. <strong>Aufgaben, Termine/Besuche und Kommunikation bleiben vorerst lokal</strong> und werden in den nächsten Synchronisationsphasen separat migriert.</div>
    ${list}
    <p class="firebase-plant-migration-footnote">Konflikte werden niemals automatisch überschrieben. Die lokale Datenbasis bleibt unverändert; vor der ersten Übernahme wird zusätzlich eine lokale Sicherung angelegt.</p>`;
  start.disabled=!groups.new.length||loading;
  start.textContent=groups.new.length?`${groups.new.length} neue Anlage${groups.new.length===1?'':'n'} übernehmen`:'Keine neuen Anlagen';
}

function readableError(error){
  const code=String(error?.code||'');
  if(code.includes('permission-denied'))return 'Firestore blockiert den Zugriff. Bitte zuerst die neuen Firestore-Regeln für die Anlagenmigration veröffentlichen.';
  if(code.includes('network')||code==='unavailable')return 'Firebase ist momentan nicht erreichbar. Prüfe die Internetverbindung.';
  return error?.message||'Die Cloud-Anlagen konnten nicht geprüft werden.';
}

async function refreshPreview(){
  if(loading)return;
  loading=true;
  preview=null;
  renderPreview();
  const refresh=$('#firebasePlantMigrationRefresh');
  if(refresh)refresh.disabled=true;
  try{
    if(!isAdmin())throw new Error('Die Anlagenmigration ist aktuell nur für online angemeldete Administratoren freigeschaltet.');
    const localPlants=readLocalPlants();
    const cloudPlants=await loadCloudPlants();
    const state=readState();
    const items=localPlants.map(local=>({local,...classify(local,cloudPlants),localState:state[local.id]||null}));
    preview={localCount:localPlants.length,cloudCount:cloudPlants.length,items};
  }catch(error){
    console.error('Cloud-Migrationsprüfung fehlgeschlagen',error);
    preview={error:readableError(error),items:[],localCount:readLocalPlants().length,cloudCount:0};
  }finally{
    loading=false;
    if(refresh)refresh.disabled=false;
    renderPreview();
  }
}

async function migrateNewPlants(){
  if(loading||!preview||preview.error)return;
  const candidates=preview.items.filter(item=>item.status==='new');
  if(!candidates.length)return;
  const start=$('#firebasePlantMigrationStart');
  loading=true;
  if(start){start.disabled=true;start.textContent='Übernahme läuft …'}
  try{
    const {user}=await ensureFirebase();
    if(!isAdmin())throw new Error('Die Anlagenmigration ist nur für Administratoren freigeschaltet.');
    ensureLocalBackup();
    const state=readState();
    for(let offset=0;offset<candidates.length;offset+=MAX_BATCH){
      const chunk=candidates.slice(offset,offset+MAX_BATCH);
      const batch=firestoreApi.writeBatch(db);
      for(const item of chunk){
        const ref=firestoreApi.doc(db,COLLECTION,String(item.local.id));
        batch.set(ref,buildCloudDocument(item.local,user,item.fingerprint));
      }
      await batch.commit();
      const migratedAt=new Date().toISOString();
      chunk.forEach(item=>{state[item.local.id]={cloudId:String(item.local.id),migratedAt,migratedBy:user.uid,fingerprint:item.fingerprint}});
      writeState(state);
    }
    window.dispatchEvent(new CustomEvent('vta:plant-cloud-migration',{detail:{count:candidates.length,build:BUILD}}));
    await refreshPreview();
  }catch(error){
    console.error('Anlagenmigration fehlgeschlagen',error);
    preview={...(preview||{}),error:readableError(error)};
    renderPreview();
  }finally{
    loading=false;
    renderPreview();
  }
}

async function openMigration(){
  createDialog();
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  await refreshPreview();
}

function updateLauncher(){
  const details=$('.sidebar-more');
  if(!details)return;
  let button=$('#firebasePlantMigrationButton');
  if(!isAdmin()||isDemo()){
    button?.remove();
    return;
  }
  if(!button){
    button=document.createElement('button');
    button.id='firebasePlantMigrationButton';
    button.className='side-action firebase-plant-migration-launcher';
    button.type='button';
    button.innerHTML='☁ Anlagen-Cloudmigration';
    button.addEventListener('click',openMigration);
    const settings=details.querySelector('[data-global-view="settings"]');
    details.insertBefore(button,settings||null);
  }
  const count=readLocalPlants().length;
  button.title=count?`${count} lokale Anlage${count===1?'':'n'} prüfen`:'Keine lokalen Anlagen gefunden';
}

window.VTAPlantCloudMigration={
  build:BUILD,
  get localCount(){return readLocalPlants().length},
  open:openMigration,
  refresh:refreshPreview
};

window.addEventListener('vta:firebase-session',updateLauncher);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateLauncher,{once:true});
else updateLauncher();
