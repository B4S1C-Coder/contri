import { Resvg } from '@resvg/resvg-js';
import { writeFile, copyFile } from 'node:fs/promises';

/**
 * Regenerates the toolbar/store icons. The shipped PNGs were drawn with the Phosphor
 * "Compass" duotone glyph (MIT, see licenses/phosphor.txt); this script draws the
 * equivalent compass inline so no icon library is needed.
 */
const glyph = `
  <circle cx="44" cy="44" r="34" fill="none" stroke="#f3e8c9" stroke-width="6"/>
  <path d="M58 30 49.5 49.5 30 58 38.5 38.5z" fill="#f3e8c9" fill-opacity=".3" stroke="#f3e8c9" stroke-width="6" stroke-linejoin="round"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#58756d"/><stop offset="1" stop-color="#193a33"/></linearGradient></defs>
  <rect x="3" y="3" width="122" height="122" rx="32" fill="url(#g)" stroke="#9bb3a5" stroke-width="2"/>
  <g transform="translate(20 20)">${glyph}</g>
</svg>`;

for (const size of [16, 32, 48, 128])
  await writeFile(
    `public/icon-${size}.png`,
    new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng(),
  );
await copyFile('public/icon-32.png', 'website/dist/assets/icon-32.png');
console.log('Icons written to public/ and website/dist/assets/.');
