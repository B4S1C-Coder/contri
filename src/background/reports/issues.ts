import { hasNextIssuePage } from '../../core/metrics';
import { splitRepo } from '../github';
import { optional, type Ctx } from './context';
import { publicRepo } from './repo';

export type IssueQuery = {
  repo: string;
  label: string;
  query: string;
  unassigned: boolean;
  sort: 'updated' | 'created';
  page: number;
};

export type IssueRow = {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  assignees: string[];
  comments: number;
  author: string | null;
  /** Only filled when signed in: linked open PRs, found in the same request. */
  linkedOpen: number | null;
};

export type IssueSearch = {
  items: IssueRow[];
  total: number;
  incomplete: boolean;
  hasNext: boolean;
  linkCheck: 'bulk' | 'per-issue';
  warnings: string[];
};

export const LABELS = ['', 'beginner', 'good first issue', 'help wanted', 'documentation', 'bug'];

export function issueSearchQuery(input: IssueQuery) {
  const label =
    input.label === 'beginner' ? 'label:"good first issue","help wanted"' : input.label ? `label:"${input.label}"` : '';
  // Free text cannot add qualifiers: repository and public scope stay fixed.
  const words = input.query
    .replace(/[^\p{L}\p{N} _-]/gu, ' ')
    .trim()
    .slice(0, 100);
  return ['repo:' + input.repo, 'is:issue', 'is:open', label, input.unassigned ? 'no:assignee' : '', words]
    .filter(Boolean)
    .join(' ');
}

type RestSearchItem = {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  assignees?: Array<{ login: string }>;
  comments: number;
  user: { login: string } | null;
  locked?: boolean;
  pull_request?: unknown;
};

const LINKS_FRAGMENT = `
  closedByPullRequestsReferences(first: 5) { nodes { state url repository { isPrivate } } }
  timelineItems(itemTypes: [CROSS_REFERENCED_EVENT], last: 20) {
    nodes { ... on CrossReferencedEvent { source { ... on PullRequest { state url repository { isPrivate } } } } }
  }`;

type LinkNode = {
  closedByPullRequestsReferences: { nodes: Array<{ state: string; url: string; repository: { isPrivate: boolean } }> };
  timelineItems: { nodes: Array<{ source?: { state?: string; url?: string; repository?: { isPrivate: boolean } } }> };
} | null;

/** One GraphQL request tells us, for a whole page of issues, whether an open PR already exists. */
async function bulkLinks(ctx: Ctx, repo: string, numbers: number[]): Promise<Map<number, number>> {
  const fields = numbers.map((n) => `i${n}: issue(number: ${n}) { ${LINKS_FRAGMENT} }`).join('\n');
  const { data } = await ctx.client.graphql<{ repository: Record<string, LinkNode> }>(
    `query Links($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`,
    splitRepo(repo),
  );
  const out = new Map<number, number>();
  for (const n of numbers) {
    const node = data.repository?.[`i${n}`];
    if (!node) continue;
    const open = new Set<string>();
    for (const p of node.closedByPullRequestsReferences.nodes)
      if (p.state === 'OPEN' && !p.repository.isPrivate) open.add(p.url);
    for (const t of node.timelineItems.nodes)
      if (t.source?.state === 'OPEN' && t.source.url && !t.source.repository?.isPrivate) open.add(t.source.url);
    out.set(n, open.size);
  }
  return out;
}

export async function searchIssues(ctx: Ctx, input: IssueQuery): Promise<IssueSearch> {
  const meta = await publicRepo(ctx, input.repo);
  if (!meta.hasIssues)
    return {
      items: [],
      total: 0,
      incomplete: false,
      hasNext: false,
      linkCheck: 'per-issue',
      warnings: ['Issues are disabled for this repository.'],
    };
  const q = issueSearchQuery(input);
  const result = await ctx.client.rest<{ items: RestSearchItem[]; total_count: number; incomplete_results: boolean }>(
    `/search/issues?q=${encodeURIComponent(q)}&sort=${input.sort}&order=desc&per_page=30&page=${input.page}`,
  );
  const warnings: string[] = [];
  const rows = result.items.filter((i) => !i.pull_request && !i.locked);
  const links =
    ctx.authed && rows.length
      ? await optional(ctx, warnings, 'Bulk pull request check', () =>
          bulkLinks(
            ctx,
            input.repo,
            rows.map((r) => r.number),
          ),
        )
      : null;
  return {
    items: rows.map((i) => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      labels: i.labels.map((l) => l.name),
      assignees: (i.assignees ?? []).map((a) => a.login),
      comments: i.comments,
      author: i.user?.login ?? null,
      linkedOpen: links?.get(i.number) ?? null,
    })),
    total: result.total_count,
    incomplete: result.incomplete_results,
    hasNext: hasNextIssuePage(result.items.length, result.total_count, input.page),
    linkCheck: links ? 'bulk' : 'per-issue',
    warnings,
  };
}
