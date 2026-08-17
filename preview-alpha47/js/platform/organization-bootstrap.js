import { organizationRepository } from '../repositories/organization-repository.js';

const platformReady=globalThis.AbwasserPlatformReady||Promise.resolve(globalThis.AbwasserPlatform?.tenant||null);

platformReady.then(async tenant=>{
  if(!tenant?.organization?.id)return;
  try{
    const organization=await organizationRepository.ensureFromTenant(tenant);
    if(!organization)return;
    globalThis.AbwasserOrganization=Object.freeze({
      id:organization.id,
      name:organization.name,
      editionId:tenant.id
    });
    document.documentElement.dataset.organizationId=organization.id;
  }catch(error){
    console.error('Organisationskontext konnte nicht initialisiert werden',error);
  }
});
