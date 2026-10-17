import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { resolve } from 'node:path';
import { startMockGitHub } from './mock-github';

/**
 * Loads the built extension (dist/) into Chromium and drives it on a mock GitHub.
 * Run `npm run build` first. This is the installed-extension check the 0.2 release lacked.
 */

const PORT = 8443;
const DIST = resolve('dist');

type Fixtures = { context: BrowserContext; extensionId: string; mock: ReturnType<typeof startMockGitHub> };

export const test = base.extend<Fixtures>({
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

export { expect } from '@playwright/test';
