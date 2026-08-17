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

  // Neutral edition starts without VTA profile/products if no preview data exists.
  if (tenantId === 'platform') {
    const profileKey = 'abwasser-employee-profile-v087';
    const productKey = 'abwasser-products-v092';
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
