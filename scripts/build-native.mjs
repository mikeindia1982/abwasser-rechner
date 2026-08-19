import { access, cp, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');
const runtimeDirs = ['js', 'images', 'products'];
const allowedRootExtensions = new Set(['.html', '.css', '.webmanifest', '.png', '.webp', '.svg', '.ico']);

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function gitRevision() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 8) || 'unknown';
  }
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!allowedRootExtensions.has(extname(entry.name))) continue;
  await copyFile(join(root, entry.name), join(dist, entry.name));
}

for (const dir of runtimeDirs) {
  const source = join(root, dir);
  if (await exists(source)) await cp(source, join(dist, dir), { recursive: true });
}

const indexPath = join(dist, 'index.html');
const navigationRuntimePath = join(dist, 'js/navigation-enhancements.js');
const navigationRecoveryPath = join(dist, 'js/native-navigation-recovery.js');
if (!(await exists(indexPath))) throw new Error('Native build failed: dist/index.html is missing.');
if (!(await exists(navigationRuntimePath))) throw new Error('Native build failed: navigation-enhancements.js is missing.');
if (!(await exists(navigationRecoveryPath))) throw new Error('Native build failed: native-navigation-recovery.js is missing.');
if (!(await exists(join(dist, 'native-navigation-recovery.css')))) throw new Error('Native build failed: native-navigation-recovery.css is missing.');
if (!(await exists(join(dist, 'native-ios.css')))) throw new Error('Native build failed: native-ios.css is missing.');
if (!(await exists(join(dist, 'native-ios-detail-fixes.css')))) throw new Error('Native build failed: native-ios-detail-fixes.css is missing.');
if (!(await exists(join(dist, 'native-ios-integration.css')))) throw new Error('Native build failed: native-ios-integration.css is missing.');
if (!(await exists(join(dist, 'js/native-ui-hardening.js')))) throw new Error('Native build failed: native-ui-hardening.js is missing.');
if (!(await exists(join(dist, 'js/native-ios-integration.js')))) throw new Error('Native build failed: native-ios-integration.js is missing.');
if (!(await exists(join(dist, 'js/native-ios-deeplink.js')))) throw new Error('Native build failed: native-ios-deeplink.js is missing.');

// Navigation V2 ist inzwischen im gemeinsamen PWA-/iOS-Quellcode gegen
// MutationObserver-Endlosschleifen abgesichert. Ältere Quellen werden für einen
// Übergangszeitraum weiterhin beim nativen Build automatisch gepatcht.
let navigationRuntime = await readFile(navigationRuntimePath, 'utf8');
const unstableVisitLabelUpdate = "if(visitLabel)visitLabel.textContent=visitId?'Fortsetzen':'Besuch';";
const guardedVisitLabelUpdate = "const nextVisitLabel=visitId?'Fortsetzen':'Besuch';\n    if(visitLabel&&visitLabel.textContent!==nextVisitLabel)visitLabel.textContent=nextVisitLabel;";
if (navigationRuntime.includes(unstableVisitLabelUpdate)) {
  navigationRuntime = navigationRuntime.replace(unstableVisitLabelUpdate, guardedVisitLabelUpdate);
  await writeFile(navigationRuntimePath, navigationRuntime, 'utf8');
}
if (!navigationRuntime.includes('visitLabel&&visitLabel.textContent!==nextVisitLabel')) {
  throw new Error('Native build failed: Navigation V2 mutation guard is missing.');
}

