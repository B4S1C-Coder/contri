import { readdir, unlink } from 'node:fs/promises';
import sharp from 'sharp';

/** Converts freshly captured README screenshots in docs/assets to compact WebP. */
// The logo and the social card stay PNG (GitHub's social preview needs PNG/JPG).
const KEEP = new Set(['contri-logo.png', 'social-preview.png']);
for (const file of (await readdir('docs/assets')).filter((f) => f.endsWith('.png') && !KEEP.has(f))) {
  const path = `docs/assets/${file}`;
  await sharp(path)
    .webp({ quality: 86 })
    .toFile(path.replace(/\.png$/, '.webp'));
  await unlink(path);
  console.log(`docs/assets/${file.replace(/\.png$/, '.webp')}`);
}
