import {FIREBASE_SDK_VERSION} from './firebase-config.js?v=0.11.0-alpha.42';

const BUILD='0.11.0-alpha.57-native-auth1';
const LOGIN_TIMEOUT_MS=15000;
const PROFILE_TIMEOUT_MS=15000;
const isNative=Boolean(globalThis.VTANativeRuntime?.enabled||location.protocol==='capacitor:'||location.protocol==='ionic:');

if(isNative){
  const state={build:BUILD,stage:'boot',lastError:'',lastDurationMs:0};
  globalThis.VTANativeFirebaseAuthDiagnostics=state;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const timeout=(promise,ms,code)=>Promise.race([
    promise,
    sleep(ms).then(()=>{const error=new Error(`Firebase-Anmeldung hat nach ${Math.round(ms/1000)} Sekunden nicht geantwortet.`);error.code=code;throw error;})
  ]);

  const messageFor=error=>{
    const code=String(error?.code||'');
    if(code==='native/auth-timeout')return 'Firebase antwortet beim Anmelden nicht. Bitte Internet/API-Konfiguration prüfen. [native/auth-timeout]';
    if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';
    if(code.includes('api-key-not-valid')||code.includes('requests-from-referer'))return `Firebase lehnt die native App-Konfiguration ab. [${code}]`;
    if(code.includes('network-request-failed'))return 'Firebase ist aus der nativen App momentan nicht erreichbar. [auth/network-request-failed]';
    return `${error?.message||'Firebase-Anmeldung fehlgeschlagen.'}${code?` [${code}]`:''}`;
  };

  async function getNativeAuth(){
    const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [appModule,authModule]=await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`)
    ]);
    const app=appModule.getApps()[0];
    if(!app){
      const error=new Error('Firebase-App ist noch nicht initialisiert.');
      error.code='native/auth-not-ready';
      throw error;
    }
    return {authModule,auth:authModule.getAuth(app)};
  }

  async function nativeSubmit(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='firebaseLoginForm')return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const email=document.querySelector('#firebaseLoginEmail')?.value?.trim()||'';
    const password=document.querySelector('#firebaseLoginPassword')?.value||'';
    const submit=document.querySelector('#firebaseLoginSubmit');
    const errorBox=document.querySelector('#firebaseLoginError');
    if(errorBox)errorBox.textContent='';
    if(submit){submit.disabled=true;submit.textContent='Anmeldung läuft …';}

    const started=performance.now();
    state.stage='signing-in';
    state.lastError='';
    console.info('[VTA native auth] Login gestartet',{origin:location.origin,protocol:location.protocol});

    try{
      localStorage.setItem('vta-firebase-last-email-v01',email);
      const {authModule,auth}=await getNativeAuth();
      // Die Web-Authentifizierung hat ihre Persistenz bereits beim Firebase-Boot gesetzt.
      // Im nativen WKWebView wird sie hier bewusst nicht erneut umgeschaltet.
      await timeout(authModule.signInWithEmailAndPassword(auth,email,password),LOGIN_TIMEOUT_MS,'native/auth-timeout');
      state.stage='signed-in';
      state.lastDurationMs=Math.round(performance.now()-started);
      const passwordInput=document.querySelector('#firebaseLoginPassword');
      if(passwordInput)passwordInput.value='';
      console.info('[VTA native auth] Firebase Auth erfolgreich',{durationMs:state.lastDurationMs});

      // Der bestehende firebase-auth.js Listener lädt jetzt das Firestore-Profil.
      setTimeout(()=>{
        const diag=globalThis.VTAFirebaseDiagnostics;
        if(diag?.stage==='profile-loading'){
          state.stage='profile-timeout';
          state.lastError='native/profile-timeout';
          console.error('[VTA native auth] Benutzerprofil bleibt in Firestore-Prüfung hängen',{
            firebaseDiagnostics:{...diag},
            origin:location.origin
          });
          const loadingText=document.querySelector('#firebaseAuthLoadingText');
          if(loadingText)loadingText.textContent='Anmeldung erfolgreich – Benutzerprofil antwortet noch nicht …';
        }
      },PROFILE_TIMEOUT_MS);
    }catch(error){
      state.stage='login-error';
      state.lastError=String(error?.code||error?.message||'native-login-error');
      state.lastDurationMs=Math.round(performance.now()-started);
      console.error('[VTA native auth] Login fehlgeschlagen',error);
      if(errorBox)errorBox.textContent=messageFor(error);
    }finally{
      if(submit){submit.disabled=false;submit.textContent='Anmelden';}
    }
  }

  document.addEventListener('submit',nativeSubmit,true);
  console.info('[VTA native auth] Adapter aktiv',{build:BUILD,origin:location.origin});
}
