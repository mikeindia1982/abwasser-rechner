import {FIREBASE_SDK_VERSION,firebaseConfig} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.57-native-auth2';
const MODE_KEY='vta-workspace-mode-v01';
const SESSION_CACHE_KEY='vta-firebase-session-cache-v01';
const LAST_EMAIL_KEY='vta-firebase-last-email-v01';
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

const diagnostics={build:BUILD,stage:'boot',authReady:false,authenticated:false,profileLoaded:false,role:'',offline:false,lastError:'',origin:location.origin};
const refs={};
const $=selector=>document.querySelector(selector);
const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';

function settleReady(){if(readySettled)return;readySettled=true;readyResolve?.({user:currentUser,profile:currentProfile,offline:currentOffline})}
function updateDiagnostics(patch={}){Object.assign(diagnostics,patch)}
function readCache(){try{const value=JSON.parse(localStorage.getItem(SESSION_CACHE_KEY)||'null');return value?.uid&&value?.profile?value:null}catch{return null}}
function writeCache(user,profile){try{localStorage.setItem(SESSION_CACHE_KEY,JSON.stringify({uid:user.uid,email:user.email||profile.email||'',profile,verifiedAt:new Date().toISOString()}))}catch{}}
function clearCache(){try{localStorage.removeItem(SESSION_CACHE_KEY)}catch{}}
function normalizeProfile(data,user){const role=String(data?.role??data?.['role:']??'employee').trim().toLowerCase();return{uid:user.uid,email:String(data?.email||user.email||'').trim(),firstName:String(data?.firstName||'').trim(),lastName:String(data?.lastName||'').trim(),role:['admin','teamlead','employee'].includes(role)?role:'employee',active:data?.active!==false}}
function displayName(profile,user){return [profile?.firstName,profile?.lastName].filter(Boolean).join(' ').trim()||user?.email||'Angemeldeter Benutzer'}
function initials(profile,user){const n=displayName(profile,user).split(/\s+/).filter(Boolean);return ((n[0]?.[0]||'')+(n[1]?.[0]||'')).toUpperCase()||String(user?.email||'VT').slice(0,2).toUpperCase()}

function lockApp(locked){const app=$('.app-layout');document.body.classList.toggle('firebase-auth-locked',locked);if(app){if(locked)app.setAttribute('inert','');else app.removeAttribute('inert')}}
function setGate(mode,message=''){if(!refs.gate)return;refs.gate.hidden=false;lockApp(true);refs.loading.hidden=mode!=='loading';refs.form.hidden=mode!=='login';refs.issue.hidden=mode!=='issue';if(refs.issueMessage)refs.issueMessage.textContent=message;if(refs.retry)refs.retry.hidden=!(mode==='issue'&&auth?.currentUser);if(refs.localFallback)refs.localFallback.hidden=mode!=='issue';if(refs.logoutIssue)refs.logoutIssue.hidden=!(mode==='issue'&&auth?.currentUser);if(mode==='login'){refs.email.value=localStorage.getItem(LAST_EMAIL_KEY)||refs.email.value||'';requestAnimationFrame(()=>{(refs.email.value?refs.password:refs.email)?.focus()})}}
function hideGate(){if(refs.gate)refs.gate.hidden=true;lockApp(false)}
function dispatchSessionEvent(){window.dispatchEvent(new CustomEvent('vta:firebase-session',{detail:{user:currentUser,profile:currentProfile,role:currentProfile?.role||'',offline:currentOffline,authenticated:Boolean(currentUser&&currentProfile)}}))}

function ensureAccountButton(){if(isDemo()||!currentProfile||!currentUser)return;const actions=$('.topbar-actions');const profileButton=$('#profileButton');if(!actions||!profileButton)return;let button=$('#firebaseSessionButton');if(!button){button=document.createElement('button');button.id='firebaseSessionButton';button.type='button';button.className='firebase-session-button';actions.insertBefore(button,profileButton)}button.innerHTML=`<span class="firebase-session-avatar">${initials(currentProfile,currentUser)}</span><span class="firebase-session-copy"><strong>${displayName(currentProfile,currentUser)}</strong><small>${currentOffline?'Offline':'Firebase · iOS'}</small></span>`}
function removeAccountButton(){$('#firebaseSessionButton')?.remove()}

