import { isFresh, isPartial, ttlFor } from '../core/cache-policy';

const PREFIX = 'c2:';
const MAX_ENTRIES = 80;
const PRUNE_EVERY = 60_000;
let lastPrune = 0;

export type CacheEntry = { at: number; ttl: number; value: unknown };

export const cacheKey = (op: string, input: unknown, authed: boolean) =>
  `${PREFIX}${op}:${authed ? 'a' : 'p'}:${JSON.stringify(input)}`;

export async function readCache(key: string): Promise<CacheEntry | undefined> {
  const entry = (await chrome.storage.local.get(key))[key] as CacheEntry | undefined;
  return isFresh(entry) ? entry : undefined;
}

export async function writeCache(key: string, op: string, value: unknown) {
  await chrome.storage.local.set({
    [key]: { at: Date.now(), ttl: ttlFor(op, isPartial(value)), value } satisfies CacheEntry,
  });
  if (Date.now() - lastPrune > PRUNE_EVERY) {
    lastPrune = Date.now();
    await prune();
  }
}

async function prune() {
  const all = await chrome.storage.local.get(null);
  const entries = Object.entries(all).filter(([k]) => k.startsWith(PREFIX)) as Array<[string, CacheEntry]>;
  const expired = entries.filter(([, e]) => !isFresh(e)).map(([k]) => k);
  const fresh = entries.filter(([, e]) => isFresh(e)).sort((a, b) => b[1].at - a[1].at);
  await chrome.storage.local.remove([...expired, ...fresh.slice(MAX_ENTRIES).map(([k]) => k)]);
}

/** Removes cached reports (and legacy 0.2 cache keys). Shortlist, watchlist and settings stay. */
export async function clearCache() {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(
    Object.keys(all).filter(
      (k) =>
        k.startsWith(PREFIX) ||
        k.startsWith('v4:') ||
        k.startsWith('v3:') ||
        k.startsWith('analysis:') ||
        k.startsWith('roster:'),
    ),
  );
}

/* Team rosters are reused by issue checks so claim detection knows who maintains the repo. */
const ROSTER_TTL = 7 * 86_400_000;

export async function saveRoster(repo: string, entries: Array<{ login: string; basis: string[] }>) {
  await chrome.storage.local.set({ [`roster:${repo.toLowerCase()}`]: { at: Date.now(), entries } });
}

export async function loadRoster(repo: string) {
  const key = `roster:${repo.toLowerCase()}`;
  const stored = (await chrome.storage.local.get(key))[key] as
    { at: number; entries: Array<{ login: string; basis: string[] }> } | undefined;
  return stored && Date.now() - stored.at < ROSTER_TTL ? stored.entries : undefined;
}
