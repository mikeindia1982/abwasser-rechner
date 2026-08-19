import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.61-native-auth3';
const MODE_KEY='vta-workspace-mode-v01';
const SESSION_CACHE_KEY='vta-firebase-session-cache-v01';
const LAST_EMAIL_KEY='vta-firebase-last-email-v01';
const SDK_TIMEOUT_MS=10000;
const LOGIN_TIMEOUT_MS=15000;
const PROFILE_TIMEOUT_MS=15000;

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
let authPanelOpen=false;
let firebaseInitPromise=null;

const diagnostics={
  build:BUILD,
  stage:'boot',
  authReady:false,
  authenticated:false,
  profileLoaded:false,
  role:'',
  offline:false,
  lastError:'',
  origin:location.origin,
  startupBlocking:false
};

const refs={};
const $=selector=>document.querySelector(selector);
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';

function settleReady(){
  if(readySettled)return;
  readySettled=true;
  readyResolve?.({user:currentUser,profile:currentProfile,offline:currentOffline});
}

function updateDiagnostics(patch={}){
  Object.assign(diagnostics,patch);
  queueMicrotask(updateCloudButton);
}

function readCache(){
  try{
    const value=JSON.parse(localStorage.getItem(SESSION_CACHE_KEY)||'null');
    return value?.uid&&value?.profile?value:null;
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

function normalizeProfile(data,user){
  const role=String(data?.role??data?.['role:']??'employee').trim().toLowerCase();
  return {
    uid:user.uid,
    email:String(data?.email||user.email||'').trim(),
    firstName:String(data?.firstName||'').trim(),
    lastName:String(data?.lastName||'').trim(),
    role:['admin','teamlead','employee'].includes(role)?role:'employee',
    active:data?.active!==false
  };
}

function displayName(profile,user){
  return [profile?.firstName,profile?.lastName].filter(Boolean).join(' ').trim()
    ||user?.email
    ||'Angemeldeter Benutzer';
}

function initials(profile,user){
  const name=displayName(profile,user).split(/\s+/).filter(Boolean);
  return ((name[0]?.[0]||'')+(name[1]?.[0]||'')).toUpperCase()
    ||String(user?.email||'VT').slice(0,2).toUpperCase();
}

function unlockApp(){
  const app=$('.app-layout');
  document.body.classList.remove('firebase-auth-locked');
  app?.removeAttribute('inert');
}

function ensureGateCloseButton(){
  const card=refs.gate?.querySelector('.firebase-auth-card');
  if(!card||card.querySelector('[data-native-auth-close]'))return;
  card.style.position='relative';
  const button=document.createElement('button');
  button.type='button';
  button.setAttribute('data-native-auth-close','');
  button.setAttribute('aria-label','Firebase-Anmeldung schließen');
  button.textContent='×';
  button.style.cssText='position:absolute;top:14px;right:14px;width:38px;height:38px;border:0;border-radius:12px;background:#eef4f4;color:#17353c;font-size:1.45rem;line-height:1;z-index:2;';
  button.addEventListener('click',hideGate);
  card.appendChild(button);
}

function setGate(mode,message=''){
  if(!refs.gate)return;
  authPanelOpen=true;
  refs.gate.hidden=false;
  unlockApp();
  ensureGateCloseButton();
  if(refs.loading)refs.loading.hidden=mode!=='loading';
  if(refs.form)refs.form.hidden=mode!=='login';
  if(refs.issue)refs.issue.hidden=mode!=='issue';
  if(refs.issueMessage)refs.issueMessage.textContent=message;
  if(refs.retry)refs.retry.hidden=mode!=='issue';
  if(refs.localFallback){
    refs.localFallback.hidden=mode!=='issue';
    refs.localFallback.textContent='Lokal weiterarbeiten';
  }
  if(refs.logoutIssue)refs.logoutIssue.hidden=!(mode==='issue'&&auth?.currentUser);
  if(mode==='login'){
    if(refs.formError)refs.formError.textContent='';
    if(refs.email)refs.email.value=localStorage.getItem(LAST_EMAIL_KEY)||refs.email.value||'';
    requestAnimationFrame(()=>{(refs.email?.value?refs.password:refs.email)?.focus()});
  }
}

function hideGate(){
  authPanelOpen=false;
  if(refs.gate)refs.gate.hidden=true;
  unlockApp();
}

function dispatchSessionEvent(){
  window.dispatchEvent(new CustomEvent('vta:firebase-session',{detail:{
    user:currentUser,
    profile:currentProfile,
    role:currentProfile?.role||'',
    offline:currentOffline,
    authenticated:Boolean(currentUser&&currentProfile),
    stage:diagnostics.stage,
    lastError:diagnostics.lastError
  }}));
}

function cloudButtonState(){
  if(currentUser&&currentProfile){
    return {
      avatar:initials(currentProfile,currentUser),
      title:displayName(currentProfile,currentUser),
      detail:currentOffline?'Cloud · Offline':'Cloud verbunden'
    };
  }
  if(diagnostics.stage==='sdk-loading'||diagnostics.stage==='auth-ready'||diagnostics.stage==='profile-loading'){
    return {avatar:'☁',title:'Cloud',detail:'Verbindung wird geprüft …'};
  }
  if(diagnostics.stage==='sdk-error'||diagnostics.stage==='profile-error'){
    return {avatar:'!',title:'Cloud',detail:'Lokal · Cloud prüfen'};
  }
  return {avatar:'☁',title:'Cloud',detail:'Nicht angemeldet'};
}

function ensureCloudButton(){
  if(isDemo()){
    $('#firebaseSessionButton')?.remove();
    return null;
  }
  const actions=$('.topbar-actions');
  const profileButton=$('#profileButton');
  if(!actions||!profileButton)return null;
  let button=$('#firebaseSessionButton');
  if(!button){
    button=document.createElement('button');
    button.id='firebaseSessionButton';
    button.type='button';
    button.className='firebase-session-button';
    button.addEventListener('click',()=>{
      if(currentUser&&currentProfile)showAccountDialog();
      else openAuthPanel();
    });
    actions.insertBefore(button,profileButton);
  }
  return button;
}

function updateCloudButton(){
  const button=ensureCloudButton();
  if(!button)return;
  const state=cloudButtonState();
  button.innerHTML=`<span class="firebase-session-avatar">${state.avatar}</span><span class="firebase-session-copy"><strong>${state.title}</strong><small>${state.detail}</small></span>`;
  button.title=`${state.title} · ${state.detail}`;
}

function removeAccountDialog(){
  $('#firebaseNativeAccountDialog')?.remove();
}

function showAccountDialog(){
  if(!currentUser||!currentProfile){
    openAuthPanel();
    return;
  }
  removeAccountDialog();
  const dialog=document.createElement('dialog');
  dialog.id='firebaseNativeAccountDialog';
  dialog.className='firebase-account-dialog';
  const verified=readCache()?.verifiedAt;
  dialog.innerHTML=`<div class="firebase-account-card">
    <div class="firebase-account-head">
      <div class="firebase-account-avatar">${initials(currentProfile,currentUser)}</div>
      <div><p class="eyebrow">Cloud-Konto</p><h2>${escapeHtml(displayName(currentProfile,currentUser))}</h2><p>${escapeHtml(currentProfile.email||currentUser.email||'')}</p></div>
      <button type="button" data-cloud-close aria-label="Schließen">×</button>
    </div>
    <dl class="firebase-account-facts">
      <div><dt>Status</dt><dd>${currentOffline?'Offline · lokaler Cache':'Firebase verbunden'}</dd></div>
      <div><dt>Rolle</dt><dd>${escapeHtml(currentProfile.role||'employee')}</dd></div>
      ${verified?`<div><dt>Letzte Prüfung</dt><dd>${escapeHtml(new Date(verified).toLocaleString('de-DE'))}</dd></div>`:''}
      <div><dt>Diagnose</dt><dd>${escapeHtml(`${diagnostics.stage} · ${diagnostics.build}`)}</dd></div>
    </dl>
    <p class="firebase-account-note">Die App bleibt auch bei Cloud-Störungen lokal nutzbar. Firebase synchronisiert nur Cloud-Funktionen, sobald eine Verbindung verfügbar ist.</p>
    <div class="firebase-account-actions"><button class="button secondary" type="button" data-cloud-close>Schließen</button><button class="button primary" type="button" data-cloud-logout>Abmelden</button></div>
  </div>`;
  document.body.appendChild(dialog);
  dialog.querySelectorAll('[data-cloud-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.querySelector('[data-cloud-logout]')?.addEventListener('click',async()=>{dialog.close();await logout()});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function errorMessage(error){
  const code=String(error?.code||'');
  if(code==='native/sdk-timeout')return 'Firebase konnte innerhalb von 10 Sekunden nicht geladen werden. Die App arbeitet lokal weiter. [native/sdk-timeout]';
  if(code==='native/auth-timeout')return 'Firebase Authentication antwortet in der iOS-App nicht. Die App arbeitet lokal weiter. [native/auth-timeout]';
  if(code==='native/profile-timeout')return 'Anmeldung war erfolgreich, aber das Firestore-Benutzerprofil antwortet nicht. Die App arbeitet lokal weiter. [native/profile-timeout]';
  if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';
  if(code.includes('api-key-not-valid')||code.includes('api-key')||code.includes('requests-from-referer'))return `Firebase lehnt den API-Schlüssel für die iOS-App ab. Die lokale App bleibt verfügbar. [${code}]`;
  if(code.includes('network-request-failed')||code==='unavailable')return 'Firebase ist aus der iOS-App momentan nicht erreichbar. Die App arbeitet lokal weiter.';
  if(code.includes('permission-denied'))return 'Anmeldung erfolgreich, aber Firestore blockiert das Benutzerprofil. Die lokale App bleibt verfügbar.';
  if(code==='profile/not-found')return 'Anmeldung erfolgreich, aber für dieses Konto fehlt das Firestore-Profil. Die lokale App bleibt verfügbar.';
  if(code==='profile/inactive')return 'Dieses Firebase-Benutzerkonto ist deaktiviert. Die lokale App bleibt verfügbar.';
  return `${error?.message||'Firebase konnte nicht initialisiert werden.'} Die App arbeitet lokal weiter.`;
}

function withTimeout(promise,ms,code){
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      const error=new Error(`Zeitüberschreitung nach ${Math.round(ms/1000)} Sekunden.`);
      error.code=code;
      reject(error);
    },ms);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

async function loadProfile(user){
  const ref=firestoreApi.doc(db,'users',user.uid);
  const snapshot=await withTimeout(firestoreApi.getDoc(ref),PROFILE_TIMEOUT_MS,'native/profile-timeout');
  if(!snapshot.exists()){
    const error=new Error('Benutzerprofil fehlt.');
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
  updateDiagnostics({
    stage:offline?'offline-ready':'ready',
    authReady:Boolean(authApi&&auth),
    authenticated:true,
    profileLoaded:true,
    role:profile.role||'',
    offline,
    lastError:''
  });
  hideGate();
  updateCloudButton();
  dispatchSessionEvent();
  settleReady();
}

async function verifyUser(user){
  const panelWasOpen=authPanelOpen;
  currentUser=user;
  currentProfile=null;
  currentOffline=false;
  updateDiagnostics({stage:'profile-loading',authenticated:true,profileLoaded:false,role:'',offline:false,lastError:''});
  if(panelWasOpen){
    if(refs.loadingText)refs.loadingText.textContent='Benutzerprofil wird geprüft …';
    setGate('loading');
  }else{
    hideGate();
  }
  try{
    const profile=await loadProfile(user);
    if(!profile.active){
      const error=new Error('Dieses Benutzerkonto ist deaktiviert.');
      error.code='profile/inactive';
      throw error;
    }
    unlockWithProfile(user,profile);
  }catch(error){
    console.error('[VTA native auth] Profilprüfung fehlgeschlagen',error);
    const cached=readCache();
    const code=String(error?.code||'profile-error');
    const recoverable=code==='unavailable'||code.includes('network')||code==='native/profile-timeout';
    if(cached?.uid===user.uid&&cached?.profile&&recoverable){
      unlockWithProfile(user,normalizeProfile(cached.profile,user),{offline:true,cache:false});
      return;
    }
    currentProfile=null;
    currentOffline=recoverable;
    updateDiagnostics({stage:'profile-error',authenticated:true,profileLoaded:false,role:'',offline:currentOffline,lastError:code});
    if(panelWasOpen)setGate('issue',errorMessage(error));
    else hideGate();
    updateCloudButton();
    dispatchSessionEvent();
    settleReady();
  }
}

async function signIn(email,password){
  if(!authApi||!auth){
    const error=new Error('Firebase Authentication ist noch nicht bereit.');
    error.code='native/auth-not-ready';
    throw error;
  }
  updateDiagnostics({stage:'signing-in',lastError:''});
  console.info('[VTA native auth] signInWithEmailAndPassword',{origin:location.origin,protocol:location.protocol,build:BUILD});
  await authApi.setPersistence(auth,authApi.browserLocalPersistence).catch(()=>{});
  return withTimeout(authApi.signInWithEmailAndPassword(auth,email,password),LOGIN_TIMEOUT_MS,'native/auth-timeout');
}

async function logout(){
  clearCache();
  currentUser=null;
  currentProfile=null;
  currentOffline=false;
  removeAccountDialog();
  try{if(authApi&&auth)await authApi.signOut(auth)}catch(error){console.warn('[VTA native auth] Abmeldung fehlgeschlagen',error)}
  updateDiagnostics({stage:authApi&&auth?'login-required':'local-only',authenticated:false,profileLoaded:false,role:'',offline:!authApi,lastError:''});
  hideGate();
  updateCloudButton();
  dispatchSessionEvent();
}

function useLocalFallback(){
  const cached=readCache();
  if(cached?.profile){
    const user={uid:cached.uid,email:cached.email||cached.profile.email||''};
    unlockWithProfile(user,normalizeProfile(cached.profile,user),{offline:true,cache:false});
    return;
  }
  currentUser=null;
  currentProfile=null;
  currentOffline=true;
  updateDiagnostics({stage:'local-only',authenticated:false,profileLoaded:false,role:'',offline:true,lastError:diagnostics.lastError});
  hideGate();
  updateCloudButton();
  dispatchSessionEvent();
  settleReady();
}

function openDemo(){
  hideGate();
  refs.demo.disabled=true;
  const profileButton=$('#profileButton');
  if(!profileButton){refs.demo.disabled=false;return}
  profileButton.click();
  setTimeout(()=>{
    const option=$('#workspaceSwitcher [data-workspace="demo"]');
    if(option)option.click();
    else refs.demo.disabled=false;
  },0);
}

function openAuthPanel(){
  if(currentUser&&currentProfile){
    showAccountDialog();
    return;
  }
  if(authApi&&auth){
    setGate('login');
    return;
  }
  const detail=diagnostics.lastError
    ? `Cloud-Verbindung ist derzeit nicht verfügbar. ${diagnostics.lastError}`
    : 'Firebase wird im Hintergrund verbunden. Du kannst währenddessen lokal weiterarbeiten.';
  setGate('issue',detail);
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

  ensureGateCloseButton();
  refs.form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const email=refs.email?.value.trim()||'';
    const password=refs.password?.value||'';
    if(refs.formError)refs.formError.textContent='';
    if(refs.submit){refs.submit.disabled=true;refs.submit.textContent='Anmeldung läuft …'}
    try{
      localStorage.setItem(LAST_EMAIL_KEY,email);
      await signIn(email,password);
      if(refs.password)refs.password.value='';
    }catch(error){
      console.error('[VTA native auth] Login fehlgeschlagen',error);
      const code=String(error?.code||'login-error');
      updateDiagnostics({stage:'login-error',authenticated:false,profileLoaded:false,lastError:code});
      if(refs.formError)refs.formError.textContent=errorMessage(error);
    }finally{
      if(refs.submit){refs.submit.disabled=false;refs.submit.textContent='Anmelden'}
    }
  });

  refs.retry?.addEventListener('click',async()=>{
    if(auth?.currentUser){
      await verifyUser(auth.currentUser);
      return;
    }
    hideGate();
    await initializeFirebase({openLoginWhenReady:true,force:true});
  });
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

async function initializeFirebase({openLoginWhenReady=false,force=false}={}){
  if(isDemo()){
    hideGate();
    updateDiagnostics({stage:'demo',authReady:false,authenticated:false,profileLoaded:false,role:'',offline:false,lastError:''});
    settleReady();
    return;
  }
  if(firebaseInitPromise&&!force)return firebaseInitPromise;

  hideGate();
  unlockApp();
  currentOffline=false;
  updateDiagnostics({stage:'sdk-loading',authReady:false,offline:false,lastError:''});
  updateCloudButton();

  const run=(async()=>{
    try{
      const {appModule,authModule,firestoreModule}=await withTimeout(loadFirebaseSdk(),SDK_TIMEOUT_MS,'native/sdk-timeout');
      authApi=authModule;
      firestoreApi=firestoreModule;
      const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(firebaseConfig);
      try{
        auth=authModule.initializeAuth(app,{persistence:[authModule.browserLocalPersistence,authModule.inMemoryPersistence]});
      }catch(error){
        if(String(error?.code||'').includes('already-initialized'))auth=authModule.getAuth(app);
        else throw error;
      }
      db=firestoreModule.getFirestore(app);
      updateDiagnostics({stage:'auth-ready',authReady:true,offline:false,lastError:''});
      console.info('[VTA native auth] Firebase läuft im Hintergrund',{build:BUILD,origin:location.origin,persistence:'browserLocalPersistence -> inMemory'});

      authModule.onAuthStateChanged(auth,user=>{
        if(user){
          verifyUser(user);
          return;
        }
        currentUser=null;
        currentProfile=null;
        currentOffline=false;
        updateDiagnostics({stage:'login-required',authReady:true,authenticated:false,profileLoaded:false,role:'',offline:false,lastError:''});
        hideGate();
        updateCloudButton();
        dispatchSessionEvent();
        settleReady();
        if(openLoginWhenReady)setGate('login');
      });
    }catch(error){
      console.error('[VTA native auth] Hintergrund-Initialisierung fehlgeschlagen',error);
      const code=String(error?.code||'sdk-error');
      const cached=readCache();
      if(cached?.profile){
        const pseudoUser={uid:cached.uid,email:cached.email||cached.profile.email||''};
        authApi=null;
        firestoreApi=null;
        auth=null;
        db=null;
        updateDiagnostics({stage:'sdk-error',authReady:false,lastError:code});
        unlockWithProfile(pseudoUser,normalizeProfile(cached.profile,pseudoUser),{offline:true,cache:false});
        return;
      }
      currentUser=null;
      currentProfile=null;
      currentOffline=true;
      authApi=null;
      firestoreApi=null;
      auth=null;
      db=null;
      updateDiagnostics({stage:'sdk-error',authReady:false,authenticated:false,profileLoaded:false,role:'',offline:true,lastError:code});
      hideGate();
      updateCloudButton();
      dispatchSessionEvent();
      settleReady();
      if(openLoginWhenReady)setGate('issue',errorMessage(error));
    }finally{
      firebaseInitPromise=null;
    }
  })();

  firebaseInitPromise=run;
  return run;
}

function initialize(){
  bindUi();
  unlockApp();
  hideGate();
  updateDiagnostics({stage:'local-ready',startupBlocking:false});
  updateCloudButton();
  dispatchSessionEvent();
  initializeFirebase();
}

window.VTAFirebaseDiagnostics=diagnostics;
window.VTAFirebaseSession={
  ready,
  get user(){return currentUser},
  get profile(){return currentProfile},
  get role(){return currentProfile?.role||''},
  get offline(){return currentOffline},
  get authenticated(){return Boolean(currentUser&&currentProfile)},
  get stage(){return diagnostics.stage},
  signOut:logout,
  showLogin:openAuthPanel,
  retry:()=>initializeFirebase({force:true})
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
