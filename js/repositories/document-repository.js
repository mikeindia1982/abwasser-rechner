import {STORES,getAll,getOne,putOne,deleteOne,transaction,count} from '../db/database.js';
import {audit} from '../services/audit-service.js';
const LEGACY_KEY='abwasser-documents-v010';
const LEGACY_FILE_DB='abwasser-product-documents-v1';
async function legacyFile(id){
  return new Promise(resolve=>{const q=indexedDB.open(LEGACY_FILE_DB,1);q.onerror=()=>resolve(null);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('files'))q.result.createObjectStore('files')};q.onsuccess=()=>{const db=q.result;const r=db.transaction('files','readonly').objectStore('files').get(id);r.onsuccess=()=>{const v=r.result;resolve(v?.blob||v||null);db.close()};r.onerror=()=>{resolve(null);db.close()}}});
}
export const documentRepository={
  async list(){return (await getAll(STORES.documents)).sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt)))},
  async save(document){await putOne(STORES.documents,document);await audit('document.saved','document',document.id,{status:document.status});return document},
  async replaceAll(documents){await transaction([STORES.documents],'readwrite',s=>{s[STORES.documents].clear();for(const d of documents)s[STORES.documents].put(d)});return documents.length},
  async saveFile(id,blob){await putOne(STORES.files,{id,blob,size:blob.size,mimeType:blob.type||'application/pdf',storedAt:new Date().toISOString()});await audit('file.stored','document',id,{size:blob.size})},
  async getFile(id){const row=await getOne(STORES.files,id);if(row?.blob)return row.blob;const old=await legacyFile(id);if(old){await this.saveFile(id,old);return old}return null},
  async remove(id){await transaction([STORES.documents,STORES.files],'readwrite',s=>{s[STORES.documents].delete(id);s[STORES.files].delete(id)});await audit('document.deleted','document',id)},
  async migrateLegacy(normalize){const existing=await count(STORES.documents);if(existing)return {migrated:0,skipped:true};let legacy=[];try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]')}catch{}if(!Array.isArray(legacy)||!legacy.length)return {migrated:0,skipped:false};const docs=legacy.map(normalize);await this.replaceAll(docs);let files=0;for(const d of docs){const blob=await legacyFile(d.id);if(blob){await this.saveFile(d.id,blob);files++}}await audit('migration.completed','system','v010',{documents:docs.length,files});return {migrated:docs.length,files,skipped:false}},
  async diagnostics(){const docs=await this.list();const files=await getAll(STORES.files);const ids=new Set(files.map(x=>x.id));return {documents:docs.length,files:files.length,missing:docs.filter(d=>!ids.has(d.id)).length,orphans:files.filter(f=>!docs.some(d=>d.id===f.id)).length,fileBytes:files.reduce((n,f)=>n+(f.size||f.blob?.size||0),0)}}
};
