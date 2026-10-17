import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

/**
 * Automated WCAG 2.2 A/AA checks with axe-core on the installed extension.
 * axe cannot compute contrast over translucent glass, so contrast is measured
 * separately by contrast.spec.ts (CONTRI_CONTRAST=1 npm run test:e2e -- contrast).
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const violations = async (builder: AxeBuilder) =>
  (await builder.withTags(TAGS).analyze()).violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );

test('the issue badge and every panel section pass axe', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  await page.locator('#contri-issue-badge button').waitFor();
  expect(await violations(new AxeBuilder({ page }).include('#contri-issue-badge'))).toEqual([]);
  await page.locator('.cc-launcher').click();
  await expect(page.getByText('THIS ISSUE · #7')).toBeVisible();
  expect(await violations(new AxeBuilder({ page }).include('#contri-widget-root'))).toEqual([]);
  for (const tab of ['Overview', 'Team', 'Discover']) {
    await page.locator('.cc-nav button', { hasText: tab }).click();
    await expect(page.locator('.cc-nav button[aria-current=page]')).toHaveText(tab);
    await page.waitForTimeout(400);
    expect(await violations(new AxeBuilder({ page }).include('#contri-widget-root')), tab).toEqual([]);
  }
  await page.evaluate(() => (document.documentElement.dataset.colorMode = 'dark'));
  await expect(page.locator('#contri-widget-root')).toHaveAttribute('data-theme', 'dark');
  expect(await violations(new AxeBuilder({ page }).include('#contri-widget-root')), 'dark').toEqual([]);
});

test('the settings and welcome page pass axe', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html?welcome=1`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await violations(new AxeBuilder({ page }))).toEqual([]);
});

test('hovering a cream button or the active tab keeps its cream fill', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  const background = (selector: string) =>
    page.evaluate(
      (s) =>
        getComputedStyle(document.querySelector('#contri-widget-root')!.shadowRoot!.querySelector(s)!).backgroundColor,
      selector,
    );
  const active = page.locator('.cc-nav button[aria-current=page]');
  await active.hover();
  expect(await background('.cc-nav button[aria-current=page]')).toBe('rgb(248, 245, 233)');
  const primary = page.locator('.cc-primary', { hasText: 'Find an issue' });
  await primary.hover();
  expect(await background('.cc-primary')).toBe('rgb(255, 252, 239)');
});
