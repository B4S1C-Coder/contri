import { GITHUB_CLIENT_ID } from '../shared/config';
import { isSealed, seal, unseal, type Sealed } from './vault';

/**
 * Credential handling. The token lives only in extension storage restricted to
 * trusted contexts (never content scripts), and is only ever sent to GitHub.
 * It is kept in exactly one place: session storage by default (in memory, forgotten
 * when the browser closes), or local storage, encrypted with AES-GCM (see vault.ts),
 * when the user chooses to stay signed in.
 */

const KEY = 'githubCredential';
const META = 'githubCredentialMeta';
const DEVICE = 'githubDeviceFlow';

export type Method = 'oauth' | 'token';
export type Connection = {
  connected: boolean;
  remembered: boolean;
  login?: string;
  method?: Method;
  /** GitHub rejected the stored credential (expired or revoked). */
  invalid?: boolean;
  oauthAvailable: boolean;
};

type Meta = { login?: string; method?: Method; invalid?: boolean };

let credential: string | undefined;
let remembered = false;
let meta: Meta = {};
let initialized: Promise<void> | undefined;

/** Credential changes run one at a time, so a late 401 can never overwrite a newer sign-in. */
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

export function initializeAuth() {
  initialized ??= exclusive(load).catch((error) => {
    // Never cache a failed start: the next call (or the next worker) tries again.
    initialized = undefined;
    throw error;
  });
  return initialized;
}

async function load() {
  // Firefox has no setAccessLevel; Chrome uses it to hide storage from content scripts.
  await chrome.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });
  await chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });
  type Stored = { [KEY]?: string | Sealed; [META]?: Meta };
  const session = (await chrome.storage.session.get([KEY, META])) as Stored;
  const local = (await chrome.storage.local.get([KEY, META])) as Stored;
  const saved = local[KEY];
  if (saved) {
    let opened: string | undefined;
    try {
      opened = typeof saved === 'string' ? saved : isSealed(saved) ? await unseal(saved) : undefined;
    } catch {
      // IndexedDB failed: stay signed out for now but keep the stored sign-in for the next start.
      credential = undefined;
      remembered = false;
      meta = {};
      retryLater();
      return;
    }
    credential = opened;
    // 0.3.0 stored remembered credentials in plain text: seal them on first start. If that
    // fails, keep the sign-in working and try again on the next start.
    if (typeof saved === 'string')
      await seal(saved)
        .then((sealed) => chrome.storage.local.set({ [KEY]: sealed }))
        .catch(retryLater);
    if (credential) {
      remembered = true;
      meta = local[META] ?? {};
    } else {
      // The key is gone (for example, extension data was partly cleared): sign out cleanly.
      await chrome.storage.local.remove([KEY, META]);
      remembered = false;
      meta = {};
    }
    // 0.3.0 also kept a session copy of remembered credentials; keep a single copy.
    if (session[KEY]) await chrome.storage.session.remove([KEY, META]);
  } else {
    credential = typeof session[KEY] === 'string' ? session[KEY] : undefined;
    remembered = false;
    meta = session[META] ?? {};
  }
}

const RETRY_AFTER_MS = 30_000;
/** After a storage failure, run the start-up checks again on the first call 30 seconds later. */
function retryLater() {
  setTimeout(() => (initialized = undefined), RETRY_AFTER_MS);
}

export async function getToken() {
  await initializeAuth();
  return credential;
}

export async function connection(): Promise<Connection> {
  await initializeAuth();
  return {
    connected: Boolean(credential),
    remembered,
    login: credential ? meta.login : undefined,
    method: credential ? meta.method : undefined,
    invalid: credential ? Boolean(meta.invalid) : undefined,
    oauthAvailable: Boolean(GITHUB_CLIENT_ID),
  };
}

async function identify(token: string): Promise<string> {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'This token is invalid or expired.'
        : 'GitHub could not validate this sign-in. Check its status and try again.',
    );
  const user = (await response.json()) as { login?: string };
  return user.login ?? '';
}

const areaFor = (remember: boolean) => (remember ? chrome.storage.local : chrome.storage.session);

async function store(token: string, remember: boolean, method: Method) {
  const login = await identify(token);
  const nextMeta: Meta = { login, method };
  const value = remember
    ? await seal(token).catch(() => {
        throw new Error('This browser could not save the sign-in on this device. Try again without “Stay signed in”.');
      })
    : token;
  await exclusive(async () => {
    await areaFor(!remember).remove([KEY, META]);
    await areaFor(remember).set({ [KEY]: value, [META]: nextMeta });
    credential = token;
    remembered = remember;
    meta = nextMeta;
  });
  return connection();
}

