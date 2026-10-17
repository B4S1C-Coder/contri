import { readdir, unlink } from 'node:fs/promises';
import sharp from 'sharp';

/** Converts freshly captured README screenshots in docs/assets to compact WebP. */
// Only screenshots become WebP. Logos and the social card stay PNG (GitHub's social preview needs PNG/JPG).
for (const file of (await readdir('docs/assets')).filter(
  (f) => /^(screenshot-|issue-badge)/.test(f) && f.endsWith('.png'),
)) {
  const path = `docs/assets/${file}`;
  await sharp(path)
    .webp({ quality: 86 })
    .toFile(path.replace(/\.png$/, '.webp'));
  await unlink(path);
  console.log(`docs/assets/${file.replace(/\.png$/, '.webp')}`);
}
