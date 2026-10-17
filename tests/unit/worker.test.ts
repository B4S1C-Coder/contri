import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installChrome, json } from './helpers';
import { validateMessage } from '../../src/background/validation';
import { buildBrief, normalizeSaved } from '../../src/core/brief';
import { createShortlistStore } from '../../src/core/shortlist';
import { addWatched, describeChange, WATCH_LIMIT } from '../../src/background/watch';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('message validation', () => {
  it('blocks credential operations from GitHub pages', () => {
    expect(() => validateMessage({ op: 'connect', input: { token: 'x', remember: false } }, false)).toThrow(
      /not allowed/,
    );
    expect(() => validateMessage({ op: 'deviceStart', input: {} }, false)).toThrow(/not allowed/);
    expect(validateMessage({ op: 'deviceStart', input: {} }, true).op).toBe('deviceStart');
  });
  it('rejects malformed report requests', () => {
    expect(() => validateMessage({ op: 'overview', input: { repo: 'not a repo' } }, false)).toThrow(/repository/);
    expect(() => validateMessage({ op: 'insight', input: { repo: 'a/b', number: 0 } }, false)).toThrow();
    expect(() =>
      validateMessage(
        {
          op: 'issues',
          input: { repo: 'a/b', label: 'is:closed', query: '', unassigned: false, sort: 'updated', page: 1 },
        },
        false,
      ),
    ).toThrow();
    expect(() => validateMessage({ op: 'nuke', input: {} }, false)).toThrow(/not allowed/);
    expect(() => validateMessage({ op: 'repo', input: { repo: 'a/b' }, force: 'yes' }, false)).toThrow();
  });
  it('lets pages change only the widget mode and position', () => {
    expect(validateMessage({ op: 'setPrefs', input: { position: { x: 10, y: 20 } } }, false).op).toBe('setPrefs');
    expect(() => validateMessage({ op: 'setPrefs', input: { notifications: false } }, false)).toThrow(/not allowed/);
    expect(validateMessage({ op: 'setPrefs', input: { badges: 'off', notifications: false } }, true).op).toBe(
      'setPrefs',
    );
  });
  it('normalizes cache flags', () => {
    expect(validateMessage({ op: 'repo', input: { repo: 'a/b' }, cacheOnly: true }, false)).toMatchObject({
      force: false,
      cacheOnly: true,
    });
  });
});

