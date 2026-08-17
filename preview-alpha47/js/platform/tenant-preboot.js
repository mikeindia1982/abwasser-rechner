(() => {
  const PREVIEW_PREFIX = 'abwasser-preview-alpha47';
  const requested = new URLSearchParams(location.search).get('tenant');
  const tenantId = requested === 'platform' ? 'platform' : 'vta';
  const namespace = `${PREVIEW_PREFIX}:${tenantId}:`;
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;
  const nativeKey = Storage.prototype.key;

  const managed = key => {
    const value = String(key || '');
    return (value.startsWith('abwasser-') || value.startsWith('vta-')) &&
      !value.startsWith(`${PREVIEW_PREFIX}:`);
  };
  const namespaced = key => managed(key) ? `${namespace}${key}` : String(key);

  // VTA preview gets a one-time copy of existing browser data. All later writes
  // stay inside the preview namespace and cannot modify the productive PWA data.
  if (tenantId === 'vta') {
    const marker = `${namespace}__cloned__`;
    if (nativeGet.call(localStorage, marker) !== '1') {
      const keys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = nativeKey.call(localStorage, index);
        if (managed(key)) keys.push(key);
      }
      for (const key of keys) {
        const target = `${namespace}${key}`;
        if (nativeGet.call(localStorage, target) === null) {
          const value = nativeGet.call(localStorage, key);
          if (value !== null) nativeSet.call(localStorage, target, value);
        }
      }
      nativeSet.call(localStorage, marker, '1');
    }
  }

  Storage.prototype.getItem = function(key) {
    return nativeGet.call(this, namespaced(key));
  };
  Storage.prototype.setItem = function(key, value) {
    return nativeSet.call(this, namespaced(key), value);
  };
  Storage.prototype.removeItem = function(key) {
    return nativeRemove.call(this, namespaced(key));
  };
  Storage.prototype.clear = function() {
    if (this !== localStorage) return nativeClear.call(this);
    const remove = [];
    for (let index = 0; index < this.length; index += 1) {
      const key = nativeKey.call(this, index);
      if (key?.startsWith(namespace)) remove.push(key);
    }
    remove.forEach(key => nativeRemove.call(this, key));
  };

  // Read-only bridge for selected productive browser data. It deliberately
  // exposes no write operation, so preview changes cannot mutate production.
  globalThis.AbwasserPreviewStorage = Object.freeze({
    tenantId,
    namespace,
    readProductive(key) {
      if (tenantId !== 'vta' || !managed(key)) return null;
      return nativeGet.call(localStorage, String(key));
    }
  });

  // Neutral edition starts without vendor profile/products and removes the
  // built-in VTA demo plant left behind by older preview builds.
  if (tenantId === 'platform') {
    const profileKey = 'abwasser-employee-profile-v087';
    const productKey = 'abwasser-products-v092';
    const plantsKey = 'abwasser-plants-v07';
    const activePlantKey = 'abwasser-active-plant-v07';
    const cleanupMarkerKey = 'abwasser-platform-demo-cleanup-v01';
    const legacyDemoPlantId = 'demo-plant-001';

    if (localStorage.getItem(cleanupMarkerKey) !== '1') {
      try {
        const stored = JSON.parse(localStorage.getItem(plantsKey) || '[]');
        if (Array.isArray(stored)) {
          const filtered = stored.filter(plant => plant?.id !== legacyDemoPlantId);
          if (filtered.length !== stored.length) localStorage.setItem(plantsKey, JSON.stringify(filtered));
        }
      } catch {}
      if (localStorage.getItem(activePlantKey) === legacyDemoPlantId) localStorage.removeItem(activePlantKey);
      localStorage.setItem(cleanupMarkerKey, '1');
    }

    if (localStorage.getItem(profileKey) === null) {
      localStorage.setItem(profileKey, JSON.stringify({
        schemaVersion: 1,
        firstName: '',
        lastName: '',
        jobTitle: 'Vertriebsingenieur',
        company: '',
        department: 'Außendienst',
        employeeNumber: '',
        region: '',
        branch: '',
        email: '',
        mobile: '',
        phone: '',
        website: '',
        street: '',
        postalCode: '',
        city: '',
        country: 'Deutschland',
        notes: ''
      }));
    }
    if (localStorage.getItem(productKey) === null) localStorage.setItem(productKey, '[]');
  }

  globalThis.__ABWASSER_PREVIEW_TENANT__ = tenantId;
  globalThis.__ABWASSER_PREVIEW_NAMESPACE__ = namespace;
})();
