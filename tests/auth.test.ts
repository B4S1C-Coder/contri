import { expect, it, vi } from 'vitest';
it('stores a session token without exposing it in connection status and disconnects completely', async () => {
  const local: Record<string, unknown> = {}, session: Record<string, unknown> = {};
  const area = (data: Record<string, unknown>) => ({ get: async (key: string) => ({ [key]: data[key] }), set: async (value: object) => Object.assign(data, value), remove: async (key: string) => { delete data[key]; }, setAccessLevel: vi.fn(async () => {}) });
  vi.stubGlobal('chrome', { storage: { local: area(local), session: area(session) } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  const auth = await import('../src/auth');
  expect(await auth.connect('example-test-token', false)).toEqual({ connected: true, remembered: false });
  expect(local.githubCredential).toBeUndefined(); expect(session.githubCredential).toBe('example-test-token');
  await auth.connect('example-test-token', true); expect(local.githubCredential).toBe('example-test-token');
  await auth.disconnect(); expect(local.githubCredential).toBeUndefined(); expect(session.githubCredential).toBeUndefined();
  expect(await auth.getToken()).toBeUndefined();
  vi.unstubAllGlobals();
});
