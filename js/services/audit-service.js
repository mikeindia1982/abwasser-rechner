import {putOne,STORES,getAll} from '../db/database.js';
export async function audit(action,entityType,entityId,details={}){
  try{return await putOne(STORES.auditLog,{action,entityType,entityId,details,createdAt:new Date().toISOString()})}catch(error){console.error('Audit-Log',error)}
}
export async function recentAudit(limit=50){const rows=await getAll(STORES.auditLog);return rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,limit)}