function errorMessage(error){const code=String(error?.code||'');if(code==='native/auth-timeout')return 'Firebase Authentication antwortet in der iOS-App nicht. [native/auth-timeout]';if(code==='native/profile-timeout')return 'Anmeldung war erfolgreich, aber das Firestore-Benutzerprofil antwortet nicht. [native/profile-timeout]';if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';if(code.includes('api-key-not-valid')||code.includes('api-key')||code.includes('requests-from-referer'))return `Firebase lehnt den API-Schlüssel für die iOS-App ab. [${code}]`;if(code.includes('network-request-failed')||code==='unavailable')return 'Firebase ist aus der iOS-App momentan nicht erreichbar.';if(code.includes('permission-denied'))return 'Anmeldung erfolgreich, aber Firestore blockiert das Benutzerprofil.';if(code==='profile/not-found')return 'Anmeldung erfolgreich, aber für dieses Konto fehlt das Firestore-Profil.';return error?.message||'Firebase konnte nicht initialisiert werden.'}

function withTimeout(promise,ms,code){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>{const error=new Error(`Zeitüberschreitung nach ${Math.round(ms/1000)} Sekunden.`);error.code=code;reject(error)},ms))])}

async function loadProfile(user){const ref=firestoreApi.doc(db,'users',user.uid);const snapshot=await withTimeout(firestoreApi.getDoc(ref),PROFILE_TIMEOUT_MS,'native/profile-timeout');if(!snapshot.exists()){const error=new Error('Benutzerprofil fehlt.');error.code='profile/not-found';throw error}return normalizeProfile(snapshot.data(),user)}
function unlockWithProfile(user,profile,{offline=false,cache=true}={}){currentUser=user;currentProfile=profile;currentOffline=offline;if(cache&&!offline)writeCache(user,profile);updateDiagnostics({stage:offline?'offline-ready':'ready',authReady:true,authenticated:true,profileLoaded:true,role:profile.role||'',offline,lastError:''});hideGate();ensureAccountButton();dispatchSessionEvent();settleReady()}

async function verifyUser(user){updateDiagnostics({stage:'profile-loading',authenticated:true,profileLoaded:false,lastError:''});setGate('loading');refs.loadingText.textContent='Benutzerprofil wird geprüft …';try{const profile=await loadProfile(user);if(!profile.active){const e=new Error('Dieses Benutzerkonto ist deaktiviert.');e.code='profile/inactive';throw e}unlockWithProfile(user,profile)}catch(error){console.error('[VTA native auth] Profilprüfung fehlgeschlagen',error);currentUser=user;currentProfile=null;currentOffline=false;updateDiagnostics({stage:'profile-error',authenticated:true,profileLoaded:false,lastError:String(error?.code||'profile-error')});setGate('issue',errorMessage(error));dispatchSessionEvent();settleReady()}}

async function signIn(email,password){if(!authApi||!auth){const e=new Error('Firebase Authentication ist noch nicht bereit.');e.code='native/auth-not-ready';throw e}updateDiagnostics({stage:'signing-in',lastError:''});console.info('[VTA native auth] signInWithEmailAndPassword',{origin:location.origin,protocol:location.protocol,build:BUILD});return withTimeout(authApi.signInWithEmailAndPassword(auth,email,password),LOGIN_TIMEOUT_MS,'native/auth-timeout')}
async function logout(){clearCache();currentUser=null;currentProfile=null;currentOffline=false;removeAccountButton();if(authApi&&auth)await authApi.signOut(auth);setGate('login');dispatchSessionEvent()}
function useLocalFallback(){const cached=readCache();if(cached?.profile){const user={uid:cached.uid,email:cached.email||cached.profile.email||''};unlockWithProfile(user,normalizeProfile(cached.profile,user),{offline:true,cache:false});return}setGate('issue','Für den Offline-Modus liegt auf diesem Gerät noch keine verifizierte Sitzung vor.')}
function openDemo(){refs.demo.disabled=true;const profileButton=$('#profileButton');if(!profileButton){refs.demo.disabled=false;return}profileButton.click();setTimeout(()=>{const option=$('#workspaceSwitcher [data-workspace="demo"]');if(option)option.click();else refs.demo.disabled=false},0)}

