const BASE_DB_NAME = 'abwasser-rechner-v011';
const activeTenant = globalThis.AbwasserPlatform?.tenant;
const useLegacyDatabase = !activeTenant || activeTenant.storage?.preserveLegacyDatabase;

export const DB_NAME = useLegacyDatabase
  ? BASE_DB_NAME
  : `${BASE_DB_NAME}-${activeTenant.id}`;

export const DB_VERSION = 1;
export const STORES = Object.freeze({
  documents:'documents', files:'files', products:'products', plants:'plants', customers:'customers',
  projects:'projects', relations:'relations', auditLog:'auditLog', settings:'settings'
});
let dbPromise;
export function openDatabase(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      for(const name of Object.values(STORES)){
        if(db.objectStoreNames.contains(name)) continue;
        if(name===STORES.auditLog) db.createObjectStore(name,{keyPath:'id',autoIncrement:true});
        else db.createObjectStore(name,{keyPath:'id'});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB konnte nicht geöffnet werden.'));
  });
  return dbPromise;
}
export async function transaction(storeNames,mode,work){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(storeNames,mode);
    const stores=Object.fromEntries(storeNames.map(name=>[name,tx.objectStore(name)]));
    let result;
    try{result=work(stores,tx)}catch(error){tx.abort();reject(error);return}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error||new Error('Datenbanktransaktion fehlgeschlagen.'));
    tx.onabort=()=>reject(tx.error||new Error('Datenbanktransaktion wurde abgebrochen.'));
  });
}
export async function getAll(store){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)});
}
export async function getOne(store,id){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});
}
export async function putOne(store,value){return transaction([store],'readwrite',s=>s[store].put(value))}
export async function deleteOne(store,id){return transaction([store],'readwrite',s=>s[store].delete(id))}
export async function count(store){const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
