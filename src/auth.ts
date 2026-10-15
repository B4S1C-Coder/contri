const KEY = 'githubCredential';
export type Connection = { connected: boolean; remembered: boolean; remaining?: number; reset?: number };
let credential: string | undefined;
let remembered = false;
let initialized: Promise<void> | undefined;
export async function initializeAuth() {
  if (!initialized) initialized = (async () => {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    const session = await chrome.storage.session.get(KEY);
    const local = await chrome.storage.local.get(KEY);
    credential = session[KEY] || local[KEY] || undefined;
    remembered = Boolean(local[KEY]);
  })();
  return initialized;
}
export async function getToken() { await initializeAuth(); return credential; }
export async function connection(): Promise<Connection> { await initializeAuth(); return { connected: Boolean(credential), remembered }; }
export async function connect(token: string, remember: boolean) {
  await initializeAuth();
  token = token.trim();
  if (!token || token.length > 512 || /\s/.test(token)) throw new Error('Paste a valid GitHub token.');
  const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(response.status === 401 ? 'This token is invalid or expired.' : 'GitHub could not validate this token. Check its status and try again.');
  await chrome.storage.local.remove(KEY);
  await chrome.storage.session.set({ [KEY]: token });
  if (remember) await chrome.storage.local.set({ [KEY]: token });
  credential = token; remembered = remember;
  return connection();
}
export async function disconnect() {
  await initializeAuth();
  await chrome.storage.session.remove(KEY); await chrome.storage.local.remove(KEY);
  credential = undefined; remembered = false;
  return connection();
}
