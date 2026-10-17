/**
 * Chrome ignores @font-face rules inside shadow roots, so fonts are declared once on
 * the page and loaded from the extension package (never inlined into the bundle).
 */
const FONTS = [
  { family: 'Contri Sans', file: 'fonts/dm-sans-400.woff2', weight: 400 },
  { family: 'Contri Sans', file: 'fonts/dm-sans-600.woff2', weight: 600 },
  { family: 'Contri Serif', file: 'fonts/caslon-display-400.woff2', weight: 400 },
];

export function installFonts() {
  if (document.getElementById('contri-fonts')) return;
  const style = document.createElement('style');
  style.id = 'contri-fonts';
  style.textContent = FONTS.map(
    (f) =>
      `@font-face{font-family:"${f.family}";src:url("${chrome.runtime.getURL(f.file)}") format("woff2");font-weight:${f.weight};font-display:swap}`,
  ).join('');
  document.head.append(style);
}
