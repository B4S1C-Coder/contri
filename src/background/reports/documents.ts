import { repoPath } from '../../shared/repo';
import type { Ctx } from './context';
import { publicRepo } from './repo';

export const DOCUMENT_LABELS = {
  readme: 'README',
  contributing: 'Contributing guide',
  license: 'License',
  code_of_conduct: 'Code of conduct',
  issue_template: 'Issue template',
  pull_request_template: 'PR template',
} as const;

export type DocumentsReport = {
  files: Partial<Record<keyof typeof DOCUMENT_LABELS, string | null>>;
  health: number | null;
  note?: string;
  checkedAt: string;
};

export async function documents(ctx: Ctx, repo: string): Promise<DocumentsReport> {
  const meta = await publicRepo(ctx, repo);
  try {
    const profile = await ctx.client.rest<{
      health_percentage?: number;
      files: Record<string, { html_url: string } | null>;
    }>(`${repoPath(repo)}/community/profile`);
    const files: DocumentsReport['files'] = {};
    for (const key of Object.keys(DOCUMENT_LABELS) as Array<keyof typeof DOCUMENT_LABELS>)
      files[key] = profile.files?.[key]?.html_url ?? null;
    return { files, health: profile.health_percentage ?? null, checkedAt: new Date().toISOString() };
  } catch (error) {
    if (ctx.signal?.aborted) throw error;
    return {
      files: {},
      health: null,
      note: meta.fork
        ? `Community profile is unavailable for forks. Check the upstream project${meta.parent ? ` (${meta.parent})` : ''}.`
        : error instanceof Error
          ? error.message
          : 'Documentation unavailable',
      checkedAt: new Date().toISOString(),
    };
  }
}
