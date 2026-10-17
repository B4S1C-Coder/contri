import { repoPath } from '../../shared/repo';
import type { Ctx } from './context';

export type Repo = {
  fullName: string;
  name: string;
  owner: { login: string; type: string };
  url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  pushedAt: string | null;
  stars: number;
  forks: number;
  language: string | null;
  license: string | null;
  hasIssues: boolean;
  topics: string[];
  defaultBranch: string;
  parent: string | null;
};

type RestRepo = {
  full_name: string;
  name: string;
  owner: { login: string; type: string };
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  license?: { name: string } | null;
  has_issues?: boolean;
  topics?: string[];
  default_branch?: string;
  parent?: { full_name: string };
};

/** Every report starts here: CONTRI only ever reads public repositories. */
export async function publicRepo(ctx: Ctx, repo: string): Promise<Repo> {
  const r = await ctx.client.rest<RestRepo>(repoPath(repo));
  if (r.private) throw new Error('Only public repositories are supported.');
  return {
    fullName: r.full_name,
    name: r.name,
    owner: { login: r.owner?.login ?? repo.split('/')[0], type: r.owner?.type ?? 'User' },
    url: r.html_url,
    description: r.description,
    fork: r.fork,
    archived: r.archived,
    disabled: r.disabled,
    pushedAt: r.pushed_at,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    license: r.license?.name ?? null,
    hasIssues: r.has_issues !== false,
    topics: r.topics ?? [],
    defaultBranch: r.default_branch ?? 'main',
    parent: r.parent?.full_name ?? null,
  };
}
