import { vi } from 'vitest';

/** Minimal in-memory `chrome.storage` for worker modules under test. */
export function installChrome() {
  const area = () => {
    let data: Record<string, unknown> = {};
    return {
      get: vi.fn(async (keys?: string | string[] | null) => {
        if (keys == null) return { ...data };
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        data = { ...data, ...items };
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
      }),
      setAccessLevel: vi.fn(async () => {}),
      dump: () => data,
    };
  };
  const chrome = { storage: { local: area(), session: area() } };
  vi.stubGlobal('chrome', chrome);
  return chrome;
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;

/** Routes fake GitHub requests; unknown URLs fail loudly so tests show every request made. */
export function fakeGitHub(routes: Route[]) {
  const calls: string[] = [];
  const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
    for (const route of routes) {
      const response = await route(url, init);
      if (response) return response;
    }
    return json({ message: `No fake for ${url.pathname}${url.search}` }, 599);
  });
  return { fetcher, calls };
}

export const DAY = 86_400_000;
export const isoAgo = (days: number, now = Date.now()) => new Date(now - days * DAY).toISOString();

export const repoJson = (full = 'acme/widgets', extra: Record<string, unknown> = {}) => ({
  full_name: full,
  name: full.split('/')[1],
  owner: { login: full.split('/')[0], type: 'Organization' },
  html_url: `https://github.com/${full}`,
  description: 'Widgets for everyone',
  private: false,
  fork: false,
  archived: false,
  disabled: false,
  pushed_at: isoAgo(1),
  stargazers_count: 1200,
  forks_count: 80,
  language: 'TypeScript',
  license: { name: 'MIT License' },
  has_issues: true,
  topics: ['widgets'],
  default_branch: 'main',
  ...extra,
});
