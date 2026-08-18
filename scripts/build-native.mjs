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
if (!(await exists(join(dist, 'js/native-ui-hardening.js')))) throw new Error('Native build failed: native-ui-hardening.js is missing.');

let index = await readFile(indexPath, 'utf8');
index = index.replace(/\s*<link[^>]+rel=["']manifest["'][^>]*>\s*/i, '\n');

const appScriptPattern = /(<script\s+type=["']module["']\s+src=["']js\/app\.js[^"']*["']><\/script>)/i;
if (!appScriptPattern.test(index)) {
  throw new Error('Native build failed: app.js script tag was not found in index.html.');
}
index = index.replace(
  appScriptPattern,
  '<script src="js/native-runtime.js?v=0.11.0-alpha.57"></script>\n<script src="js/native-ui-hardening.js?v=0.11.0-alpha.57-native-ui2"></script>\n$1'
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
  '  <link rel="stylesheet" href="native-ios.css?v=0.11.0-alpha.57-native-ui2">\n  <meta name="format-detection" content="telephone=yes">\n  <meta name="vta-runtime" content="capacitor-ios">\n</head>'
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