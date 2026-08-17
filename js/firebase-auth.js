import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js';

const MODE_KEY='vta-workspace-mode-v01';
const SESSION_CACHE_KEY='vta-firebase-session-cache-v01';
const LAST_EMAIL_KEY='vta-firebase-last-email-v01';
const ALLOWED_ROLES=new Set(['admin','teamlead','employee']);
const ROLE_LABELS={admin:'Administrator',teamlead:'Teamleitung',employee:'Mitarbeiter'};

let authApi=null;
let firestoreApi=null;
let auth=null;
let db=null;
let currentUser=null;
let currentProfile=null;
let currentOffline=false;
let readyResolve;
const ready=new Promise(resolve=>{readyResolve=resolve});
let readySettled=false;

const refs={};
const $=selector=>document.querySelector(selector);
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';

function settleReady(){
  if(readySettled)return;
  readySettled=true;
  readyResolve?.({user:currentUser,profile:currentProfile,offline:currentOffline});
}

function readCache(){
  try{
    const value=JSON.parse(localStorage.getItem(SESSION_CACHE_KEY)||'null');
    return value&&value.uid&&value.profile?value:null;
  }catch{return null}
}

function writeCache(user,profile){
  try{
    localStorage.setItem(SESSION_CACHE_KEY,JSON.stringify({
      uid:user.uid,
      email:user.email||profile.email||'',
      profile,
      verifiedAt:new Date().toISOString()
    }));
  }catch{}
}

function clearCache(){
  try{localStorage.removeItem(SESSION_CACHE_KEY)}catch{}
}

function initials(profile,user){
  const first=String(profile?.firstName||'').trim();
  const last=String(profile?.lastName||'').trim();
  const email=String(profile?.email||user?.email||'').trim();
  return `${first[0]||''}${last[0]||''}`.toUpperCase()||email.slice(0,2).toUpperCase()||'VT';
}

function displayName(profile,user){
  const name=[profile?.firstName,profile?.lastName].filter(Boolean).join(' ').trim();
  return name||user?.email||'Angemeldeter Benutzer';
}

function normalizeProfile(data,user){
  const role=String(data?.role??data?.['role:']??'employee').trim().toLowerCase();
  return {
    uid:user.uid,
    email:String(data?.email||user.email||'').trim(),
    firstName:String(data?.firstName||'').trim(),
    lastName:String(data?.lastName||'').trim(),
    role:ALLOWED_ROLES.has(role)?role:'employee',
    active:data?.active!==false
  };
}

function lockApp(locked){
  const app=$('.app-layout');
  document.body.classList.toggle('firebase-auth-locked',locked);
  if(app){
    if(locked)app.setAttribute('inert','');
    else app.removeAttribute('inert');
  }
}

function setGate(mode,message=''){
  if(!refs.gate)return;
  refs.gate.hidden=false;
  lockApp(true);
  refs.loading.hidden=mode!=='loading';
  refs.form.hidden=mode!=='login';
  refs.issue.hidden=mode!=='issue';
  refs.issueMessage.textContent=message;
  refs.retry.hidden=!(mode==='issue'&&auth?.currentUser);
  refs.localFallback.hidden=mode!=='issue';
  refs.logoutIssue.hidden=!(mode==='issue'&&auth?.currentUser);
  if(mode==='login'){
    refs.email.value=localStorage.getItem(LAST_EMAIL_KEY)||refs.email.value||'';
    requestAnimationFrame(()=>{(refs.email.value?refs.password:refs.email).focus()});
  }
}

function hideGate(){
  if(!refs.gate)return;
  refs.gate.hidden=true;
  lockApp(false);
}

function dispatchSessionEvent(){
  window.dispatchEvent(new CustomEvent('vta:firebase-session',{detail:{
    user:currentUser,
    profile:currentProfile,
    role:currentProfile?.role||'',
    offline:currentOffline,
    authenticated:Boolean(currentUser&&currentProfile)
  }}));
}

function ensureAccountButton(){
  if(isDemo()||!currentProfile||!currentUser)return;
  const actions=$('.topbar-actions');
  const profileButton=$('#profileButton');
  if(!actions||!profileButton)return;
  let button=$('#firebaseSessionButton');
  if(!button){
    button=document.createElement('button');
    button.id='firebaseSessionButton';
    button.type='button';
    button.className='firebase-session-button';
    button.addEventListener('click',showAccountDialog);
    actions.insertBefore(button,profileButton);
  }
  button.innerHTML=`<span class="firebase-session-avatar">${initials(currentProfile,currentUser)}</span><span class="firebase-session-copy"><strong>${displayName(currentProfile,currentUser)}</strong><small>${ROLE_LABELS[currentProfile.role]||currentProfile.role}${currentOffline?' · Offline':''}</small></span>`;
  button.title=currentOffline?'Firebase-Sitzung · Offline-Modus':'Firebase-Sitzung';
}

