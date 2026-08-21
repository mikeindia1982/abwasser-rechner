export const DB_NAME = 'abwasser-rechner-v011';
export const DB_VERSION = 3;
export const STORES = Object.freeze({
  documents:'documents', files:'files', products:'products', plants:'plants', customers:'customers',
  projects:'projects', relations:'relations', auditLog:'auditLog', settings:'settings',
  tenderNotices:'tenderNotices', tenderMatches:'tenderMatches', tenderScanRuns:'tenderScanRuns',
  tenderRawNotices:'tenderRawNotices', tenderFeedback:'tenderFeedback', tenderNotifications:'tenderNotifications',
  knowledgeEntries:'knowledgeEntries', knowledgeTags:'knowledgeTags', knowledgeEntryTags:'knowledgeEntryTags',
  knowledgeLinks:'knowledgeLinks', knowledgeSources:'knowledgeSources', knowledgeSuggestions:'knowledgeSuggestions'
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
        if(name===STORES.auditLog||name===STORES.tenderFeedback) db.createObjectStore(name,{keyPath:'id'});
        else db.createObjectStore(name,{keyPath:'id'});
      }
      if(db.objectStoreNames.contains(STORES.tenderNotices)){
        const store=request.transaction.objectStore(STORES.tenderNotices);
        if(!store.indexNames.contains('by_uniqueKey')) store.createIndex('by_uniqueKey','uniqueKey',{unique:true});
        if(!store.indexNames.contains('by_source')) store.createIndex('by_source','source',{unique:false});
        if(!store.indexNames.contains('by_publishedAt')) store.createIndex('by_publishedAt','publishedAt',{unique:false});
      }
      if(db.objectStoreNames.contains(STORES.tenderMatches)){
        const store=request.transaction.objectStore(STORES.tenderMatches);
        if(!store.indexNames.contains('by_tenderNoticeId')) store.createIndex('by_tenderNoticeId','tenderNoticeId',{unique:true});
        if(!store.indexNames.contains('by_relevanceLevel')) store.createIndex('by_relevanceLevel','relevanceLevel',{unique:false});
        if(!store.indexNames.contains('by_status')) store.createIndex('by_status','status',{unique:false});
        if(!store.indexNames.contains('by_isRead')) store.createIndex('by_isRead','isRead',{unique:false});
      }
      if(db.objectStoreNames.contains(STORES.tenderScanRuns)){
        const store=request.transaction.objectStore(STORES.tenderScanRuns);
        if(!store.indexNames.contains('by_startedAt')) store.createIndex('by_startedAt','startedAt',{unique:false});
        if(!store.indexNames.contains('by_status')) store.createIndex('by_status','status',{unique:false});
      }
      if(db.objectStoreNames.contains(STORES.tenderFeedback)){
        const store=request.transaction.objectStore(STORES.tenderFeedback);
        if(!store.indexNames.contains('by_tenderMatchId')) store.createIndex('by_tenderMatchId','tenderMatchId',{unique:false});
        if(!store.indexNames.contains('by_changedAt')) store.createIndex('by_changedAt','changedAt',{unique:false});
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
