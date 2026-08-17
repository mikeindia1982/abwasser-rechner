import { STORES, getOne, putOne } from "../db/database.js";

function now() {
  return new Date().toISOString();
}

export const organizationRepository = {
  async get(id) {
    return id ? getOne(STORES.organizations, id) : null;
  },

  async ensureFromTenant(tenant) {
    const source = tenant?.organization;
    if (!source?.id) return null;

    const existing = await this.get(source.id);
    const organization = {
      id: source.id,
      name: source.name || tenant.companyName || tenant.appName,
      type: source.type || "company",
      editionId: tenant.id,
      status: "active",
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
      ...(existing || {}),
      name: existing?.name || source.name || tenant.companyName || tenant.appName,
      editionId: tenant.id,
    };

    await putOne(STORES.organizations, organization);
    await putOne(STORES.organizationSettings, {
      id: source.id,
      organizationId: source.id,
      editionId: tenant.id,
      features: { ...(tenant.features || {}) },
      branding: {
        appName: tenant.appName,
        shortName: tenant.shortName,
        companyName: tenant.companyName,
        brandMark: tenant.brandMark,
        slogan: tenant.slogan,
        colors: { ...(tenant.colors || {}) },
      },
      updatedAt: now(),
    });

    return organization;
  },
};
