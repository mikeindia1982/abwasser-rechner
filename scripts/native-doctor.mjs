import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
let failures = 0;

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}
function report(ok, label, detail = '') {
  checks.push({ ok, label, detail });
  if (!ok) failures += 1;
}
function command(command, args = []) {
  try { return execFileSync(command, args, { encoding: 'utf8' }).trim(); } catch { return ''; }
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
report(nodeMajor >= 22, 'Node.js >= 22', process.version);

for (const path of [
  'package.json',
  'capacitor.config.json',
  'scripts/build-native.mjs',
  'js/native-runtime.js',
  'js/native-ui-hardening.js',
  'js/native-ios-integration.js',
  'js/native-ios-deeplink.js',
  'js/native-firebase-auth.js',
  'native-ios.css',
  'native-ios-detail-fixes.css',
  'native-ios-integration.css',
  'ios/App/App/SceneDelegate.swift',
  'ios/App/App/Info.plist',
  'index.html'
]) {
  report(await exists(join(root, path)), `Required file: ${path}`);
}

try {
  const config = JSON.parse(await readFile(join(root, 'capacitor.config.json'), 'utf8'));
  report(config.webDir === 'dist', 'Capacitor webDir is dist', config.webDir || 'missing');
  report(Boolean(config.appId), 'Capacitor appId configured', config.appId || 'missing');
  report(config.plugins?.CapacitorHttp?.enabled !== true, 'Global CapacitorHttp patch disabled', config.plugins?.CapacitorHttp?.enabled === true ? 'must be disabled' : 'yes');
  const presentation = config.plugins?.LocalNotifications?.presentationOptions || [];
  report(['badge','sound','banner','list'].every(item=>presentation.includes(item)), 'iOS local notification presentation configured', presentation.join(', ') || 'missing');
} catch (error) {
  report(false, 'Capacitor config is valid JSON', error.message);
}

try {
  const scene = await readFile(join(root, 'ios', 'App', 'App', 'SceneDelegate.swift'), 'utf8');
  const plist = await readFile(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
  report(scene.includes('VTANativeIntegrationPlugin'), 'Native EventKit bridge registered');
  report(scene.includes('requestFullAccessToEvents'), 'Calendar full-access request implemented');
  report(scene.includes('registerPluginInstance'), 'Custom Capacitor plugin registration implemented');
  report(plist.includes('NSCalendarsFullAccessUsageDescription'), 'iOS calendar full-access usage description present');
  report(plist.includes('NSCalendarsUsageDescription'), 'Legacy iOS calendar usage description present');
  report(plist.includes('NSCameraUsageDescription'), 'iOS camera usage description present');
  report(plist.includes('NSPhotoLibraryUsageDescription'), 'iOS photo-library usage description present');
  report(plist.includes('NSLocationWhenInUseUsageDescription'), 'iOS foreground location usage description present');
} catch (error) {
  report(false, 'Native iOS integration metadata readable', error.message);
}

const nodeModules = await exists(join(root, 'node_modules'));
checks.push({ ok: nodeModules, warning: true, label: 'npm dependencies installed', detail: nodeModules ? 'yes' : 'run npm install' });

const distIndex = await exists(join(root, 'dist', 'index.html'));
checks.push({ ok: distIndex, warning: true, label: 'Native dist build exists', detail: distIndex ? 'yes' : 'run npm run native:build' });
if (distIndex) {
  try {
    const html = await readFile(join(root, 'dist', 'index.html'), 'utf8');
    report(html.includes('native-ui-hardening.js'), 'Native UI hardening injected into dist');
    report(html.includes('native-ios-integration.js'), 'Native iPhone integration injected into dist');
    report(html.includes('native-ios-deeplink.js'), 'Native notification deep-link restore injected into dist');
    report(html.includes('native-firebase-auth.js'), 'Native Firebase auth injected into dist');
    report(html.includes('native-ios.css'), 'Native iOS stylesheet injected into dist');
    report(html.includes('native-ios-detail-fixes.css'), 'Native device-review stylesheet injected into dist');
    report(html.includes('native-ios-integration.css'), 'Native iPhone integration stylesheet injected into dist');
  } catch (error) {
    report(false, 'Native dist index readable', error.message);
  }
}

const iosProject = await exists(join(root, 'ios', 'App', 'App.xcodeproj'));
checks.push({ ok: iosProject, warning: true, label: 'iOS project generated', detail: iosProject ? 'yes' : 'run npm run ios:add once' });

if (process.platform === 'darwin') {
  const xcode = command('xcodebuild', ['-version']);
  checks.push({ ok: Boolean(xcode), warning: true, label: 'Xcode command line tools', detail: xcode || 'not available' });
} else {
  checks.push({ ok: false, warning: true, label: 'macOS/Xcode host', detail: 'iOS generation and signing must run on a Mac' });
}

for (const check of checks) {
  const icon = check.ok ? '✓' : check.warning ? '!' : '✗';
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ''}`);
}

if (failures) {
  console.error(`\nNative doctor found ${failures} blocking problem(s).`);
  process.exit(1);
}
console.log('\nNative scaffold is structurally ready. Warnings describe local setup steps only.');
