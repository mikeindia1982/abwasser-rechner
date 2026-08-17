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

for (const path of ['package.json', 'capacitor.config.json', 'scripts/build-native.mjs', 'js/native-runtime.js', 'index.html']) {
  report(await exists(join(root, path)), `Required file: ${path}`);
}

try {
  const config = JSON.parse(await readFile(join(root, 'capacitor.config.json'), 'utf8'));
  report(config.webDir === 'dist', 'Capacitor webDir is dist', config.webDir || 'missing');
  report(Boolean(config.appId), 'Capacitor appId configured', config.appId || 'missing');
} catch (error) {
  report(false, 'Capacitor config is valid JSON', error.message);
}

const nodeModules = await exists(join(root, 'node_modules'));
checks.push({ ok: nodeModules, warning: true, label: 'npm dependencies installed', detail: nodeModules ? 'yes' : 'run npm install' });

const distIndex = await exists(join(root, 'dist', 'index.html'));
checks.push({ ok: distIndex, warning: true, label: 'Native dist build exists', detail: distIndex ? 'yes' : 'run npm run native:build' });

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
