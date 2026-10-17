import sharp from 'sharp';

/**
 * Makes a transparent, white version of docs/assets/contri-logo.png (white mark on a
 * soft gradient) for use on any background. Run once after replacing the logo.
 */
const { data, info } = await sharp('docs/assets/contri-logo.png')
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;
// Estimate the background per column from the top and bottom bands (no artwork there).
const bg = [];
for (let x = 0; x < width; x++) {
  const c = [0, 0, 0];
  let n = 0;
  for (const y of [...Array(18).keys(), ...Array.from({ length: 18 }, (_, i) => height - 1 - i)]) {
    for (let k = 0; k < 3; k++) c[k] += data[(y * width + x) * 3 + k];
    n++;
  }
  bg.push(c.map((v) => v / n));
}
const out = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    let a = 0;
    for (let k = 0; k < 3; k++) a = Math.max(a, (data[i + k] - bg[x][k]) / (255 - bg[x][k]));
    a = Math.min(1, Math.max(0, (a - 0.12) / 0.8));
    out.set([255, 255, 255, Math.round(a * 255)], (y * width + x) * 4);
  }
await sharp(out, { raw: { width, height, channels: 4 } })
  .png()
  .toBuffer()
  .then((b) =>
    sharp(b)
      .trim()
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile('docs/assets/contri-logo-white.png'),
  );
// A dark version for light backgrounds.
const dark = Buffer.from(out);
for (let p = 0; p < width * height; p++) dark.set([36, 65, 59], p * 4);
await sharp(dark, { raw: { width, height, channels: 4 } })
  .png()
  .toBuffer()
  .then((b) =>
    sharp(b)
      .trim()
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile('docs/assets/contri-logo-dark.png'),
  );
console.log('docs/assets/contri-logo-white.png, docs/assets/contri-logo-dark.png');
