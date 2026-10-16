import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Compass} from '@phosphor-icons/react';
import {Resvg} from '@resvg/resvg-js';
import {writeFile,copyFile} from 'node:fs/promises';
const glyph=renderToStaticMarkup(createElement(Compass,{size:88,color:'#f3e8c9',weight:'duotone'}));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#58756d"/><stop offset="1" stop-color="#193a33"/></linearGradient></defs><rect x="3" y="3" width="122" height="122" rx="32" fill="url(#g)" stroke="#9bb3a5" stroke-width="2"/><g transform="translate(20 20)">${glyph}</g></svg>`;
for(const size of [16,32,48,128])await writeFile(`public/icon-${size}.png`,new Resvg(svg,{fitTo:{mode:'width',value:size}}).render().asPng());
await copyFile('public/icon-32.png','website/dist/assets/icon-32.png');
