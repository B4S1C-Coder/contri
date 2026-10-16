import { activity, compareActivity, firstTeamReply, isBot, isOutside, isTeam, opportunities, parseRepo, responseSummary, type Issue, type Pull, type Reply } from './metrics';

export type Repository = {
  full_name: string; name: string; html_url: string; description: string | null; private: boolean;
  fork: boolean; archived: boolean; disabled: boolean; pushed_at: string | null; stargazers_count: number;
  has_issues?: boolean; license?: { name: string; html_url?: string } | null;
};
type CommunityFile = { html_url: string } | null;
type Community = { files?: { readme?: CommunityFile; license?: CommunityFile; contributing?: CommunityFile; code_of_conduct?: CommunityFile; issue_template?: CommunityFile; pull_request_template?: CommunityFile } };
type Commit = { author?: { login: string; type?: string } | null; commit: { author?: { date?: string } } };
type EvidenceReply = Reply & { html_url?: string; kind?: string };
export type Analysis = {
  version: 2; repo: Repository; activity: ReturnType<typeof activity>; response: ReturnType<typeof responseSummary>;
  samples: Array<{ pull: Pull; hours: number | null; responder?: string; url?: string; kind?: string }>;
  issues: Issue[]; community: Community | null; fetchedAt: string;
  limited: { pulls: boolean; commits: boolean; issues: boolean };
  availability: { pulls: boolean; commits: boolean; issues: boolean; community: boolean };
  warnings: string[]; requests: number; rateRemaining: number | null;
};
let transport: typeof fetch = (...args) => fetch(...args);
export function setTransport(next: typeof fetch) { transport = next; }
export function clearMemory() { memory.clear(); jobs.clear(); }
const BASE = 'https://api.github.com';
const TTL = 15 * 60000;
const MAX_STALE = 7 * 86400000;
const memory = new Map<string, { at: number; value: unknown }>();
const jobs = new Map<string, Promise<{ data: Analysis; stale: boolean }>>();
export class GitHubError extends Error {
  constructor(message: string, public status: number, public reset?: number) { super(message); this.name = 'GitHubError'; }
}

/** Timeout, rate tracking and reserve capacity adapted from maintainerPulse. */
export class GitHubClient {
  remaining: number | null = null;
  reset: number | undefined;
  requests = 0;
  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const cached = memory.get(path);
    if (cached && Date.now() - cached.at < TTL) return cached.value as T;
    if (this.remaining !== null && this.remaining <= 3) throw new GitHubError('Keeping a small GitHub request reserve. Try again after the API limit resets.', 429, this.reset);
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(18000);
      response = await transport(BASE + path, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && /token|cooling down|Connection changed/.test(error.message))) throw error;
      throw new GitHubError(error instanceof Error && error.name === 'TimeoutError' ? 'GitHub took too long to reply. Try again shortly.' : 'Unable to reach GitHub. Check your connection.', 0);
    }
    this.requests++;
    if (response.headers.has('x-ratelimit-remaining')) this.remaining = Number(response.headers.get('x-ratelimit-remaining'));
    this.reset = Number(response.headers.get('x-ratelimit-reset')) || undefined;
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string };
      const limited = response.status === 429 || this.remaining === 0 || /rate limit|secondary rate|abuse detection/i.test(body.message || '');
      const resetText = this.reset ? ` Try after ${new Date(this.reset * 1000).toLocaleTimeString()}.` : ' Try again later.';
      throw new GitHubError(limited ? `GitHub request limit reached.${resetText}` : response.status === 404 ? 'Public repository not found. Check its name or visibility.' : response.status === 403 ? 'GitHub denied this request (forbidden).' : `GitHub returned ${response.status}. Try again later.`, response.status, this.reset);
    }
    const value = await response.json() as T;
    memory.set(path, { at: Date.now(), value });
    if (memory.size > 120) memory.delete(memory.keys().next().value!);
    return value;
  }
}
function pathFor(input: string) {
  const name = parseRepo(input);
  if (!name) throw new Error('Enter a public repository as owner/name or a GitHub repository URL.');
  return `/repos/${name.split('/').map(encodeURIComponent).join('/')}`;
}
function storage() { return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null; }
async function saved(name: string): Promise<Analysis | null> {
  try {
    const local = storage(); if (!local) return null;
    const key = `analysis:${name.toLowerCase()}`;
    const result = (await local.get(key))[key] as Analysis | undefined;
    return result?.version === 2 && Date.now() - Date.parse(result.fetchedAt) < MAX_STALE ? result : null;
  } catch { return null; }
}
async function save(value: Analysis) {
  try {
    const local = storage(); if (!local) return;
    await local.set({ [`analysis:${value.repo.full_name.toLowerCase()}`]: value });
    const all = await local.get(null);
    const entries = Object.entries(all).filter(([key]) => key.startsWith('analysis:'))
      .sort((a, b) => Date.parse((b[1] as Analysis).fetchedAt) - Date.parse((a[1] as Analysis).fetchedAt));
    if (entries.length > 25) await local.remove(entries.slice(25).map(([key]) => key));
  } catch { /* Cache failure must not hide a successfully fetched report. */ }
}
export async function clearCache() {
  memory.clear();
  const local = storage();
  if (local) { const all = await local.get(null); await local.remove(Object.keys(all).filter(key => key.startsWith('analysis:'))); }
}

