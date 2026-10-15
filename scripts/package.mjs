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
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const name = `contributor-compass-v${version}.zip`;
const bytes = zipSync(entries);
await writeFile(name, bytes);
await writeFile(`${name}.sha256`, `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
console.log(`Created ${name}`);
