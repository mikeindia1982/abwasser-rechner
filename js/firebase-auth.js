import {FIREBASE_ENABLED,FIREBASE_SDK_VERSION} from './firebase-config.js?v=0.11.0-alpha.42';

const AUTH_BUILD='0.11.0-alpha.80-firebase-test-access1';
const TEST_USER=Object.freeze({uid:'local-test',email:'tester@local.invalid'});
const TEST_PROFILE=Object.freeze({
  uid:TEST_USER.uid,
  email:TEST_USER.email,
  firstName:'Test',
  lastName:'Zugang',
  role:'admin',
  active:true
});

function unlockApp(){
  const gate=document.querySelector('#firebaseAuthGate');
  const app=document.querySelector('.app-layout');
  if(gate)gate.hidden=true;
  document.body.classList.remove('firebase-auth-locked');
  document.body.classList.add('firebase-test-mode');
  app?.removeAttribute('inert');
}

function activateLocalTestMode(reason='firebase-disabled'){
  const readyResult={user:TEST_USER,profile:TEST_PROFILE,offline:true,testMode:true};
  const diagnostics={
    build:AUTH_BUILD,
    configRevision:AUTH_BUILD,
    sdkVersion:FIREBASE_SDK_VERSION,
    firebaseEnabled:false,
    stage:'local-test-ready',
    authReady:false,
    authenticated:true,
    profileLoaded:true,
    role:TEST_PROFILE.role,
    offline:true,
    testMode:true,
    reason,
    lastError:''
  };

  window.VTAFirebaseDiagnostics=diagnostics;
  window.VTAFirebaseSession={
    ready:Promise.resolve(readyResult),
    get user(){return TEST_USER},
    get profile(){return TEST_PROFILE},
    get role(){return TEST_PROFILE.role},
    get offline(){return true},
    get authenticated(){return true},
    get testMode(){return true},
    signOut:async()=>readyResult,
    retry:async()=>readyResult
  };

  unlockApp();
  window.dispatchEvent(new CustomEvent('vta:firebase-session',{detail:{
    user:TEST_USER,
    profile:TEST_PROFILE,
    role:TEST_PROFILE.role,
    offline:true,
    authenticated:true,
    testMode:true,
    firebaseEnabled:false
  }}));
  console.info('VTA Copilot: Firebase ist für den Testbetrieb deaktiviert; lokaler Testzugang aktiv.');
}

if(FIREBASE_ENABLED){
  import('./firebase-auth-live.js?v=0.11.0-alpha.80-firebase-test-access1')
    .catch(error=>{
      console.error('Reguläre Firebase-Anmeldung konnte nicht geladen werden; lokaler Testzugang wird verwendet.',error);
      activateLocalTestMode('live-auth-load-error');
    });
}else{
  activateLocalTestMode();
}
