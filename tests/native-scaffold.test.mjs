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
  assert.deepEqual(config.plugins?.LocalNotifications?.presentationOptions, ['badge','sound','banner','list']);
});

test('package scripts expose repeatable iOS lifecycle commands', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.engines.node, /22/);
  assert.ok(pkg.scripts['native:build']);
  assert.ok(pkg.scripts['native:doctor']);
  assert.ok(pkg.scripts['ios:add']);
  assert.ok(pkg.scripts['ios:sync']);
  assert.ok(pkg.scripts['ios:open']);
  assert.ok(pkg.dependencies['@capacitor/camera']);
  assert.ok(pkg.dependencies['@capacitor/filesystem']);
  assert.ok(pkg.dependencies['@capacitor/local-notifications']);
  assert.ok(pkg.dependencies['@capacitor/share']);
  assert.ok(pkg.devDependencies['@capacitor/ios']);
});

test('native build injects runtime and iPhone integration before the application module', async () => {
  const build = await read('scripts/build-native.mjs');
  assert.match(build, /native-runtime\.js/);
  assert.match(build, /native-ui-hardening\.js/);
  assert.match(build, /native-ios-integration\.js/);
  assert.match(build, /native-ios-deeplink\.js/);
  assert.match(build, /native-ios-integration\.css/);
  assert.match(build, /js\\\/app\\\.js|js\\\/app\.js|js\/app/);
  assert.match(build, /runtimeDirs = \['js', 'images', 'products'\]/);
});

test('native bundle replaces browser Firebase auth with explicit offline-first native-webview auth', async () => {
  const build = await read('scripts/build-native.mjs');
  const auth = await read('js/native-firebase-auth.js');
  assert.match(build, /native-firebase-auth\.js/);
  assert.match(build, /firebase-auth\\\.js|firebase-auth\.js/);
  assert.match(auth, /initializeAuth\(/);
  assert.match(auth, /browserLocalPersistence/);
  assert.match(auth, /SDK_TIMEOUT_MS/);
  assert.match(auth, /withTimeout\(loadFirebaseSdk\(\),SDK_TIMEOUT_MS,'native\/sdk-timeout'\)/);
  assert.match(auth, /startupBlocking:false/);
  assert.match(auth, /stage:'local-ready'/);
  assert.match(auth, /unlockApp\(\)/);
  assert.doesNotMatch(auth, /setAttribute\(['"]inert['"]/);
});

test('native bundle owns iOS-only presentation and device-review fixes', async () => {
  const build = await read('scripts/build-native.mjs');
  const nativeCss = await read('native-ios.css');
  const detailCss = await read('native-ios-detail-fixes.css');
  const integrationCss = await read('native-ios-integration.css');
  assert.match(build, /native-ios\.css/);
  assert.match(build, /native-ios-detail-fixes\.css/);
  assert.match(nativeCss, /html\.native-ios \.topbar/);
  assert.match(nativeCss, /safe-area-inset-top/);
  assert.match(nativeCss, /firebase-auth-gate/);
  assert.match(nativeCss, /commercial-notification-panel/);
  assert.match(detailCss, /native-view-visit/);
  assert.match(detailCss, /#startVisitMain/);
  assert.match(detailCss, /native-view-schema/);
  assert.match(detailCss, /schema3d-section/);
  assert.match(detailCss, /photo-process-layout/);
  assert.match(integrationCss, /vta-native-action-sheet/);
  assert.match(integrationCss, /native-integration-settings/);
  assert.match(integrationCss, /native-calendar-linked/);
});

test('native UI runtime tracks keyboard, schema and active horizontal tabs', async () => {
  const ui = await read('js/native-ui-hardening.js');
  assert.match(ui, /visualViewport/);
  assert.match(ui, /native-keyboard-open/);
  assert.match(ui, /native-view-schema/);
  assert.match(ui, /native-view-visit/);
  assert.match(ui, /revealActiveTabs/);
  assert.match(ui, /scrollIntoView/);
});

test('native iPhone integration covers calendar, notifications, maps, camera, filesystem and sharing', async () => {
  const integration = await read('js/native-ios-integration.js');
  assert.match(integration, /VTANativeIntegration/);
  assert.match(integration, /upsertCalendarEvent/);
  assert.match(integration, /deleteCalendarEvent/);
  assert.match(integration, /LocalNotifications/);
  assert.match(integration, /Apple Karten/);
  assert.match(integration, /Camera\.getPhoto/);
  assert.match(integration, /Camera\.pickImages/);
  assert.match(integration, /Filesystem\.writeFile/);
  assert.match(integration, /PHOTO_MAX_EDGE=1600/);
  assert.match(integration, /PHOTO_QUALITY=0\.78/);
  assert.match(integration, /Share\.share/);
});

test('native notification navigation restores the requested plant and page after app reload', async () => {
  const deepLink = await read('js/native-ios-deeplink.js');
  assert.match(deepLink, /localNotificationActionPerformed/);
  assert.match(deepLink, /vta-native-pending-navigation-v1/);
  assert.match(deepLink, /#activePlantSelect/);
  assert.match(deepLink, /dispatchEvent\(new Event\('change'/);
  assert.match(deepLink, /abwasser-plant-page-v091a/);
});

test('native EventKit bridge and foreground device permissions are declared', async () => {
  const scene = await read('ios/App/App/SceneDelegate.swift');
  const plist = await read('ios/App/App/Info.plist');
  assert.match(scene, /import EventKit/);
  assert.match(scene, /CAPBridgedPlugin/);
  assert.match(scene, /requestFullAccessToEvents/);
  assert.match(scene, /eventStore\.save/);
  assert.match(scene, /eventStore\.remove/);
  assert.match(scene, /registerPluginInstance\(VTANativeIntegrationPlugin\(\)\)/);
  assert.match(plist, /NSCalendarsFullAccessUsageDescription/);
  assert.match(plist, /NSCalendarsUsageDescription/);
  assert.match(plist, /NSCameraUsageDescription/);
  assert.match(plist, /NSPhotoLibraryUsageDescription/);
  assert.match(plist, /NSLocationWhenInUseUsageDescription/);
});

test('native runtime does not alter the normal web app', async () => {
  const runtime = await read('js/native-runtime.js');
  assert.match(runtime, /if \(!isNative\) return/);
  assert.match(runtime, /VTANativeRuntime/);
});
