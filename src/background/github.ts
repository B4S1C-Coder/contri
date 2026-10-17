/**
 * Thin GitHub client used by every report. REST for anonymous use, GraphQL when
 * signed in (one GraphQL query replaces dozens of REST calls).
 */

export const API = 'https://api.github.com';
const TIMEOUT_MS = 18_000;
const MEMORY_TTL = 5 * 60_000;
const MEMORY_MAX = 200;
/** Requests kept in reserve so the user is never left at zero mid-task. */
const RESERVE = 3;

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public reset?: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
let transport: Fetcher = (url, init) => fetch(url, init);
export function setTransport(next: Fetcher) {
  transport = next;
}

const memory = new Map<string, { at: number; value: unknown }>();
export function clearMemory() {
  memory.clear();
}

function resourceOf(url: string) {
  if (url.endsWith('/graphql')) return 'graphql';
  if (url.startsWith(`${API}/search/`)) return 'search';
  return 'core';
}

export class GitHubClient {
  requests = 0;
  private remaining: Record<string, number> = {};
  private reset: Record<string, number> = {};

  constructor(private signal?: AbortSignal) {}

  /** Remaining capacity GitHub last reported for the core (REST) or graphql resource. */
  left(resource = 'core'): number | null {
    return this.remaining[resource] ?? null;
  }

  private async send(url: string, init: RequestInit = {}): Promise<Response> {
    const resource = resourceOf(url);
    const left = this.remaining[resource];
    if (resource !== 'search' && left !== undefined && left <= RESERVE)
      throw new GitHubError(
        'Keeping a small GitHub request reserve. Sign in for more capacity, or try again after the limit resets.',
        429,
        this.reset[resource],
      );
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    let response: Response;
    try {
      response = await transport(url, {
        ...init,
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: this.signal ? AbortSignal.any([this.signal, timeout]) : timeout,
      });
    } catch (error) {
      if (this.signal?.aborted) throw error;
      if (error instanceof Error && /slow down|sign-in|Connection changed|Cancelled/.test(error.message)) throw error;
      throw new GitHubError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'GitHub took too long to reply. Try again shortly.'
          : 'Unable to reach GitHub. Check your connection.',
        0,
      );
    }
    this.requests++;
    const headerResource = response.headers.get('x-ratelimit-resource') ?? resource;
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining !== null) this.remaining[headerResource] = Number(remaining);
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    if (reset) this.reset[headerResource] = reset;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      const limited =
        response.status === 429 ||
        remaining === '0' ||
        /rate limit|secondary rate|abuse detection/i.test(body.message ?? '');
      const when = reset ? ` Try after ${new Date(reset * 1000).toLocaleTimeString()}.` : ' Try again later.';
      const message = limited
        ? `GitHub request limit reached.${when} Signing in raises the limit.`
        : response.status === 404
          ? 'Not found on GitHub. It may be private, renamed or deleted.'
          : response.status === 403
            ? 'GitHub denied this request (forbidden).'
            : response.status === 409
              ? 'This repository is empty: it has no commits yet.'
              : response.status === 422
                ? 'GitHub could not run this search. Try simpler terms.'
                : `GitHub returned ${response.status}. Try again later.`;
      throw new GitHubError(message, response.status, reset || undefined);
    }
    return response;
  }

  /** GET a REST path (e.g. `/repos/o/r`). Identical paths are reused for five minutes. */
  async rest<T>(path: string): Promise<T> {
    const cached = memory.get(path);
    if (cached && Date.now() - cached.at < MEMORY_TTL) return cached.value as T;
    const value = (await (await this.send(API + path)).json()) as T;
    memory.set(path, { at: Date.now(), value });
    if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
    return value;
  }

  /** GET a REST list path, following pagination up to `maxPages`. */
  async restAll<T>(path: string, maxPages = 3): Promise<{ values: T[]; complete: boolean }> {
    const values: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const rows = await this.rest<T[]>(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      values.push(...rows);
      if (rows.length < 100) return { values, complete: true };
    }
    return { values, complete: false };
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<{ data: T; errors: string[] }> {
    const response = await this.send(`${API}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string; type?: string }> };
    const errors = (body.errors ?? []).map((e) => e.message);
    if (body.errors?.some((e) => e.type === 'RATE_LIMITED'))
      throw new GitHubError('GitHub GraphQL limit reached. Try again later.', 429);
    if (!body.data) {
      const notFound = body.errors?.some((e) => e.type === 'NOT_FOUND');
      throw new GitHubError(
        notFound
          ? 'Not found on GitHub. It may be private, renamed or deleted.'
          : errors[0] || 'GitHub GraphQL request failed.',
        notFound ? 404 : 502,
      );
    }
    return { data: body.data, errors };
  }
}

export const splitRepo = (repo: string) => {
  const [owner, name] = repo.split('/');
  return { owner, name };
};
