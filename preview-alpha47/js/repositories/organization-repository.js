import { STORES, getAll, getOne, putOne } from '../db/database.js';

export const organizationRepository = {
  async list(){ return getAll(STORES.organizations); },
  async get(id){ return getOne(STORES.organizations,id); },
  async save(organization){
    const value={
      id:organization.id,
      name:organization.name||'',
      type:organization.type||'company',
      editionId:organization.editionId||'',
      updatedAt:new Date().toISOString(),
      createdAt:organization.createdAt||new Date().toISOString()
    };
    await putOne(STORES.organizations,value);
    return value;
  },
  async ensureFromTenant(tenant){
    const seed=tenant?.organization;
    if(!seed?.id)return null;
    const existing=await this.get(seed.id);
    if(existing)return existing;
    return this.save(seed);
  }
};
