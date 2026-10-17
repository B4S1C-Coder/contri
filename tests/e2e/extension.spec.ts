import { test as base, expect, chromium, type BrowserContext } from '@playwright/test';
import { resolve } from 'node:path';
import { startMockGitHub } from './mock-github';

/**
 * Loads the built extension (dist/) into Chromium and drives it on a mock GitHub.
 * Run `npm run build` first. This is the installed-extension check the 0.2 release lacked.
 */

const PORT = 8443;
const DIST = resolve('dist');

type Fixtures = { context: BrowserContext; extensionId: string; mock: ReturnType<typeof startMockGitHub> };

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  mock: async ({}, use) => {
    const mock = startMockGitHub(PORT);
    await use(mock);
    await mock.close();
  },
  context: async ({ mock }, use) => {
    void mock;
    const context = await chromium.launchPersistentContext('', {
      // CONTRI_CHROMIUM lets you run against an existing Chromium build instead of Playwright's download.
      ...(process.env.CONTRI_CHROMIUM ? { executablePath: process.env.CONTRI_CHROMIUM } : { channel: 'chromium' }),
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${DIST}`,
        `--load-extension=${DIST}`,
        `--host-resolver-rules=MAP github.com 127.0.0.1:${PORT}, MAP api.github.com 127.0.0.1:${PORT}`,
        '--ignore-certificate-errors',
        '--no-proxy-server',
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(new URL(worker.url()).host);
  },
});

const widget = '.cc-widget';

test('opens a welcome page on install', async ({ context, extensionId }) => {
  await expect
    .poll(() => context.pages().some((p) => p.url().includes(`${extensionId}/settings.html?welcome=1`)))
    .toBe(true);
});

test('shows a small launcher on repositories and real evidence when opened', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  const launcher = page.locator('.cc-launcher');
  await expect(launcher).toBeVisible();
  await expect(page.locator(widget)).toHaveCount(0);
  await launcher.click();
  await expect(page.locator(widget)).toBeVisible();
  await expect(page.locator('.cc-widget h2')).toHaveText('widgets');
  await expect(page.locator('.cc-metrics strong').first()).toHaveText('57');
  await expect(page.getByText('PRs merged · 90d')).toBeVisible();
  await expect(page.getByText('v1.2.0')).toBeVisible();
});

test('repository sidebar badge sits inside GitHub’s About box', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  const badge = page.locator('.BorderGrid-cell #contri-repo-badge');
  await expect(badge).toBeVisible();
  await expect(badge.locator('button')).toContainText('contri.');
});

test('issue badge checks availability on click and finds a stale claim', async ({ context, extensionId, mock }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  const badge = page.locator('#contri-issue-badge button');
  await expect(badge).toContainText('Can I work on this?');
  expect(mock.requests.some((r) => r.includes('/issues/7/comments'))).toBe(false);
  await badge.click();
  await expect(badge).toContainText('Claim went quiet');
  await badge.click();
  await expect(page.locator(widget)).toBeVisible();
  await expect(page.getByText('THIS ISSUE · #7')).toBeVisible();
  await expect(page.locator('.cc-insight .cc-verdict b')).toHaveText('Claim went quiet');
});

test('team analysis finds a maintainer GitHub labels as a contributor', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await page.locator('.cc-nav button', { hasText: 'Team' }).click();
  await page.getByRole('button', { name: /Analyze team responses/ }).click();
  await expect(page.locator('.cc-person', { hasText: '@quietmaint' })).toContainText('labels or assigns issues');
  await expect(page.locator('.cc-block h3').first()).toContainText('3/4 answered');
  await expect(page.locator('.cc-block .cc-metrics strong').first()).toHaveText('6h');
});

test('follows GitHub single-page navigation without reloading', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await expect(page.locator('.cc-widget h2')).toHaveText('widgets');
  await page.evaluate(() => {
    history.pushState({}, '', '/acme/widgets/issues/7');
    document.dispatchEvent(new Event('turbo:load'));
  });
  await expect(page.getByText('THIS ISSUE · #7')).toBeVisible();
});

test('signing in with a token switches to GraphQL and badges check automatically', async ({
  context,
  extensionId,
  mock,
}) => {
  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${extensionId}/settings.html`);
  await expect(settings.getByText('Connect with a personal access token')).toBeVisible();
  await settings.locator('#token').fill('github_pat_e2e');
  await settings.getByRole('button', { name: 'Connect token' }).click();
  await expect(settings.getByText(/Signed in as @tester/)).toBeVisible();

  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  await expect(page.locator('#contri-issue-badge button')).toContainText('Open PR #12');
  expect(mock.requests.some((r) => r.includes('POST /graphql'))).toBe(true);
});

test('the widget keeps the CONTRI glass theme and follows GitHub dark mode', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  const host = page.locator('#contri-widget-root');
  await expect(host).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => (document.documentElement.dataset.colorMode = 'dark'));
  await expect(host).toHaveAttribute('data-theme', 'dark');
});

test('Escape minimizes the panel and returns keyboard focus to the launcher', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await expect(page.locator(widget)).toBeVisible();
  await page.locator('.cc-nav button', { hasText: 'Team' }).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator(widget)).toHaveCount(0);
  await expect(page.locator('.cc-launcher')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator(widget)).toBeVisible();
  await expect(page.getByRole('region', { name: 'CONTRI' })).toBeVisible();
});

test('a failed request can be retried in place', async ({ context, extensionId, mock }) => {
  void extensionId;
  mock.fail('/repos/acme/widgets', 500);
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await expect(page.locator('.cc-note')).toContainText('GitHub returned 500');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.cc-widget h2')).toHaveText('widgets');
});
