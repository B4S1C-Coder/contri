import { describe, expect, it } from 'vitest';
import { activity, firstTeamReply, isOutside, opportunities, parseRepo, responseSummary, type Issue, type Pull } from '../src/metrics';
import { parseGitHubUrl } from '../src/github';

const now = new Date('2026-10-15T12:00:00Z');
const pull = (overrides: Partial<Pull> = {}): Pull => ({
  number: 1, title: 'Improve docs', html_url: 'https://github.com/a/b/pull/1',
  created_at: '2026-10-10T12:00:00Z', updated_at: '2026-10-12T12:00:00Z',
  merged_at: '2026-10-12T12:00:00Z', user: { login: 'newperson', type: 'User' }, author_association: 'FIRST_TIME_CONTRIBUTOR', ...overrides
});

describe('activity evidence', () => {
  it('counts recent human merges, distinct authors and commits', () => {
    const result = activity([pull(), pull({ number: 2, user: { login: 'newperson' } }), pull({ number: 3, user: { login: 'dependabot[bot]', type: 'Bot' } }), pull({ number: 4, merged_at: '2025-01-01T00:00:00Z' })], [
      { author: { login: 'newperson' }, commit: { author: { date: '2026-10-12T12:00:00Z' } } },
      { author: { login: 'dependabot[bot]', type: 'Bot' }, commit: { author: { date: '2026-10-12T12:00:00Z' } } }
    ], now);
    expect(result.merged).toBe(2); expect(result.authors).toBe(1); expect(result.commits).toBe(1);
    expect(result.weeks.reduce((sum, week) => sum + week.count, 0)).toBe(2);
  });
  it('has zero evidence for a new or quiet repository', () => {
    const result = activity([], [], now);
    expect([result.merged, result.authors, result.commits]).toEqual([0, 0, 0]);
  });
});

describe('project team response', () => {
  it('ignores author and bot replies and finds first team reply', () => {
    const hours = firstTeamReply(pull(), [
      { user: { login: 'newperson' }, author_association: 'OWNER', created_at: '2026-10-10T13:00:00Z' },
      { user: { login: 'helper[bot]', type: 'Bot' }, author_association: 'MEMBER', created_at: '2026-10-10T14:00:00Z' },
      { user: { login: 'maintainer' }, author_association: 'MEMBER', submitted_at: '2026-10-11T12:00:00Z' }
    ]);
    expect(hours).toBe(24);
  });
  it('marks fewer than three samples as insufficient', () => {
    expect(responseSummary([{ pull: pull(), hours: null }]).sufficient).toBe(false);
    expect(responseSummary([]).medianHours).toBeNull();
  });
});

describe('contribution opportunities', () => {
  const issue: Issue = { number: 2, title: 'Docs', html_url: 'https://github.com/a/b/issues/2', created_at: '2026-10-10T00:00:00Z', updated_at: '2026-10-11T00:00:00Z', labels: [{ name: 'Good First Issue' }], assignee: null, comments: 0 };
  it('excludes pull requests and locked issues from matching labels', () => {
    expect(opportunities([issue, { ...issue, number: 3, pull_request: {} }, { ...issue, number: 4, locked: true }]).map(i => i.number)).toEqual([2]);
  });
});

describe('current page detection', () => {
  it('uses the imported parser to reject GitHub navigation routes and normalize clone URLs', () => {
    expect(parseRepo('https://github.com/owner/repo.git')).toBe('owner/repo');
    expect(parseRepo('https://github.com/owner/repo/issues/2')).toBe('owner/repo');
    expect(parseRepo('https://github.com/settings/profile')).toBeNull();
    expect(parseRepo('https://example.com/owner/repo')).toBeNull();
    expect(parseRepo('owner/..')).toBeNull();
    expect(isOutside(pull({ draft: true }))).toBe(false);
  });
  it('accepts GitHub repository pages and rejects other origins', () => {
    expect(parseGitHubUrl('https://github.com/owner/repo/issues/2')).toBe('owner/repo');
    expect(parseGitHubUrl('https://notgithub.com/owner/repo')).toBeNull();
  });
});
