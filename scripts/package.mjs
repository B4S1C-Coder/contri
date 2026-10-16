import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
const entries = {};
async function visit(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) await visit(path);
    else entries[relative('dist', path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path));
  }
}
await visit('dist');
// Preview-only entries are not needed in the installable package.
delete entries['index.html'];delete entries['preview.js'];
for (const file of await readdir('licenses')) entries[`licenses/${file}`]=new Uint8Array(await readFile(join('licenses',file)));
entries['LICENSE']=new Uint8Array(await readFile('LICENSE'));
entries['PRIVACY.md']=new Uint8Array(await readFile('PRIVACY.md'));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const name = `contri-v${version}.zip`;
const bytes = zipSync(entries);
await writeFile(name, bytes);
await writeFile(`${name}.sha256`, `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
console.log(`Created ${name}`);
