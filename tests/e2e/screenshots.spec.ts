import { test, chromium, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { startMockGitHub } from './mock-github';

/**
 * Regenerates the README screenshots from the real built extension on the mock GitHub.
 *   npm run build && CONTRI_SCREENSHOTS=1 npx playwright test screenshots && node scripts/webp.mjs
 */
test.skip(!process.env.CONTRI_SCREENSHOTS, 'Set CONTRI_SCREENSHOTS=1 to regenerate docs/assets screenshots.');

const OUT = resolve('docs/assets');
const DIST = resolve('dist');

test('README screenshots', async () => {
  test.setTimeout(60_000);
  const mock = startMockGitHub(8443);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1180, height: 760 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--host-resolver-rules=MAP github.com 127.0.0.1:8443, MAP api.github.com 127.0.0.1:8443',
      '--ignore-certificate-errors',
      '--no-proxy-server',
    ],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).host;
  const host = (page: Page) => page.locator('#contri-widget-root');
  const settle = async (page: Page) => {
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
  };

  const repo = await context.newPage();
  await repo.goto('https://github.com/acme/widgets');
  await repo.locator('.cc-launcher').click();
  await repo.getByText('v1.2.0').waitFor();
  await settle(repo);
  await host(repo).screenshot({ path: `${OUT}/widget-overview.png` });

  await repo.locator('.cc-nav button', { hasText: 'Team' }).click();
  await repo.getByRole('button', { name: /Analyze team responses/ }).click();
  await repo.locator('.cc-person').first().waitFor();
  await repo.locator('.cc-body').evaluate((el) => el.scrollTo(0, 120));
  await settle(repo);
  await host(repo).screenshot({ path: `${OUT}/widget-team.png` });

  await repo.evaluate(() => {
    document.documentElement.dataset.colorMode = 'dark';
    document.body.style.background = '#0d1117';
  });
  await repo.locator('.cc-nav button', { hasText: 'Overview' }).click();
  await settle(repo);
  await host(repo).screenshot({ path: `${OUT}/widget-dark.png` });

  const issue = await context.newPage();
  await issue.goto('https://github.com/acme/widgets/issues/7');
  const badge = issue.locator('#contri-issue-badge button');
  await badge.click();
  await issue.locator('#contri-issue-badge button', { hasText: 'Claim went quiet' }).waitFor();
  await settle(issue);
  await issue.screenshot({ path: `${OUT}/issue-badge.png`, clip: { x: 0, y: 0, width: 700, height: 190 } });
  await badge.click();
  await issue.locator('.cc-insight').waitFor();
  await settle(issue);
  await host(issue).screenshot({ path: `${OUT}/widget-issue.png` });

  const settings = await context.newPage();
  await settings.setViewportSize({ width: 900, height: 1100 });
  await settings.goto(`chrome-extension://${id}/settings.html`);
  await settle(settings);
  await settings.locator('.cc-settings').screenshot({ path: `${OUT}/settings.png` });

  await context.close();
  await mock.close();
});