let index = await readFile(indexPath, 'utf8');
index = index.replace(/\s*<link[^>]+rel=["']manifest["'][^>]*>\s*/i, '\n');

// Native Navigation V2: force a fresh WebKit request after each synced build.
index = index.replace(
  /navigation-enhancements\.css\?v=[^"']+/i,
  'navigation-enhancements.css?v=0.11.0-alpha.66-nav5'
);
index = index.replace(
  /js\/navigation-enhancements\.js\?v=[^"']+/i,
  'js/navigation-enhancements.js?v=0.11.0-alpha.65-nav4'
);

// Native Firebase is offline-first. The generated iOS bundle must never boot
// behind the auth overlay, even before JavaScript has had a chance to execute.
const firebaseGatePattern = /<div\s+id=["']firebaseAuthGate["']\s+class=["']firebase-auth-gate["']\s+aria-live=["']polite["']>/i;
if (!firebaseGatePattern.test(index)) {
  throw new Error('Native build failed: Firebase auth gate markup was not found.');
}
index = index.replace(
  firebaseGatePattern,
  '<div id="firebaseAuthGate" class="firebase-auth-gate" aria-live="polite" hidden>'
);

const appLayoutInertPattern = /<div\s+class=["']app-layout["']\s+inert>/i;
if (!appLayoutInertPattern.test(index)) {
  throw new Error('Native build failed: app-layout inert startup marker was not found.');
}
index = index.replace(appLayoutInertPattern, '<div class="app-layout">');

const nativeFirebaseVisibilityGuard = `
  <style id="native-firebase-visibility-guard">
    #firebaseAuthGate[hidden],
    #firebaseAuthLoading[hidden],
    #firebaseLoginForm[hidden],
    #firebaseAuthIssue[hidden]{display:none!important}
  </style>`;

const appScriptPattern = /(<script\s+type=["']module["']\s+src=["']js\/app\.js[^"']*["']><\/script>)/i;
if (!appScriptPattern.test(index)) {
  throw new Error('Native build failed: app.js script tag was not found in index.html.');
}
index = index.replace(
  appScriptPattern,
  '<script src="js/native-runtime.js?v=0.11.0-alpha.58"></script>\n<script src="js/native-ui-hardening.js?v=0.11.0-alpha.58-native-ui4"></script>\n<script src="js/native-ios-integration.js?v=0.11.0-alpha.58-native-integration1"></script>\n<script src="js/native-ios-deeplink.js?v=0.11.0-alpha.58-native-integration1"></script>\n$1\n<script src="js/native-navigation-recovery.js?v=0.11.0-alpha.67-native-navigation-recovery2"></script>'
);

const firebaseAuthPattern = /<script\s+type=["']module["']\s+src=["']js\/firebase-auth\.js[^"']*["']><\/script>/i;
if (!firebaseAuthPattern.test(index)) {
  throw new Error('Native build failed: firebase-auth.js script tag was not found in index.html.');
}
index = index.replace(
  firebaseAuthPattern,
  '<script type="module" src="js/native-firebase-auth.js?v=0.11.0-alpha.62-native-auth4"></script>'
);

index = index.replace(
  '</head>',
  `${nativeFirebaseVisibilityGuard}\n  <link rel="stylesheet" href="native-ios.css?v=0.11.0-alpha.58-native-ui4">\n  <link rel="stylesheet" href="native-ios-detail-fixes.css?v=0.11.0-alpha.58-native-ui4">\n  <link rel="stylesheet" href="native-ios-integration.css?v=0.11.0-alpha.58-native-integration1">\n  <link rel="stylesheet" href="native-navigation-recovery.css?v=0.11.0-alpha.67-native-navigation-recovery2">\n  <meta name="format-detection" content="telephone=yes">\n  <meta name="vta-runtime" content="capacitor-ios">\n</head>`
);

if (!/id=["']firebaseAuthGate["'][^>]*\shidden(?:\s|>)/i.test(index)) {
  throw new Error('Native build failed: Firebase auth gate is not hidden at startup.');
}
if (/<div\s+class=["']app-layout["'][^>]*\sinert(?:\s|>)/i.test(index)) {
  throw new Error('Native build failed: app-layout is still inert at startup.');
}
if (!index.includes('native-firebase-visibility-guard')) {
  throw new Error('Native build failed: Firebase visibility guard is missing.');
}
if (!index.includes('native-navigation-recovery.js') || !index.includes('native-navigation-recovery.css')) {
  throw new Error('Native build failed: native navigation recovery assets were not injected.');
}

await writeFile(indexPath, index, 'utf8');

const metadata = {
  app: 'VTA Copilot',
  runtime: 'capacitor-ios',
  sourceRevision: gitRevision(),
  generatedAt: new Date().toISOString(),
  note: 'Generated file. Do not edit dist directly.'
};
await writeFile(join(dist, 'native-build.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

console.log(`Native web bundle ready: ${dist}`);
console.log(`Source revision: ${metadata.sourceRevision}`);
