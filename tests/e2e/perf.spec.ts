import { test, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { startMockGitHub } from './mock-github';

/**
 * Measures what the content script costs on GitHub pages, with Chrome's CDP performance
 * metrics: script and task time at load, heap, DOM nodes, and work done while idle.
 * Compares no extension, an optional baseline build and the current dist/ (median of 3).
 *   CONTRI_PERF=1 [CONTRI_BASELINE=../other-checkout/dist] npx playwright test perf
 */
test.skip(!process.env.CONTRI_PERF, 'Set CONTRI_PERF=1 to run the performance measurement.');

const PORT = 8443;
const IDLE_MS = 20_000;

async function measure(dist: string | null, path: string) {
  const mock = startMockGitHub(PORT);
  const args = [
    `--host-resolver-rules=MAP github.com 127.0.0.1:${PORT}, MAP api.github.com 127.0.0.1:${PORT}`,
    '--ignore-certificate-errors',
    '--no-proxy-server',
  ];
  if (dist) args.unshift(`--disable-extensions-except=${dist}`, `--load-extension=${dist}`);
  const context = await chromium.launchPersistentContext('', {
    ...(process.env.CONTRI_CHROMIUM ? { executablePath: process.env.CONTRI_CHROMIUM } : { channel: 'chromium' }),
    headless: true,
    ignoreHTTPSErrors: true,
    args,
  });
  if (dist && !context.serviceWorkers().length) await context.waitForEvent('serviceworker');
  await new Promise((r) => setTimeout(r, 1500));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.goto(`https://github.com${path}`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  const loaded = await metrics();
  const api = () => mock.requests.filter((r) => r.startsWith('api.github.com')).length;
  const before = api();
  await page.waitForTimeout(IDLE_MS);
  const idle = await metrics();
  const idleRequests = api() - before;
  await context.close();
  await mock.close();
  return {
    loadScriptMs: loaded.ScriptDuration * 1000,
    heapMB: loaded.JSHeapUsedSize / 1e6,
    nodes: loaded.Nodes,
    idleScriptMs: (idle.ScriptDuration - loaded.ScriptDuration) * 1000,
    idleTaskMs: (idle.TaskDuration - loaded.TaskDuration) * 1000,
    idleRequests,
  };
}

test('content-script cost on GitHub pages', async () => {
  test.setTimeout(900_000);
  const variants: Array<[string, string | null]> = [['no extension', null]];
  if (process.env.CONTRI_BASELINE) variants.push(['baseline', resolve(process.env.CONTRI_BASELINE)]);
  variants.push(['current', resolve('dist')]);
  for (const [path, label] of [
    ['/acme/widgets', 'repository page'],
    ['/', 'dashboard (no repository)'],
  ] as const)
    for (const [name, dist] of variants) {
      const runs: Array<Awaited<ReturnType<typeof measure>>> = [];
      for (let i = 0; i < 3; i++) runs.push(await measure(dist, path));
      const median = (key: keyof (typeof runs)[number]) =>
        runs
          .map((r) => r[key])
          .sort((a, b) => a - b)[1]
          .toFixed(2);
      console.log(
        `${label} · ${name}: load script ${median('loadScriptMs')} ms · heap ${median('heapMB')} MB · DOM nodes ${median('nodes')} · idle ${IDLE_MS / 1000}s script ${median('idleScriptMs')} ms, tasks ${median('idleTaskMs')} ms · idle API requests ${median('idleRequests')}`,
      );
    }
});