/** Fine-grained personal access token (public repositories, read-only). */
export async function connect(token: string, remember: boolean) {
  await initializeAuth();
  token = token.trim();
  if (!token || token.length > 512 || /\s/.test(token)) throw new Error('Paste a valid GitHub token.');
  return store(token, remember, 'token');
}

/** Called when GitHub answers 401 for the stored credential, so Settings can ask the user to reconnect. */
export async function markInvalid(token: string) {
  await setInvalid(token, true);
}

/** A later successful request with the same credential clears the flag (for example after a GitHub outage). */
export async function markValid(token: string) {
  await setInvalid(token, false);
}

async function setInvalid(token: string, invalid: boolean) {
  await initializeAuth();
  if (credential !== token || Boolean(meta.invalid) === invalid) return;
  await exclusive(async () => {
    if (credential !== token || Boolean(meta.invalid) === invalid) return;
    meta = { ...meta, invalid };
    await areaFor(remembered).set({ [META]: meta });
  });
}

export async function disconnect() {
  await initializeAuth().catch(() => {});
  await exclusive(async () => {
    await chrome.storage.session.remove([KEY, META, DEVICE]);
    await chrome.storage.local.remove([KEY, META]);
    credential = undefined;
    remembered = false;
    meta = {};
  });
  return connection();
}

/* ---------- OAuth device flow (no backend, no client secret) ---------- */

export type DeviceStart = { userCode: string; verificationUri: string; expiresAt: number; interval: number };
type DeviceState = { deviceCode: string; interval: number; expiresAt: number };

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw new Error(`GitHub sign-in is unavailable right now (${response.status}).`);
  return (await response.json()) as T;
}

export async function startDeviceFlow(): Promise<DeviceStart> {
  await initializeAuth();
  if (!GITHUB_CLIENT_ID) throw new Error('This build has no GitHub sign-in configured. Use a token instead.');
  // No scopes: the token can read public data only.
  const result = await postForm<{
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
    error_description?: string;
  }>('https://github.com/login/device/code', { client_id: GITHUB_CLIENT_ID, scope: '' });
  if (!result.device_code || !result.user_code)
    throw new Error(result.error_description || 'GitHub did not start sign-in. Try again.');
  const state: DeviceState = {
    deviceCode: result.device_code,
    interval: Math.max(5, result.interval ?? 5),
    expiresAt: Date.now() + (result.expires_in ?? 900) * 1000,
  };
  await chrome.storage.session.set({ [DEVICE]: state });
  return {
    userCode: result.user_code,
    verificationUri: result.verification_uri ?? 'https://github.com/login/device',
    expiresAt: state.expiresAt,
    interval: state.interval,
  };
}

export type DevicePoll =
  | { status: 'pending' | 'slow_down'; interval: number }
  | { status: 'expired' | 'denied' | 'idle' }
  | { status: 'error'; message: string }
  | { status: 'connected'; connection: Connection };

/** One poll per call; the Settings page drives the timer so a sleeping worker cannot lose it. */
export async function pollDeviceFlow(remember: boolean): Promise<DevicePoll> {
  await initializeAuth();
  const state = (await chrome.storage.session.get(DEVICE))[DEVICE] as DeviceState | undefined;
  if (!state) return { status: 'idle' };
  if (Date.now() > state.expiresAt) {
    await chrome.storage.session.remove(DEVICE);
    return { status: 'expired' };
  }
  const result = await postForm<{
    access_token?: string;
    error?: string;
    error_description?: string;
    interval?: number;
  }>('https://github.com/login/oauth/access_token', {
    client_id: GITHUB_CLIENT_ID,
    device_code: state.deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });
  if (result.access_token) {
    await chrome.storage.session.remove(DEVICE);
    return { status: 'connected', connection: await store(result.access_token, remember, 'oauth') };
  }
  switch (result.error) {
    case 'slow_down': {
      const interval = Math.max(state.interval + 5, result.interval ?? 0);
      await chrome.storage.session.set({ [DEVICE]: { ...state, interval } });
      return { status: 'slow_down', interval };
    }
    case 'expired_token':
      await chrome.storage.session.remove(DEVICE);
      return { status: 'expired' };
    case 'access_denied':
      await chrome.storage.session.remove(DEVICE);
      return { status: 'denied' };
    case 'authorization_pending':
      return { status: 'pending', interval: state.interval };
    default:
      // e.g. device_flow_disabled, incorrect_client_credentials: polling again cannot succeed.
      await chrome.storage.session.remove(DEVICE);
      return {
        status: 'error',
        message: `GitHub could not complete sign-in${result.error ? ` (${result.error})` : ''}. Use a token instead, or try again later.`,
      };
  }
}
