import { test, expect, chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startMockGitHub } from './mock-github';
/**
 * Upgrade path from 0.3.0: a remembered sign-in was stored in plain text (and copied to
 * session storage). A new 0.3.1 service worker must seal it, drop the copy, keep the
 * user's data and still authenticate. The worker is killed over CDP, as Chrome does
 * routinely, so the next page wakes a fresh one that runs the start-up migration.
 */
const PORT = 8443;
const DEBUG_PORT = 9339;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function cdpBrowser(port: number, method: string, params: object) {
  const { webSocketDebuggerUrl } = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as {
    webSocketDebuggerUrl: string;
  };
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const reply = new Promise((r) => (ws.onmessage = (e) => r(JSON.parse(String(e.data)))));
  ws.send(JSON.stringify({ id: 1, method, params }));
  const out = await reply;
  ws.close();
  return out;
}
test('a 0.3.0 plain-text remembered token is sealed by a new 0.3.1 worker', async () => {
  test.setTimeout(90_000);
  const mock = startMockGitHub(PORT);
  const profile = mkdtempSync(join(tmpdir(), 'contri-profile-'));
  const dist = resolve(process.env.CONTRI_DIST ?? 'dist');
  const ctx = await chromium.launchPersistentContext(profile, {
    ...(process.env.CONTRI_CHROMIUM ? { executablePath: process.env.CONTRI_CHROMIUM } : { channel: 'chromium' }),
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--host-resolver-rules=MAP github.com 127.0.0.1:${PORT}, MAP api.github.com 127.0.0.1:${PORT}`,
      '--ignore-certificate-errors',
      '--no-proxy-server',
    ],
  });
  const first = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  await wait(1500);
  const id = new URL(first.url()).host;
  // Exactly what 0.3.0 left behind for a remembered sign-in: plain text in local, a copy in session.
  await first.evaluate(async () => {
    const meta = { login: 'tester', method: 'token' };
    await chrome.storage.local.set({
      githubCredential: 'github_pat_upgrade',
      githubCredentialMeta: meta,
      shortlist: [
        { repo: 'acme/widgets', url: 'https://github.com/acme/widgets', title: 'acme/widgets', note: 'keep' },
      ],
    });
    await chrome.storage.session.set({ githubCredential: 'github_pat_upgrade', githubCredentialMeta: meta });
  });
  const targets = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()) as Array<{
    id: string;
    type: string;
    url: string;
  }>;
  const sw = targets.find((t) => t.type === 'service_worker' && t.url.includes(id))!;
  await cdpBrowser(DEBUG_PORT, 'Target.closeTarget', { targetId: sw.id });
  await wait(1000);
  const s = await ctx.newPage();
  await s.goto(`chrome-extension://${id}/settings.html`); // wakes a new worker
  await expect(s.getByText(/Signed in as @tester/)).toBeVisible();
  await expect(s.getByText(/remembered on this device/)).toBeVisible();
  const worker = ctx.serviceWorkers().at(-1)!;
  const after = await worker.evaluate(async () => ({
    local: await chrome.storage.local.get(null),
    session: await chrome.storage.session.get(null),
  }));
  expect(JSON.stringify(after)).not.toContain('github_pat_upgrade');
  expect(after.local.githubCredential).toMatchObject({ v: 1 });
  expect(after.session.githubCredential).toBeUndefined();
  expect(after.local.shortlist).toHaveLength(1);
  const page = await ctx.newPage();
  await page.goto('https://github.com/acme/widgets/issues/7');
  await expect(page.locator('#contri-issue-badge button')).toContainText('Open PR #12');
  expect(mock.requests.some((r) => r.includes('POST /graphql'))).toBe(true);
  await ctx.close();
  await mock.close();
});
