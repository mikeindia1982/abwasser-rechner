import { getActiveTenant } from "./tenant-runtime.js";
import { organizationRepository } from "../repositories/organization-repository.js";

const tenant = getActiveTenant();

if (tenant?.organization?.id) {
  organizationRepository
    .ensureFromTenant(tenant)
    .then((organization) => {
      if (!organization) return;
      globalThis.AbwasserOrganization = Object.freeze({
        id: organization.id,
        name: organization.name,
        editionId: tenant.id,
      });
      document.documentElement.dataset.organizationId = organization.id;
    })
    .catch((error) => {
      console.error("Organisationskontext konnte nicht initialisiert werden", error);
    });
}