function bindUi(){refs.gate=$('#firebaseAuthGate');refs.loading=$('#firebaseAuthLoading');refs.loadingText=$('#firebaseAuthLoadingText');refs.form=$('#firebaseLoginForm');refs.email=$('#firebaseLoginEmail');refs.password=$('#firebaseLoginPassword');refs.submit=$('#firebaseLoginSubmit');refs.formError=$('#firebaseLoginError');refs.issue=$('#firebaseAuthIssue');refs.issueMessage=$('#firebaseAuthIssueMessage');refs.retry=$('#firebaseAuthRetry');refs.localFallback=$('#firebaseAuthLocalFallback');refs.logoutIssue=$('#firebaseAuthIssueLogout');refs.demo=$('#firebaseOpenDemo');refs.form?.addEventListener('submit',async event=>{event.preventDefault();const email=refs.email.value.trim();const password=refs.password.value;refs.formError.textContent='';refs.submit.disabled=true;refs.submit.textContent='Anmeldung läuft …';try{localStorage.setItem(LAST_EMAIL_KEY,email);await signIn(email,password);refs.password.value=''}catch(error){console.error('[VTA native auth] Login fehlgeschlagen',error);updateDiagnostics({stage:'login-error',authenticated:false,profileLoaded:false,lastError:String(error?.code||'login-error')});refs.formError.textContent=errorMessage(error)}finally{refs.submit.disabled=false;refs.submit.textContent='Anmelden'}});refs.retry?.addEventListener('click',()=>auth?.currentUser?verifyUser(auth.currentUser):initializeFirebase());refs.localFallback?.addEventListener('click',useLocalFallback);refs.logoutIssue?.addEventListener('click',logout);refs.demo?.addEventListener('click',openDemo)}

async function loadFirebaseSdk(){const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;const [appModule,authModule,firestoreModule]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)]);return{appModule,authModule,firestoreModule}}

async function initializeFirebase(){if(isDemo()){hideGate();settleReady();return}setGate('loading');refs.loadingText.textContent='Firebase-Anmeldung wird geprüft …';updateDiagnostics({stage:'sdk-loading'});try{const{appModule,authModule,firestoreModule}=await loadFirebaseSdk();authApi=authModule;firestoreApi=firestoreModule;const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(firebaseConfig);try{auth=authModule.initializeAuth(app,{persistence:[authModule.browserLocalPersistence,authModule.inMemoryPersistence]})}catch(error){if(String(error?.code||'').includes('already-initialized'))auth=authModule.getAuth(app);else throw error}db=firestoreModule.getFirestore(app);updateDiagnostics({stage:'auth-ready',authReady:true,lastError:''});console.info('[VTA native auth] initializeAuth aktiv',{build:BUILD,origin:location.origin,persistence:'browserLocalPersistence -> inMemory'});authModule.onAuthStateChanged(auth,user=>{if(user)verifyUser(user);else{currentUser=null;currentProfile=null;currentOffline=false;removeAccountButton();updateDiagnostics({stage:'login-required',authenticated:false,profileLoaded:false,lastError:''});setGate('login');dispatchSessionEvent();settleReady()}})}catch(error){console.error('[VTA native auth] Initialisierung fehlgeschlagen',error);updateDiagnostics({stage:'sdk-error',lastError:String(error?.code||'sdk-error')});setGate('issue',errorMessage(error));settleReady()}}

function initialize(){bindUi();if(!refs.gate)return;initializeFirebase()}
window.VTAFirebaseDiagnostics=diagnostics;
window.VTAFirebaseSession={ready,get user(){return currentUser},get profile(){return currentProfile},get role(){return currentProfile?.role||''},get offline(){return currentOffline},get authenticated(){return Boolean(currentUser&&currentProfile)},signOut:logout,retry:()=>auth?.currentUser?verifyUser(auth.currentUser):initializeFirebase()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
