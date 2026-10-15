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
