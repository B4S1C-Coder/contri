import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import sharp from 'sharp';

/**
 * Measures WCAG AA text contrast over the translucent glass, which axe cannot do:
 * it screenshots each view with text hidden, samples the real pixels behind every
 * visible text element (darkest and lightest 5%), and compares them with the text
 * colour. Opt-in because it is slower: CONTRI_CONTRAST=1 npx playwright test contrast
 */
test.skip(!process.env.CONTRI_CONTRAST, 'Set CONTRI_CONTRAST=1 to run the contrast audit.');

const lum = (c: number[]) => {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Returns every visible text element below WCAG AA contrast inside `rootSel` (piercing shadow roots). */
async function measure(page: Page, rootSel: string): Promise<string[]> {
  // Collect text-bearing elements inside root (piercing shadow roots).
  const items = await page.evaluate((rootSel) => {
    const out: Array<{
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      bg: string;
      size: number;
      weight: number;
      opacity: number;
    }> = [];
    const roots: Array<Element | ShadowRoot> = [];
    const host = document.querySelector(rootSel);
    if (!host) return out;
    roots.push(host.shadowRoot ?? host);
    const walk = (node: Element | ShadowRoot) => {
      for (const el of Array.from(node.querySelectorAll('*'))) {
        if ((el as Element).shadowRoot) walk((el as Element).shadowRoot!);
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3 && n.textContent!.trim())
          .map((n) => n.textContent!.trim())
          .join(' ');
        if (!own) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if ((el as HTMLButtonElement).disabled) continue;
        // Only text actually visible inside every scrolling ancestor.
        let clip: Element | null = el.parentElement;
        let visible = true;
        while (clip) {
          const o = getComputedStyle(clip).overflowY;
          if (o === 'auto' || o === 'scroll' || o === 'hidden') {
            const c = clip.getBoundingClientRect();
            if (r.top < c.top || r.bottom > c.bottom) {
              visible = false;
              break;
            }
          }
          clip = clip.parentElement;
        }
        if (!visible || r.bottom > innerHeight || r.top < 0) continue;
        let op = 1;
        let e: Element | null = el;
        while (e) {
          op *= Number(getComputedStyle(e).opacity);
          e = e.parentElement ?? (e.getRootNode() as ShadowRoot).host ?? null;
        }
        out.push({
          text: own.slice(0, 40),
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          color: cs.color,
          bg: cs.backgroundColor,
          size: parseFloat(cs.fontSize),
          weight: Number(cs.fontWeight),
          opacity: op,
        });
      }
    };
    walk(roots[0]);
    return out;
  }, rootSel);
  // Hide text, screenshot background.
  await page.evaluate((rootSel) => {
    const host = document.querySelector(rootSel)!;
    const s = document.createElement('style');
    s.id = '__hide';
    s.textContent =
      '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} svg{visibility:hidden!important}';
    (host.shadowRoot ?? document.head).append(s);
    document.querySelectorAll('[data-contri=badge]').forEach((b) => {
      const t = s.cloneNode(true);
      b.shadowRoot?.append(t);
    });
  }, rootSel);
  const png = await page.screenshot();
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((e) => e.shadowRoot?.querySelectorAll('#__hide').forEach((x) => x.remove()));
    document.getElementById('__hide')?.remove();
  });
  const img = sharp(png);
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  const ch = meta.channels!;
  const W = meta.width!;
  const dpr = W / 1280;
  const fails: string[] = [];
  let checked = 0;
  for (const it of items) {
    const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(it.color);
    if (!m) continue;
    const alpha = (m[4] === undefined ? 1 : Number(m[4])) * it.opacity;
    const px: number[][] = [];
    // Inset past borders and rounded corners so only the fill behind the glyphs is sampled.
    const ix = it.w > 12 ? 4 : 1,
      iy = it.h > 12 ? 3 : 1;
    for (let yy = Math.floor((it.y + iy) * dpr); yy < (it.y + it.h - iy) * dpr; yy += 2)
      for (let xx = Math.floor((it.x + ix) * dpr); xx < (it.x + it.w - ix) * dpr; xx += 2) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= meta.height!) continue;
        const i = (yy * W + xx) * ch;
        px.push([raw[i], raw[i + 1], raw[i + 2]]);
      }
    // An opaque fill of its own (e.g. the active tab pill) is the real background.
    const own = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(it.bg);
    if (own) px.splice(0, px.length, [Number(own[1]), Number(own[2]), Number(own[3])]);
    if (!px.length) continue;
    // worst case: lightest and darkest bg samples (5th/95th percentile of luminance)
    px.sort((a, b) => lum(a) - lum(b));
    const lo = px[Math.floor(px.length * 0.05)],
      hi = px[Math.floor(px.length * 0.95)];
    const fg = (bg: number[]) => [0, 1, 2].map((k) => Number(m[k + 1]) * alpha + bg[k] * (1 - alpha));
    const r = Math.min(ratio(fg(lo), lo), ratio(fg(hi), hi));
    const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700);
    const need = large ? 3 : 4.5;
    checked++;
    if (r < need) fails.push(`${r.toFixed(2)}:1 < ${need}:1 · ${it.size}px · "${it.text}"`);
  }
  if (!checked) fails.push('no text measured');
  return fails;
}

test('text in the badge, every panel section and Settings meets WCAG AA contrast', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  await page.locator('#contri-issue-badge button').waitFor();
  expect(await measure(page, '#contri-issue-badge'), 'issue badge').toEqual([]);
  await page.locator('.cc-launcher').click();
  await expect(page.getByText('THIS ISSUE · #7')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await measure(page, '#contri-widget-root'), 'issues').toEqual([]);
  for (const tab of ['Overview', 'Team', 'Discover']) {
    await page.locator('.cc-nav button', { hasText: tab }).click();
    if (tab === 'Team') await page.getByRole('button', { name: /Analyze team responses/ }).click();
    await page.waitForTimeout(1200);
    expect(await measure(page, '#contri-widget-root'), tab).toEqual([]);
  }
  await page.evaluate(() => {
    document.documentElement.dataset.colorMode = 'dark';
    document.body.style.background = '#0d1117';
  });
  await page.locator('.cc-nav button', { hasText: 'Overview' }).click();
  await page.waitForTimeout(1200);
  expect(await measure(page, '#contri-widget-root'), 'overview dark').toEqual([]);
  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${extensionId}/settings.html`);
  await settings.waitForTimeout(800);
  expect(await measure(settings, 'body'), 'settings').toEqual([]);
});
