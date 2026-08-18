import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(join(root, path), 'utf8');

test('Capacitor config points at the generated native bundle', async () => {
  const config = JSON.parse(await read('capacitor.config.json'));
  assert.equal(config.appName, 'VTA Copilot');
  assert.equal(config.appId, 'de.vta.copilot');
  assert.equal(config.webDir, 'dist');
  assert.notEqual(config.plugins?.CapacitorHttp?.enabled, true, 'CapacitorHttp must not globally patch Firebase networking');
});

test('package scripts expose repeatable iOS lifecycle commands', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.engines.node, /22/);
  assert.ok(pkg.scripts['native:build']);
  assert.ok(pkg.scripts['native:doctor']);
  assert.ok(pkg.scripts['ios:add']);
  assert.ok(pkg.scripts['ios:sync']);
  assert.ok(pkg.scripts['ios:open']);
  assert.ok(pkg.devDependencies['@capacitor/ios']);
});

test('native build injects runtime and hardening before the application module', async () => {
  const build = await read('scripts/build-native.mjs');
  assert.match(build, /native-runtime\.js/);
  assert.match(build, /native-ui-hardening\.js/);
  assert.match(build, /js\\\/app\\\.js|js\\\/app\.js|js\/app/);
  assert.match(build, /runtimeDirs = \['js', 'images', 'products'\]/);
});

test('native bundle replaces browser Firebase auth with explicit native-webview auth', async () => {
  const build = await read('scripts/build-native.mjs');
  const auth = await read('js/native-firebase-auth.js');
  assert.match(build, /native-firebase-auth\.js/);
  assert.match(build, /firebase-auth\\\.js|firebase-auth\.js/);
  assert.match(auth, /initializeAuth\(/);
  assert.match(auth, /browserLocalPersistence/);
});

test('native bundle owns an iOS-only responsive presentation layer', async () => {
  const build = await read('scripts/build-native.mjs');
  const nativeCss = await read('native-ios.css');
  assert.match(build, /native-ios\.css/);
  assert.match(nativeCss, /html\.native-ios \.topbar/);
  assert.match(nativeCss, /safe-area-inset-top/);
  assert.match(nativeCss, /native-home/);
  assert.match(nativeCss, /plant-subnav/);
  assert.match(nativeCss, /global-task-card/);
  assert.match(nativeCss, /calculator-view/);
  assert.match(nativeCss, /document-review-layout/);
  assert.match(nativeCss, /native-keyboard-open/);
  assert.match(nativeCss, /commercial-notification-panel/);
});

test('native UI hardening tracks app views and iOS keyboard geometry', async () => {
  const nativeUi = await read('js/native-ui-hardening.js');
  assert.match(nativeUi, /VTANativeRuntime/);
  assert.match(nativeUi, /native-view-plants/);
  assert.match(nativeUi, /native-view-tasks/);
  assert.match(nativeUi, /native-view-documents/);
  assert.match(nativeUi, /visualViewport/);
  assert.match(nativeUi, /native-keyboard-open/);
  assert.match(nativeUi, /scrollIntoView/);
});

test('native runtime does not alter the normal web app', async () => {
  const runtime = await read('js/native-runtime.js');
  assert.match(runtime, /if \(!isNative\) return/);
  assert.match(runtime, /VTANativeRuntime/);
});