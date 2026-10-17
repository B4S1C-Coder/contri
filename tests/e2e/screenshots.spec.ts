import { test, chromium, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startMockGitHub } from './mock-github';

/**
 * Regenerates README / store screenshots (1280×800) and the social preview card
 * (1280×640) from the real built extension running on the GitHub-like mock pages.
 *   npm run build && npm run screenshots
 */
test.skip(!process.env.CONTRI_SCREENSHOTS, 'Set CONTRI_SCREENSHOTS=1 to regenerate docs/assets screenshots.');

const OUT = resolve('docs/assets');
const DIST = resolve('dist');

test('README screenshots and social card', async () => {
  test.setTimeout(90_000);
  const mock = startMockGitHub(8443);
  const context = await chromium.launchPersistentContext('', {
    ...(process.env.CONTRI_CHROMIUM ? { executablePath: process.env.CONTRI_CHROMIUM } : { channel: 'chromium' }),
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--host-resolver-rules=MAP github.com 127.0.0.1:8443, MAP api.github.com 127.0.0.1:8443',
      '--ignore-certificate-errors',
      '--no-proxy-server',
    ],
  });
  await (context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker'));
  const settle = async (page: Page) => {
    await page.mouse.move(640, 60);
    await page.waitForTimeout(600);
  };
  const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

  // 1. Issue page: inline badge + availability details.
  const issue = await context.newPage();
  await issue.goto('https://github.com/acme/widgets/issues/7');
  const badge = issue.locator('#contri-issue-badge button');
  await badge.click();
  await issue.locator('#contri-issue-badge button', { hasText: 'Claim went quiet' }).waitFor();
  await settle(issue);
  await issue.screenshot({ path: `${OUT}/issue-badge.png`, clip: { x: 0, y: 90, width: 860, height: 150 } });
  await badge.click();
  await issue.locator('.cc-insight').waitFor();
  await settle(issue);
  await shot(issue, 'screenshot-issue');

  // 2. Repository overview.
  const repo = await context.newPage();
  await repo.goto('https://github.com/acme/widgets');
  await repo.locator('.cc-launcher').click();
  await repo.getByText('v1.2.0').waitFor();
  await settle(repo);
  await shot(repo, 'screenshot-overview');

  // 3. Team responses.
  await repo.locator('.cc-nav button', { hasText: 'Team' }).click();
  await repo.getByRole('button', { name: /Analyze team responses/ }).click();
  await repo.locator('.cc-person').first().waitFor();
  await settle(repo);
  await shot(repo, 'screenshot-team');

  // 4. GitHub dark mode.
  await repo.evaluate(() => (document.documentElement.dataset.colorMode = 'dark'));
  await repo.locator('.cc-nav button', { hasText: 'Overview' }).click();
  await repo.getByText('v1.2.0').waitFor();
  await settle(repo);
  await shot(repo, 'screenshot-dark');

  // 5. Social preview card for GitHub (Settings → Social preview).
  const logo = readFileSync(resolve('docs/assets/contri-logo-white.png')).toString('base64');
  const font = (file: string) => readFileSync(resolve(`public/fonts/${file}`)).toString('base64');
  const widget = await repo.locator('#contri-widget-root').screenshot();
  await repo.evaluate(() => (document.documentElement.dataset.colorMode = 'light'));
  const card = await context.newPage();
  await card.setViewportSize({ width: 1280, height: 640 });
  await card.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Contri;src:url(data:font/woff2;base64,${font('dm-sans-400.woff2')});font-weight:400}
    @font-face{font-family:Contri;src:url(data:font/woff2;base64,${font('dm-sans-600.woff2')});font-weight:600}
    </style></head><body style="margin:0">
    <div style="width:1280px;height:640px;display:flex;align-items:center;gap:40px;padding:0 70px;box-sizing:border-box;
      background:linear-gradient(120deg,#a9bdbf,#bfcac6 55%,#c9cfc6);font-family:Contri,Arial,sans-serif;color:#fff">
      <div style="flex:1">
        <img src="data:image/png;base64,${logo}" style="width:400px;display:block;margin-bottom:26px" />
        <div style="font-size:50px;font-weight:600;line-height:1.1;letter-spacing:-1.8px;margin:6px 0 22px;color:#24413b">
          Find open-source issues<br/>you can actually take.</div>
        <div style="font-size:22px;line-height:1.6;color:#2f4c46">Project activity · maintainer reply times<br/>claims &amp; linked PRs — right on GitHub.</div>
        <div style="margin-top:26px;display:inline-block;background:#24413b;color:#f3f6ee;border-radius:30px;padding:10px 22px;font-size:20px">
          Free &amp; open source · github.com/alphasafal/contri</div>
      </div>
      <img src="data:image/png;base64,${widget.toString('base64')}" style="height:560px;border-radius:24px;box-shadow:0 30px 60px #1f3a3455" />
    </div></body></html>`);
  await card.waitForTimeout(400);
  await card.screenshot({ path: `${OUT}/social-preview.png` });

  await context.close();
  await mock.close();
});