function removeAccountButton(){
  $('#firebaseSessionButton')?.remove();
  $('#firebaseAccountDialog')?.remove();
}

function showAccountDialog(){
  if(!currentProfile||!currentUser)return;
  let dialog=$('#firebaseAccountDialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='firebaseAccountDialog';
    dialog.className='firebase-account-dialog';
    document.body.appendChild(dialog);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  }
  const verified=readCache()?.verifiedAt;
  dialog.innerHTML=`<div class="firebase-account-card">
    <div class="firebase-account-head"><div class="firebase-account-avatar">${initials(currentProfile,currentUser)}</div><div><p class="eyebrow">Firebase-Konto</p><h2>${escapeHtml(displayName(currentProfile,currentUser))}</h2><p>${escapeHtml(currentProfile.email||currentUser.email||'')}</p></div><button type="button" data-firebase-close aria-label="Schließen">×</button></div>
    <dl class="firebase-account-facts"><div><dt>Rolle</dt><dd>${escapeHtml(ROLE_LABELS[currentProfile.role]||currentProfile.role)}</dd></div><div><dt>Status</dt><dd>${currentOffline?'Offline · zuletzt verifiziert':'Online verifiziert'}</dd></div>${verified?`<div><dt>Letzte Prüfung</dt><dd>${escapeHtml(new Date(verified).toLocaleString('de-DE'))}</dd></div>`:''}</dl>
    <p class="firebase-account-note">Anlagen, Aufgaben, Besuche und Dokumente bleiben in dieser Ausbaustufe weiterhin lokal auf diesem Gerät.</p>
    <div class="firebase-account-actions"><button class="button secondary" type="button" data-firebase-close>Schließen</button><button class="button primary" type="button" data-firebase-logout>Abmelden</button></div>
  </div>`;
  dialog.querySelectorAll('[data-firebase-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.querySelector('[data-firebase-logout]')?.addEventListener('click',async()=>{dialog.close();await logout()});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function errorMessage(error){
  const code=String(error?.code||'');
  if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';
  if(code.includes('invalid-email'))return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  if(code.includes('too-many-requests'))return 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.';
  if(code.includes('network-request-failed')||code==='unavailable')return 'Firebase ist momentan nicht erreichbar. Prüfe die Internetverbindung.';
  if(code.includes('permission-denied'))return 'Das Benutzerprofil darf noch nicht aus Firestore gelesen werden. Bitte die Firestore-Regeln veröffentlichen.';
  return error?.message||'Firebase konnte nicht initialisiert werden.';
}

async function loadProfile(user){
  const ref=firestoreApi.doc(db,'users',user.uid);
  const snapshot=await firestoreApi.getDoc(ref);
  if(!snapshot.exists()){
    const error=new Error(`Für die UID ${user.uid} existiert kein users-Dokument.`);
    error.code='profile/not-found';
    throw error;
  }
  return normalizeProfile(snapshot.data(),user);
}

function unlockWithProfile(user,profile,{offline=false,cache=true}={}){
  currentUser=user;
  currentProfile=profile;
  currentOffline=offline;
  if(cache&&!offline)writeCache(user,profile);
  hideGate();
  ensureAccountButton();
  dispatchSessionEvent();
  settleReady();
}

async function verifyUser(user){
  setGate('loading');
  refs.loadingText.textContent='Benutzerprofil wird geprüft …';
  try{
    const profile=await loadProfile(user);
    if(!profile.active){
      const error=new Error('Dieses Benutzerkonto ist deaktiviert.');
      error.code='profile/inactive';
      throw error;
    }
    unlockWithProfile(user,profile);
  }catch(error){
    console.error('Firebase-Benutzerprofil konnte nicht geladen werden',error);
    const cached=readCache();
    const code=String(error?.code||'');
    if(cached?.uid===user.uid&&(code==='unavailable'||code.includes('network'))){
      unlockWithProfile(user,normalizeProfile(cached.profile,user),{offline:true,cache:false});
      return;
    }
    currentUser=user;
    currentProfile=null;
    currentOffline=false;
    removeAccountButton();
    setGate('issue',errorMessage(error));
    dispatchSessionEvent();
    settleReady();
  }
}

async function logout(){
  clearCache();
  currentProfile=null;
  currentOffline=false;
  removeAccountButton();
  if(authApi&&auth)await authApi.signOut(auth);
  else{
    currentUser=null;
    setGate('login');
    dispatchSessionEvent();
  }
}

async function signIn(email,password){
  if(!authApi||!auth)throw new Error('Firebase Authentication ist noch nicht bereit.');
  await authApi.setPersistence(auth,authApi.browserLocalPersistence);
  return authApi.signInWithEmailAndPassword(auth,email,password);
}

function useLocalFallback(){
  const cached=readCache();
  if(cached?.profile){
    const pseudoUser={uid:cached.uid,email:cached.email||cached.profile.email||''};
    unlockWithProfile(pseudoUser,normalizeProfile(cached.profile,pseudoUser),{offline:true,cache:false});
    return;
  }
  const fallbackUser=currentUser||auth?.currentUser||{uid:'local-transition',email:refs.email.value||''};
  currentUser=fallbackUser;
  currentProfile={uid:fallbackUser.uid,email:fallbackUser.email||refs.email.value||'',firstName:'',lastName:'',role:'employee',active:true};
  currentOffline=true;
  hideGate();
  ensureAccountButton();
  dispatchSessionEvent();
  settleReady();
}

function openDemo(){
  refs.demo.disabled=true;
  const profileButton=$('#profileButton');
  if(!profileButton){
    refs.demo.disabled=false;
    setGate('issue','Der Demo-Arbeitsbereich konnte nicht geöffnet werden.');
    return;
  }
  profileButton.click();
  setTimeout(()=>{
    const option=$('#workspaceSwitcher [data-workspace="demo"]');
    if(option)option.click();
    else{
      refs.demo.disabled=false;
      setGate('issue','Der Demo-Arbeitsbereich konnte nicht geöffnet werden.');
    }
  },0);
}

function bindUi(){
  refs.gate=$('#firebaseAuthGate');
  refs.loading=$('#firebaseAuthLoading');
  refs.loadingText=$('#firebaseAuthLoadingText');
  refs.form=$('#firebaseLoginForm');
  refs.email=$('#firebaseLoginEmail');
  refs.password=$('#firebaseLoginPassword');
  refs.submit=$('#firebaseLoginSubmit');
  refs.formError=$('#firebaseLoginError');
  refs.issue=$('#firebaseAuthIssue');
  refs.issueMessage=$('#firebaseAuthIssueMessage');
  refs.retry=$('#firebaseAuthRetry');
  refs.localFallback=$('#firebaseAuthLocalFallback');
  refs.logoutIssue=$('#firebaseAuthIssueLogout');
  refs.demo=$('#firebaseOpenDemo');

  refs.form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const email=refs.email.value.trim();
    const password=refs.password.value;
    refs.formError.textContent='';
    refs.submit.disabled=true;
    refs.submit.textContent='Anmeldung läuft …';
    try{
      localStorage.setItem(LAST_EMAIL_KEY,email);
      await signIn(email,password);
      refs.password.value='';
    }catch(error){
      refs.formError.textContent=errorMessage(error);
    }finally{
      refs.submit.disabled=false;
      refs.submit.textContent='Anmelden';
    }
  });
  refs.retry?.addEventListener('click',()=>{if(auth?.currentUser)verifyUser(auth.currentUser);else initializeFirebase()});
  refs.localFallback?.addEventListener('click',useLocalFallback);
  refs.logoutIssue?.addEventListener('click',logout);
  refs.demo?.addEventListener('click',openDemo);
}

