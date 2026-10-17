import { expect, test } from './fixtures';

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

test('Escape in a text field keeps the panel and what was typed', async ({ context, extensionId }) => {
  void extensionId;
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await page.locator('.cc-nav button', { hasText: 'Discover' }).click();
  const keyword = page.getByLabel('Keyword');
  await keyword.fill('accessibility');
  await keyword.press('Escape');
  await expect(page.locator(widget)).toBeVisible();
  await expect(keyword).toHaveValue('accessibility');
  await expect(keyword).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(widget)).toHaveCount(0);
  // On a checkbox (nothing to type), one Escape minimizes.
  await page.locator('.cc-launcher').click();
  await page.locator('.cc-nav button', { hasText: 'Issues' }).click();
  await page.locator('.cc-widget input[type=checkbox]').first().focus();
  await page.keyboard.press('Escape');
  await expect(page.locator(widget)).toHaveCount(0);
});

test('a failed request can be retried in place', async ({ context, extensionId, mock }) => {
  void extensionId;
  mock.fail('/repos/acme/widgets', 500);
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets');
  await page.locator('.cc-launcher').click();
  await expect(page.locator('.cc-note')).toContainText('GitHub returned 500');
  await page.getByRole('button', { name: 'Try again' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.cc-widget h2')).toHaveText('widgets');
  // Focus stayed inside the panel, so Escape still minimizes it.
  await page.keyboard.press('Escape');
  await expect(page.locator(widget)).toHaveCount(0);
});

test('a remembered sign-in is stored encrypted and still works', async ({ context, extensionId, mock }) => {
  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${extensionId}/settings.html`);
  await settings.getByLabel('Stay signed in on this device').check();
  await settings.locator('#token').fill('github_pat_remembered_e2e');
  await settings.getByRole('button', { name: 'Connect token' }).click();
  await expect(settings.getByText(/remembered on this device/)).toBeVisible();
  const worker = context.serviceWorkers()[0];
  const stored = await worker.evaluate(async () => ({
    local: await chrome.storage.local.get(null),
    session: await chrome.storage.session.get(null),
  }));
  expect(JSON.stringify(stored)).not.toContain('github_pat_remembered_e2e');
  expect(stored.local.githubCredential).toMatchObject({ v: 1 });
  expect(stored.session.githubCredential).toBeUndefined();
  const page = await context.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  await expect(page.locator('#contri-issue-badge button')).toContainText('Open PR #12');
  expect(mock.requests.some((r) => r.includes('POST /graphql'))).toBe(true);
});
