import type { ClaimStatus } from './claims';
import type { LinkState } from './metrics';

export type Tone = 'good' | 'warn' | 'busy' | 'unknown';
export type Verdict = { tone: Tone; label: string; detail: string };

type LinkedPR = { number: number; state: string; author: string | null };

/**
 * One honest headline for "can I work on this?", in priority order:
 * closed → open PR → assigned → active claim → quiet claim → incomplete check → looks free.
 */
export function verdict(input: {
  issueState: string;
  link: { state: LinkState; prs: LinkedPR[] };
  claim: ClaimStatus;
  /** False when only part of a long discussion was checked for claims. */
  commentsComplete?: boolean;
}): Verdict {
  const { issueState, link, claim, commentsComplete = true } = input;
  if (issueState.toLowerCase() !== 'open') return { tone: 'busy', label: 'Closed', detail: 'This issue is closed.' };
  const open = link.prs.find((p) => p.state === 'open');
  if (open)
    return {
      tone: 'busy',
      label: `Open PR #${open.number}`,
      detail: `${open.author ? `@${open.author} has` : 'There is'} an open pull request referencing this issue. Review it before starting.`,
    };
  if (claim.state === 'assigned')
    return { tone: 'busy', label: `Assigned to @${claim.assignees[0]}`, detail: claim.note };
  if (claim.state === 'claimed' && claim.claim)
    return { tone: 'warn', label: `Claimed by @${claim.claim.login}`, detail: claim.note };
  if (claim.state === 'stale') return { tone: 'warn', label: 'Claim went quiet', detail: claim.note };
  if (link.state === 'incomplete')
    return {
      tone: 'unknown',
      label: 'Partly checked',
      detail: 'Some references could not be checked. Read the thread before starting.',
    };
  return {
    tone: 'good',
    label: 'Looks free',
    detail: `No assignee, no claim and no linked open pull request found.${
      commentsComplete ? '' : ' Only the latest comments were checked for claims.'
    } Say hello in the thread before you start.`,
  };
}
