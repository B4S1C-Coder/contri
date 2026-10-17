import { getToken, markInvalid } from './auth';

/**
 * All GitHub traffic goes through here: it adds the token, limits concurrency,
 * tracks remaining capacity per rate-limit resource, and backs off when GitHub
 * asks it to. The back-off survives service-worker restarts.
 */

export type Capacity = { remaining?: number; limit?: number; reset?: number };

const MAX_CONCURRENT = 2;
const GAP_MS = 80;
const BLOCK_KEY = 'transportBlockedUntil';

let generation = 0;
let active = 0;
const waiting: Array<() => void> = [];
const capacity: Record<string, Capacity> = {};
let blockedUntil = 0;
let restored: Promise<void> | undefined;

const session = () => (typeof chrome !== 'undefined' ? chrome.storage?.session : undefined);

function restore() {
  restored ??= (async () => {
    try {
      const stored = (await session()?.get(BLOCK_KEY))?.[BLOCK_KEY];
      if (typeof stored === 'number') blockedUntil = Math.max(blockedUntil, stored);
    } catch {
      /* storage unavailable in tests */
    }
  })();
  return restored;
}

function block(until: number) {
  blockedUntil = Math.max(blockedUntil, until);
  void session()
    ?.set({ [BLOCK_KEY]: blockedUntil })
    .catch(() => {});
}

export function capacityFor(resource = 'core'): Capacity {
  return { ...capacity[resource] };
}

export function allCapacity() {
  return structuredClone(capacity);
}

/** Called when the signed-in account changes: in-flight work belongs to the old identity. */
export function resetTransport() {
  generation++;
  blockedUntil = 0;
  for (const key of Object.keys(capacity)) delete capacity[key];
  void session()
    ?.remove(BLOCK_KEY)
    .catch(() => {});
}

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) setTimeout(next, GAP_MS);
  else active--;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const epoch = generation;
  await restore();
  await acquire();
  try {
    if (epoch !== generation || options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (Date.now() < blockedUntil)
      throw new Error(
        `GitHub asked CONTRI to slow down. Try again after ${new Date(blockedUntil).toLocaleTimeString()}.`,
      );
    const token = await getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (epoch !== generation) throw new DOMException('Connection changed', 'AbortError');

    const resource = response.headers.get('x-ratelimit-resource') ?? 'core';
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const limit = response.headers.get('x-ratelimit-limit');
    if (remaining !== null)
      capacity[resource] = {
        remaining: Number(remaining),
        limit: limit === null ? undefined : Number(limit),
        reset: reset === null ? undefined : Number(reset),
      };
    if (response.status === 429 || (response.status === 403 && remaining === '0'))
      block(Number(reset) * 1000 || Date.now() + 60_000);
    const retryAfter = Number(response.headers.get('retry-after'));
    if (retryAfter > 0) block(Date.now() + retryAfter * 1000);
    if (response.status === 403 && remaining !== '0') {
      const body = (await response
        .clone()
        .json()
        .catch(() => ({}))) as { message?: string };
      if (/secondary rate|abuse detection/i.test(body.message ?? '')) block(Date.now() + 60_000);
    }
    if (response.status === 401 && token) {
      await markInvalid(token);
      throw new Error('Your GitHub sign-in expired or was revoked. Reconnect in Settings.');
    }
    return response;
  } finally {
    release();
  }
}
