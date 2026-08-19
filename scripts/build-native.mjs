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
if (!(await exists(indexPath))) throw new Error('Native build failed: dist/index.html is missing.');
if (!(await exists(join(dist, 'native-ios.css')))) throw new Error('Native build failed: native-ios.css is missing.');
if (!(await exists(join(dist, 'native-ios-detail-fixes.css')))) throw new Error('Native build failed: native-ios-detail-fixes.css is missing.');
if (!(await exists(join(dist, 'native-ios-integration.css')))) throw new Error('Native build failed: native-ios-integration.css is missing.');
if (!(await exists(join(dist, 'js/native-ui-hardening.js')))) throw new Error('Native build failed: native-ui-hardening.js is missing.');
if (!(await exists(join(dist, 'js/native-ios-integration.js')))) throw new Error('Native build failed: native-ios-integration.js is missing.');
if (!(await exists(join(dist, 'js/native-ios-deeplink.js')))) throw new Error('Native build failed: native-ios-deeplink.js is missing.');

let index = await readFile(indexPath, 'utf8');
index = index.replace(/\s*<link[^>]+rel=["']manifest["'][^>]*>\s*/i, '\n');

// Native Navigation V2: force a fresh WebKit request after each synced build
// without changing the PWA source index. The files themselves remain part of
// the shared web core and are copied into dist above.
index = index.replace(
  /navigation-enhancements\.css\?v=[^"']+/i,
  'navigation-enhancements.css?v=0.11.0-alpha.60-nav2'
);
index = index.replace(
  /js\/navigation-enhancements\.js\?v=[^"']+/i,
  'js/navigation-enhancements.js?v=0.11.0-alpha.60-nav2'
);

const appScriptPattern = /(<script\s+type=["']module["']\s+src=["']js\/app\.js[^"']*["']><\/script>)/i;
if (!appScriptPattern.test(index)) {
  throw new Error('Native build failed: app.js script tag was not found in index.html.');
}
index = index.replace(
  appScriptPattern,
  '<script src="js/native-runtime.js?v=0.11.0-alpha.58"></script>\n<script src="js/native-ui-hardening.js?v=0.11.0-alpha.58-native-ui4"></script>\n<script src="js/native-ios-integration.js?v=0.11.0-alpha.58-native-integration1"></script>\n<script src="js/native-ios-deeplink.js?v=0.11.0-alpha.58-native-integration1"></script>\n$1'
);

const firebaseAuthPattern = /<script\s+type=["']module["']\s+src=["']js\/firebase-auth\.js[^"']*["']><\/script>/i;
if (!firebaseAuthPattern.test(index)) {
  throw new Error('Native build failed: firebase-auth.js script tag was not found in index.html.');
}
index = index.replace(
  firebaseAuthPattern,
  '<script type="module" src="js/native-firebase-auth.js?v=0.11.0-alpha.57-native-auth2"></script>'
);

index = index.replace(
  '</head>',
  '  <link rel="stylesheet" href="native-ios.css?v=0.11.0-alpha.58-native-ui4">\n  <link rel="stylesheet" href="native-ios-detail-fixes.css?v=0.11.0-alpha.58-native-ui4">\n  <link rel="stylesheet" href="native-ios-integration.css?v=0.11.0-alpha.58-native-integration1">\n  <meta name="format-detection" content="telephone=yes">\n  <meta name="vta-runtime" content="capacitor-ios">\n</head>'
);
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
