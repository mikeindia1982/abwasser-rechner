(() => {
  'use strict';

  const capacitor = globalThis.Capacitor;
  const isNative = Boolean(
    capacitor?.isNativePlatform?.() ||
    location.protocol === 'capacitor:' ||
    location.protocol === 'ionic:'
  );

  const runtime = Object.freeze({
    enabled: isNative,
    platform: capacitor?.getPlatform?.() || (isNative ? 'ios' : 'web'),
    build: '0.11.0-alpha.57-native1'
  });

  globalThis.VTANativeRuntime = runtime;
  globalThis.__VTA_NATIVE__ = runtime;

  if (!isNative) return;

  document.documentElement.classList.add('native-app', 'native-ios');
  document.documentElement.dataset.runtime = 'capacitor-ios';

  const normalizeNativeUi = () => {
    document.querySelector('#installButton')?.classList.add('hidden');
    document.querySelectorAll('link[rel="manifest"]').forEach(link => link.remove());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeNativeUi, { once: true });
  } else {
    normalizeNativeUi();
  }

  window.addEventListener('pageshow', normalizeNativeUi);
})();
