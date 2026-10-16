import { expect, it } from 'vitest';
import { timing, linkState } from '../src/evidence';
it('keeps unanswered items out of response averages and requires three answers', () => {
  expect(timing([1, 2, 99, null])).toEqual({ sampled: 4, answered: 3, unanswered: 1, averageHours: 34, medianHours: 2, sufficient: true });
  expect(timing([1, null]).sufficient).toBe(false);
});
it('never reports an incomplete link check as available', () => {
  expect(linkState([], false)).toBe('incomplete');
  expect(linkState([{ state: 'closed', merged_at: '2026-01-01', draft: false }], true)).toBe('clear');
  expect(linkState([{ state: 'open', merged_at: null, draft: true }], true)).toBe('open');
});

it('keeps pagination available when a full page contains locked rows', async()=>{
 const {hasNextIssuePage}=await import('../src/evidence');
 expect(hasNextIssuePage(30,31,1)).toBe(true);
 expect(hasNextIssuePage(0,0,1)).toBe(false);
});
it('allows incomplete link checks to be retried',async()=>{
 const {needsLinkCheck}=await import('../src/evidence');
 expect(needsLinkCheck(undefined)).toBe(true);
 expect(needsLinkCheck({state:'incomplete'})).toBe(true);
 expect(needsLinkCheck({state:'clear'})).toBe(false);
});
it('reports actual human discussion and team evidence excluding bots',async()=>{
 const {discussionSummary}=await import('../src/evidence');
 const result=discussionSummary([
 {user:{login:'alice'},author_association:'MEMBER',created_at:'2026-01-01T00:00:00Z',html_url:'https://github.com/o/r/issues/1#issuecomment-1'},
 {user:{login:'robot[bot]'},author_association:'MEMBER',created_at:'2026-01-02T00:00:00Z',html_url:'https://github.com/o/r/issues/1#issuecomment-2'}
 ],true);
 expect(result.latest?.login).toBe('alice');expect(result.teamComments).toBe(1);expect(result.complete).toBe(true);
});