async function loadFirebaseSdk(){
  const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  return {appModule,authModule,firestoreModule};
}

async function initializeFirebase(){
  if(isDemo()){
    hideGate();
    settleReady();
    return;
  }
  setGate('loading');
  refs.loadingText.textContent='Firebase-Anmeldung wird geprüft …';
  try{
    const {appModule,authModule,firestoreModule}=await loadFirebaseSdk();
    authApi=authModule;
    firestoreApi=firestoreModule;
    const firebaseApp=appModule.initializeApp(firebaseConfig);
    auth=authModule.getAuth(firebaseApp);
    db=firestoreModule.getFirestore(firebaseApp);
    await authModule.setPersistence(auth,authModule.browserLocalPersistence);
    authModule.onAuthStateChanged(auth,user=>{
      if(user)verifyUser(user);
      else{
        currentUser=null;
        currentProfile=null;
        currentOffline=false;
        removeAccountButton();
        setGate('login');
        dispatchSessionEvent();
        settleReady();
      }
    });
  }catch(error){
    console.error('Firebase SDK konnte nicht geladen werden',error);
    const cached=readCache();
    if(cached?.profile){
      const pseudoUser={uid:cached.uid,email:cached.email||cached.profile.email||''};
      unlockWithProfile(pseudoUser,normalizeProfile(cached.profile,pseudoUser),{offline:true,cache:false});
      return;
    }
    setGate('issue','Firebase konnte nicht geladen werden. Für die erste Anmeldung wird eine Internetverbindung benötigt.');
    settleReady();
  }
}

function initialize(){
  bindUi();
  if(!refs.gate)return;
  initializeFirebase();
}

window.VTAFirebaseSession={
  ready,
  get user(){return currentUser},
  get profile(){return currentProfile},
  get role(){return currentProfile?.role||''},
  get offline(){return currentOffline},
  get authenticated(){return Boolean(currentUser&&currentProfile)},
  signOut:logout,
  retry:()=>auth?.currentUser?verifyUser(auth.currentUser):initializeFirebase()
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
