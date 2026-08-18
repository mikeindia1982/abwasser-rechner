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
  assert.equal(config.plugins?.CapacitorHttp?.enabled, true);
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

test('native build injects runtime before the application module', async () => {
  const build = await read('scripts/build-native.mjs');
  assert.match(build, /native-runtime\.js/);
  assert.match(build, /native-firebase-auth-adapter\.js/);
  assert.match(build, /js\\\/app\\\.js|js\\\/app\.js|js\/app/);
  assert.match(build, /runtimeDirs = \['js', 'images', 'products'\]/);
});

test('native runtime does not alter the normal web app', async () => {
  const runtime = await read('js/native-runtime.js');
  assert.match(runtime, /if \(!isNative\) return/);
  assert.match(runtime, /VTANativeRuntime/);
});