async function buildAnalysis(name: string, signal?: AbortSignal): Promise<{ data: Analysis; stale: boolean }> {
  const repoPath = pathFor(name);
  const known = await saved(repoPath.slice(7));
  if (known && Date.now() - Date.parse(known.fetchedAt) < TTL) return { data: known, stale: false };
  try {
    const client = new GitHubClient();
    const repo = await client.get<Repository>(repoPath, signal);
    if (repo.private) throw new Error('Only public repositories are supported.');
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const availability = { pulls: true, commits: true, issues: true, community: !repo.fork };
    const warnings: string[] = [];
    async function optional<T>(field: keyof typeof availability, path: string, fallback: T): Promise<T> {
      try { return await client.get<T>(path, signal); } catch (error) {
        if (signal?.aborted) throw error;
        availability[field] = false;
        warnings.push(`${field === 'community' ? 'Contribution documents' : field === 'pulls' ? 'Pull request activity' : field === 'commits' ? 'Commit activity' : 'Issue opportunities'} unavailable. ${error instanceof Error ? error.message : ''}`);
        return fallback;
      }
    }
    const pulls = await optional<Pull[]>('pulls', `${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=100`, []);
    const commits = await optional<Commit[]>('commits', `${repoPath}/commits?since=${encodeURIComponent(since)}&per_page=100`, []);
    const issueList = repo.has_issues === false ? [] : await optional<Issue[]>('issues', `${repoPath}/issues?state=open&sort=updated&direction=desc&per_page=100`, []);
    const community = repo.fork ? null : await optional<Community | null>('community', `${repoPath}/community/profile`, null);
    const outside = pulls.filter(p => isOutside(p) && Date.parse(p.created_at) >= Date.parse(since));
    const budget = Math.max(0, Math.floor(((client.remaining ?? 23) - 5) / 3));
    const selected = outside.slice(0, Math.min(5, budget));
    const samples: Analysis['samples'] = [];
    let failed = 0;
    for (const pull of selected) {
      try {
        const comments = await client.get<EvidenceReply[]>(`${repoPath}/issues/${pull.number}/comments?per_page=100`, signal);
        const reviews = await client.get<EvidenceReply[]>(`${repoPath}/pulls/${pull.number}/reviews?per_page=100`, signal);
        const inline = await client.get<EvidenceReply[]>(`${repoPath}/pulls/${pull.number}/comments?per_page=100`, signal);
        if ([comments, reviews, inline].some(items => items.length === 100)) warnings.push(`Response history for PR #${pull.number} is limited to the first 100 items per endpoint.`);
        const replies = [...comments.map(r => ({ ...r, kind: 'PR conversation' })), ...reviews.map(r => ({ ...r, kind: 'Code review' })), ...inline.map(r => ({ ...r, kind: 'Inline review' }))];
        const hours = firstTeamReply(pull, replies);
        const first = replies.filter(r => !isBot(r.user) && r.user?.login.toLowerCase() !== pull.user?.login.toLowerCase() && isTeam(r.author_association) && Date.parse(r.created_at || r.submitted_at || '') >= Date.parse(pull.created_at))
          .sort((a, b) => Date.parse(a.created_at || a.submitted_at || '') - Date.parse(b.created_at || b.submitted_at || ''))[0];
        samples.push({ pull, hours, responder: first?.user?.login, url: first?.html_url, kind: first?.kind });
      } catch (error) { if (signal?.aborted) throw error; failed++; }
    }
    if (failed) warnings.push(`${failed} PR response histories were unavailable and excluded from the response calculation.`);
    if (selected.length < Math.min(5, outside.length)) warnings.push('Response sampling was reduced to preserve GitHub request capacity.');
    if (repo.archived || repo.disabled) warnings.push(repo.archived ? 'This repository is archived.' : 'This repository is disabled.');
    if (repo.fork) warnings.push('This is a fork; check the upstream project before contributing.');
    if (pulls.length === 100) warnings.push('PR and author counts are lower bounds from 100 recently updated PRs. The chart has the same limited coverage.');
    if (commits.length === 100) warnings.push('Commit count is a lower bound from 100 recent commits.');
    const data: Analysis = {
      version: 2, repo, activity: activity(pulls, commits, new Date()), response: responseSummary(samples),
      samples, issues: opportunities(issueList), community, fetchedAt: new Date().toISOString(), availability,
      limited: { pulls: pulls.length === 100, commits: commits.length === 100, issues: issueList.length === 100 },
      warnings, requests: client.requests, rateRemaining: client.remaining
    };
    await save(data);
    return { data, stale: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    // A 404 can mean a repo became private or was deleted: do not reveal cached data then.
    if (known && !(error instanceof GitHubError && error.status === 404)) return { data: known, stale: true };
    throw error;
  }
}
export function analyze(name: string, signal?: AbortSignal): Promise<{ data: Analysis; stale: boolean }> {
  const key = pathFor(name).toLowerCase();
  if (jobs.has(key)) return jobs.get(key)!;
  const job = buildAnalysis(name, signal).finally(() => jobs.delete(key));
  jobs.set(key, job); return job;
}
export async function rankSearch(query: string, signal?: AbortSignal) {
  const client = new GitHubClient();
  const q = `${query.trim()} in:name,description archived:false fork:false is:public`;
  const found = await client.get<{ total_count: number; incomplete_results: boolean; items: Repository[] }>(`/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=5`, signal);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows: Array<{ repo: Repository; metrics: ReturnType<typeof activity> | null; limited: boolean; error?: string }> = [];
  for (const repo of found.items.filter(i => !i.private)) {
    try {
      const path = pathFor(repo.full_name);
      const pulls = await client.get<Pull[]>(`${path}/pulls?state=all&sort=updated&direction=desc&per_page=100`, signal);
      const commits = await client.get<Commit[]>(`${path}/commits?since=${encodeURIComponent(since)}&per_page=100`, signal);
      rows.push({ repo, metrics: activity(pulls, commits, new Date()), limited: pulls.length === 100 || commits.length === 100 });
    } catch (error) {
      if (signal?.aborted) throw error;
      rows.push({ repo, metrics: null, limited: false, error: error instanceof Error ? error.message : 'Data unavailable' });
    }
  }
  rows.sort((a, b) => a.metrics && b.metrics ? compareActivity(a.metrics, b.metrics) : a.metrics ? -1 : b.metrics ? 1 : 0);
  return { total: found.total_count, incomplete: found.incomplete_results, compared: rows.filter(r => r.metrics).length, rows };
}
export function parseGitHubUrl(url: string): string | null {
  if (!/^https?:\/\/(?:www\.)?github\.com\//i.test(url)) return null;
  return parseRepo(url);
}
