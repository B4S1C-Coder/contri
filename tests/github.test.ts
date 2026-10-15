import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyze, GitHubError } from '../src/github';

afterEach(() => vi.unstubAllGlobals());
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
function mockRepo(name: string, failCommits = false) {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input).pathname;
    if (path.endsWith(`/repos/test/${name}`)) return response({ full_name: `test/${name}`, html_url: `https://github.com/test/${name}`, private: false, fork: false, archived: false, disabled: false });
    if (path.endsWith('/commits') && failCommits) return response({ message: 'temporarily unavailable' }, 503);
    if (path.endsWith('/community/profile')) return response({ files: {} });
    return response([]);
  }));
}

describe('GitHub analysis failures', () => {
  it('preserves unavailable endpoint state instead of presenting a zero count', async () => {
    mockRepo('missing-commits', true);
    const { data } = await analyze('test/missing-commits');
    expect(data.availability.commits).toBe(false);
    expect(data.warnings.join(' ')).toMatch(/commit/i);
  });
  it('distinguishes forbidden from exhausted request capacity', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ message: 'Resource denied' }, 403, { 'x-ratelimit-remaining': '25' })));
    await expect(analyze('test/forbidden')).rejects.toThrow(/denied|forbidden/i);
  });
  it('rejects private metadata even if a transport returns it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ private: true })));
    await expect(analyze('test/private')).rejects.toThrow(/public/i);
  });
});
