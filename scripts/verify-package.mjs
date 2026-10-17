import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';

/** Guards what ships to users: permissions, files, size, and no dynamic code. */
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const files = unzipSync(await readFile(`contri-v${version}.zip`));
const manifest = JSON.parse(strFromU8(files['manifest.json']));

assert.equal(manifest.version, version, 'manifest version matches package.json');
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'alarms', 'notifications'], 'unexpected permissions');
assert.deepEqual(manifest.host_permissions, ['https://api.github.com/*', 'https://github.com/*'], 'unexpected hosts');

for (const f of [
  'widget.js',
  'background.js',
  'settings.js',
  'settings.html',
  'icon-128.png',
  'LICENSE',
  'PRIVACY.md',
  'fonts/dm-sans-400.woff2',
])
  assert.ok(files[f], `${f} missing`);
assert.ok(!files['preview.js'] && !files['index.html'], 'development preview must not ship');

for (const [name, data] of Object.entries(files)) {
  assert.ok(!/(\.env|node_modules|\.map$|\.git\/)/.test(name), `unexpected file ${name}`);
  if (name.endsWith('.js'))
    assert.ok(!/\beval\s*\(|new Function\s*\(/.test(strFromU8(data)), `dynamic code in ${name}`);
}

const widgetKb = files['widget.js'].length / 1024;
assert.ok(widgetKb < 150, `widget.js is ${widgetKb.toFixed(0)} KB; it runs on every GitHub page, keep it under 150 KB`);
assert.ok(!strFromU8(files['widget.js']).includes('data:font/'), 'fonts must not be inlined into widget.js');

console.log(
  `Verified ${Object.keys(files).length} files · MV3 permissions · widget.js ${widgetKb.toFixed(0)} KB · no preview, maps or dynamic code.`,
);
