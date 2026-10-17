import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';

/** Guards what ships to users: permissions, files, size, and no dynamic code. */
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const files = unzipSync(await readFile(`contri-v${version}.zip`));
assert.ok(files['manifest.json'], 'manifest.json must be at the zip root');
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

// Everything the manifest points at must be in the package (the Store rejects broken references).
const referenced = [
  manifest.background.service_worker,
  manifest.options_page,
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...manifest.content_scripts.flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
];
for (const f of referenced) assert.ok(files[f], `manifest references ${f}, which is not in the package`);
for (const { resources } of manifest.web_accessible_resources ?? [])
  for (const pattern of resources) {
    const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
    assert.ok(
      Object.keys(files).some((f) => re.test(f)),
      `web_accessible_resources pattern ${pattern} matches nothing`,
    );
  }

// Extension pages may only load bundled code (no remotely hosted code, MV3 policy).
for (const [name, data] of Object.entries(files).filter(([n]) => n.endsWith('.html'))) {
  const html = strFromU8(data);
  for (const [, src] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^(?:https?:)?\/\//.test(src), `${name} loads remote resource ${src}`);
    const path = src.replace(/^\.?\//, '').split('?')[0];
    assert.ok(files[path], `${name} references ${src}, which is not in the package`);
  }
}

for (const [name, data] of Object.entries(files)) {
  assert.ok(!/(\.env|node_modules|\.map$|\.git\/)/.test(name), `unexpected file ${name}`);
  if (!/\.(js|html|json|md|txt|css)$/.test(name)) continue;
  const text = strFromU8(data);
  if (name.endsWith('.js')) {
    assert.ok(!/\beval\s*\(|new Function\s*\(/.test(text), `dynamic code in ${name}`);
    assert.ok(!/\bimportScripts\s*\(|import\(\s*["'`]https?:/.test(text), `remote code loading in ${name}`);
    assert.ok(!/sourceMappingURL=/.test(text), `source map reference in ${name}`);
  }
  // Credentials must never be bundled (a public OAuth client ID is fine; a secret or token is not).
  assert.ok(
    !/\bgh[pousr]_[A-Za-z0-9]{36}\b|github_pat_[A-Za-z0-9_]{40,}|client_secret\s*[:=]\s*["'][^"']+/.test(text),
    `credential-like string in ${name}`,
  );
}

// "Sign in with GitHub" needs the OAuth App's (public) client ID in the bundled scripts.
if (!process.env.CONTRI_ALLOW_NO_OAUTH)
  assert.ok(
    Object.entries(files).some(
      ([name, data]) => name.endsWith('.js') && /Ov23li[A-Za-z0-9]{14}|Iv1\.[a-f0-9]{16}/.test(strFromU8(data)),
    ),
    'the package has no GitHub OAuth client ID: "Sign in with GitHub" would be missing (set CONTRI_ALLOW_NO_OAUTH=1 for a token-only build)',
  );

const widgetKb = files['widget.js'].length / 1024;
assert.ok(widgetKb < 150, `widget.js is ${widgetKb.toFixed(0)} KB; it runs on every GitHub page, keep it under 150 KB`);
assert.ok(!strFromU8(files['widget.js']).includes('data:font/'), 'fonts must not be inlined into widget.js');

console.log(
  `Verified ${Object.keys(files).length} files · MV3 permissions · widget.js ${widgetKb.toFixed(0)} KB · all manifest and page references bundled · no remote code, maps, dynamic code or credentials.`,
);
