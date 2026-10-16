import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const files=unzipSync(await readFile(`contri-v${version}.zip`));
const manifest=JSON.parse(strFromU8(files['manifest.json']));
assert.equal(manifest.version,version);assert.equal(manifest.manifest_version,3);
assert.deepEqual(manifest.permissions,['storage','scripting','activeTab']);
assert.deepEqual(manifest.host_permissions,['https://api.github.com/*','https://github.com/*']);
for(const f of ['widget.js','background.js','settings.js','settings.html','icon-128.png','LICENSE','PRIVACY.md'])assert.ok(files[f],`${f} missing`);
assert.ok(!files['preview.js']);assert.ok(!files['index.html']);
for(const name of Object.keys(files)){assert.ok(!/(\.env|node_modules|\.map$|\.git\/)/.test(name),`Unexpected file ${name}`);if(name.endsWith('.js'))assert.ok(!/\beval\s*\(|new Function\s*\(/.test(strFromU8(files[name])),`Dynamic code in ${name}`);}
vm.runInNewContext(strFromU8(files['widget.js']),{document:{getElementById:()=>({})}},{timeout:5000});
console.log(`Verified ${Object.keys(files).length} packaged files, MV3 permissions, no preview entries or dynamic code, and duplicate-host bundle startup.`);
