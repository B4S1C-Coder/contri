import { getToken } from './auth';
let generation = 0;
let tail: Promise<unknown> = Promise.resolve();
let blockedUntil = 0;
let state: { remaining?: number; reset?: number } = {};
export function capacity() { return { ...state }; }
export function resetTransport() { generation++; blockedUntil = 0; state = {}; }
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const epoch = generation;
  const task = tail.catch(() => {}).then(async () => {
    if (epoch !== generation || options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (Date.now() < blockedUntil) throw new Error(`GitHub is cooling down. Retry after ${new Date(blockedUntil).toLocaleTimeString()}.`);
    const token = await getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (epoch !== generation) throw new DOMException('Connection changed', 'AbortError');
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    if (remaining !== null) state.remaining = Number(remaining);
    if (reset !== null) state.reset = Number(reset);
    if (response.status === 429 || (response.status === 403 && remaining === '0')) blockedUntil = Number(reset) * 1000 || Date.now() + 60000;
    const retry = Number(response.headers.get('retry-after'));
    if (retry > 0) blockedUntil = Math.max(blockedUntil, Date.now() + retry * 1000);
    if (response.status === 403 && remaining !== '0') {
      const body = await response.clone().json().catch(() => ({}));
      if (/secondary rate|abuse detection/i.test(body.message || '')) blockedUntil = Math.max(blockedUntil, Date.now() + 60000);
    }
    if (response.status === 401) throw new Error('Your GitHub token is invalid or expired. Reconnect in Settings.');
    return response;
  });
  tail = task.then(() => new Promise(resolve => setTimeout(resolve, 150)), () => {});
  return task;
}