describe('shortlist and brief', () => {
  it('only saves github.com repository and issue URLs', () => {
    expect(normalizeSaved({ repo: 'a/b', url: 'https://github.com/a/b/issues/3?x=1', title: 't', note: '' }).url).toBe(
      'https://github.com/a/b/issues/3',
    );
    expect(() => normalizeSaved({ repo: 'a/b', url: 'https://evil.com/a/b', title: '', note: '' })).toThrow();
    expect(() => normalizeSaved({ repo: 'a/b', url: 'https://github.com/c/d', title: '', note: '' })).toThrow();
  });
  it('serializes concurrent saves and keeps notes unless asked', async () => {
    let rows: Array<{ repo: string; url: string; title: string; note: string }> = [];
    const store = createShortlistStore(
      async () => rows,
      async (next) => {
        rows = next;
      },
    );
    await store.save({ repo: 'a/b', url: 'https://github.com/a/b', title: 'a/b', note: 'keep me' }, true);
    await Promise.all([
      store.save({ repo: 'a/b', url: 'https://github.com/a/b', title: 'a/b', note: '' }),
      store.save({ repo: 'a/b', url: 'https://github.com/a/b/issues/1', title: '#1', note: '' }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.url.endsWith('/a/b'))?.note).toBe('keep me');
  });
  it('builds a brief with evidence and untrusted-content guidance', () => {
    const brief = buildBrief(
      { repo: 'a/b', title: 'Crash', number: 4, url: 'https://github.com/a/b/issues/4' },
      'explain',
      {
        linkState: 'clear',
        claim: { state: 'stale', assignees: [], note: 'Claim is quiet' },
        digest: '- point one',
      },
    );
    expect(brief).toContain('No linked open PR found');
    expect(brief).toContain('Claim status: stale');
    expect(brief).toContain('- point one');
    expect(brief).toMatch(/untrusted evidence/);
  });
});

describe('watch list', () => {
  const base = { state: 'open', assignees: ['kim'], openPrs: 0, claim: 'assigned' as const };
  it('reports useful changes only', () => {
    expect(describeChange(undefined, base)).toBeNull();
    expect(describeChange(base, { ...base, assignees: [], claim: 'none' })).toMatch(/unassigned/);
    expect(describeChange({ ...base, assignees: [] }, { ...base, assignees: [], openPrs: 1 })).toMatch(/pull request/);
    expect(describeChange(base, { ...base, state: 'closed' })).toMatch(/closed/);
    expect(describeChange(base, base)).toBeNull();
  });
  it('limits anonymous watching and ignores duplicates', () => {
    let list = addWatched([], { repo: 'a/b', number: 1, title: 'one' }, WATCH_LIMIT.anonymous);
    list = addWatched(list, { repo: 'a/b', number: 1, title: 'one' }, WATCH_LIMIT.anonymous);
    expect(list).toHaveLength(1);
    list = addWatched(list, { repo: 'a/b', number: 2, title: 'two' }, WATCH_LIMIT.anonymous);
    list = addWatched(list, { repo: 'a/b', number: 3, title: 'three' }, WATCH_LIMIT.anonymous);
    expect(() => addWatched(list, { repo: 'a/b', number: 4, title: 'four' }, WATCH_LIMIT.anonymous)).toThrow(/Sign in/);
  });
});

describe('sign-in', () => {
  beforeEach(() => installChrome());

  it('keeps a token for the session only unless remembered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ login: 'safal' })),
    );
    const auth = await import('../../src/background/auth');
    const result = await auth.connect('github_pat_123', false);
    expect(result).toMatchObject({ connected: true, remembered: false, login: 'safal', method: 'token' });
    const chrome = globalThis.chrome as unknown as ReturnType<typeof installChrome>;
    expect(chrome.storage.session.dump().githubCredential).toBe('github_pat_123');
    expect(chrome.storage.local.dump().githubCredential).toBeUndefined();
    expect(chrome.storage.local.setAccessLevel).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_CONTEXTS' });
    await auth.disconnect();
    expect(await auth.getToken()).toBeUndefined();
  });

  it('rejects invalid tokens without storing them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Bad credentials' }, 401)),
    );
    const auth = await import('../../src/background/auth');
    await expect(auth.connect('nope', true)).rejects.toThrow(/invalid or expired/);
    expect(await auth.getToken()).toBeUndefined();
  });

  it('completes the device flow with no client secret', async () => {
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'Iv1.test');
    const bodies: string[] = [];
    let polls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.body) bodies.push(String(init.body));
        if (url.endsWith('/login/device/code'))
          return json({
            device_code: 'dc',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5,
          });
        if (url.endsWith('/login/oauth/access_token'))
          return json(
            ++polls === 1 ? { error: 'authorization_pending' } : { access_token: 'gho_abc', token_type: 'bearer' },
          );
        if (url.endsWith('/user')) return json({ login: 'safal' });
        return json({}, 404);
      }),
    );
    const auth = await import('../../src/background/auth');
    const start = await auth.startDeviceFlow();
    expect(start.userCode).toBe('ABCD-1234');
    expect(await auth.pollDeviceFlow(true)).toMatchObject({ status: 'pending' });
    const done = await auth.pollDeviceFlow(true);
    expect(done).toMatchObject({
      status: 'connected',
      connection: { login: 'safal', method: 'oauth', remembered: true },
    });
    expect(bodies.join('&')).not.toMatch(/client_secret/);
    expect(bodies[0]).toContain('client_id=Iv1.test');
  });
});

describe('transport', () => {
  beforeEach(() => installChrome());

  it('adds the token, tracks capacity per resource and backs off when limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ login: 'safal' })),
    );
    const auth = await import('../../src/background/auth');
    await auth.connect('tok', false);
    const seen: Array<string | null> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        seen.push(new Headers(init?.headers).get('Authorization'));
        return seen.length === 1
          ? json({}, 200, {
              'x-ratelimit-resource': 'graphql',
              'x-ratelimit-remaining': '4990',
              'x-ratelimit-reset': '9999999999',
            })
          : json({ message: 'limit' }, 429, {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600),
            });
      }),
    );
    const transport = await import('../../src/background/transport');
    await transport.authenticatedFetch('https://api.github.com/graphql');
    expect(seen[0]).toBe('Bearer tok');
    expect(transport.capacityFor('graphql').remaining).toBe(4990);
    await transport.authenticatedFetch('https://api.github.com/repos/a/b');
    await expect(transport.authenticatedFetch('https://api.github.com/repos/a/b')).rejects.toThrow(/slow down/);
    expect(seen).toHaveLength(2);
  });

  it('never runs more than two requests at once', async () => {
    let active = 0;
    let peak = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 20));
        active--;
        return json({});
      }),
    );
    const transport = await import('../../src/background/transport');
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => transport.authenticatedFetch(`https://api.github.com/x/${i}`)),
    );
    expect(peak).toBe(2);
  });
});
