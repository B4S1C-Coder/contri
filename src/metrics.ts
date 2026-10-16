export type Actor = { login: string; type?: string } | null;
export type Pull = {
  number: number; title: string; html_url: string; created_at: string; updated_at: string;
  merged_at: string | null; user: Actor; author_association?: string; draft?: boolean;
};
export type Reply = {
  user: Actor; author_association?: string; created_at?: string; submitted_at?: string;
};
export type Issue = {
  number: number; title: string; html_url: string; created_at: string; updated_at: string;
  labels: Array<{ name: string }>; assignee: Actor; comments: number; locked?: boolean;
  pull_request?: unknown;
};

const TEAM = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const OUTSIDE = new Set(['NONE', 'FIRST_TIMER', 'FIRST_TIME_CONTRIBUTOR', 'CONTRIBUTOR']);
export const isBot = (actor: Actor | undefined): boolean => !actor || actor.type === 'Bot' || /\[bot\]$/i.test(actor.login);
export const isTeam = (association?: string): boolean => TEAM.has(association || '');
export const isOutside = (pull: Pull): boolean => !pull.draft && !isBot(pull.user) && OUTSIDE.has(pull.author_association || '');

/** Adapted from the user-supplied maintainerPulse parser. */
export function parseRepo(input: string): string | null {
  let value = input.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) return null;
      value = url.pathname.replace(/^\/+/, '');
    } catch { return null; }
  } else value = value.replace(/^github\.com\//i, '');
  const [owner, rawRepo] = value.split('/');
  const repo = rawRepo?.replace(/\.git$/i, '');
  if (!owner || !repo || !/^[a-z\d][a-z\d-]{0,38}$/i.test(owner) || !/^[a-z\d_.-]{1,100}$/i.test(repo) || ['.', '..'].includes(repo)) return null;
  if (new Set(['settings','notifications','features','topics','marketplace','search','orgs','collections','sponsors','login','signup','explore','about','pricing','pulls','issues','account','users','organizations','apps','codespaces','new']).has(owner.toLowerCase())) return null;
  return `${owner}/${repo}`;
}

export function activity(pulls: Pull[], commits: Array<{ author?: Actor; commit: { author?: { date?: string } } }>, now: Date) {
  const start = new Date(now.getTime() - 90 * 86400000);
  const merged = pulls.filter(p => p.merged_at && new Date(p.merged_at) >= start && new Date(p.merged_at) <= now && !isBot(p.user));
  const authors = new Set(merged.map(p => p.user!.login.toLowerCase()));
  const humanCommits = commits.filter(c => !isBot(c.author) && c.commit.author?.date && new Date(c.commit.author.date) >= start && new Date(c.commit.author.date) <= now);
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const from = new Date(start.getTime() + i * 7 * 86400000);
    const to = new Date(i === 12 ? now.getTime() + 1 : from.getTime() + 7 * 86400000);
    return { from: from.toISOString(), count: merged.filter(p => {
      const at = new Date(p.merged_at!);
      return at >= from && at < to;
    }).length };
  });
  return { merged: merged.length, authors: authors.size, commits: humanCommits.length, weeks, from: start.toISOString() };
}

export function firstTeamReply(pull: Pull, replies: Reply[]): number | null {
  const author = pull.user?.login.toLowerCase();
  const first = replies
    .filter(r => r.user && !isBot(r.user) && r.user.login.toLowerCase() !== author && isTeam(r.author_association))
    .map(r => new Date(r.created_at || r.submitted_at || '').getTime())
    .filter(time => Number.isFinite(time) && time >= new Date(pull.created_at).getTime())
    .sort((a, b) => a - b)[0];
  return first === undefined ? null : (first - new Date(pull.created_at).getTime()) / 3600000;
}

export function responseSummary(samples: Array<{ pull: Pull; hours: number | null }>) {
  const responded = samples.map(s => s.hours).filter((h): h is number => h !== null).sort((a, b) => a - b);
  const middle = Math.floor(responded.length / 2);
  const medianHours = responded.length ? (responded.length % 2 ? responded[middle] : (responded[middle - 1] + responded[middle]) / 2) : null;
  return { sampled: samples.length, replied: responded.length, medianHours, sufficient: samples.length >= 3 };
}

export function opportunities(issues: Issue[]) {
  const names = new Set(['good first issue', 'help wanted']);
  return issues.filter(i => !i.pull_request && !i.locked && i.labels.some(l => names.has(l.name.toLowerCase())));
}

export function compareActivity(a: ReturnType<typeof activity>, b: ReturnType<typeof activity>): number {
  return b.merged - a.merged || b.authors - a.authors || b.commits - a.commits;
}

export function hasNextIssuePage(rawCount:number,total:number,page:number){return page<10&&rawCount===30&&page*30<total;}
export function needsLinkCheck(check:{state:string}|undefined){return !check||check.state==='incomplete';}
