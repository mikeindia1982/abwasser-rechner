// Zentraler Schalter für den aktuellen externen Testbetrieb.
// false = kein Firebase-Login/Firestore-Zugriff; die App läuft lokal.
// true  = reguläre Firebase-Anmeldung über firebase-auth-live.js.
export const FIREBASE_ENABLED=false;
export const FIREBASE_SDK_VERSION='12.16.0';

export const firebaseConfig=Object.freeze({
  apiKey:'AIzaSyCscfja2z2TmmRc9QBCthGsf25k6Bf4yDo',
  authDomain:'vta-copilot.firebaseapp.com',
  projectId:'vta-copilot',
  storageBucket:'vta-copilot.firebasestorage.app',
  messagingSenderId:'806208297315',
  appId:'1:806208297315:web:bfefda5bea96dd9f865b56'
});
