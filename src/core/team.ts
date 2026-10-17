import { isTeamAssociation, type Actor } from './metrics';

/**
 * Why CONTRI believes someone is on the project team.
 *
 * `author_association` alone is unreliable: GitHub reports private organization
 * members as CONTRIBUTOR or NONE to everyone outside the organization. So the
 * roster also uses actions that require triage or write access (labeling,
 * assigning, merging, milestones), CODEOWNERS entries and the repository owner.
 */
export type RosterBasis = 'association' | 'triage' | 'merged' | 'codeowners' | 'owner';

export type RosterEntry = { login: string; basis: RosterBasis[] };
export type Roster = Map<string, RosterEntry>;

export type IssueEvent = {
  event: string;
  actor: Actor;
  at: string;
  /** Author of the issue or PR the event happened on, when known. */
  issueAuthor?: string | null;
  issueCreatedAt?: string | null;
};

/** Events GitHub only lets people with triage or write access perform. */
const PRIVILEGED_EVENTS = new Set([
  'labeled',
  'unlabeled',
  'assigned',
  'unassigned',
  'milestoned',
  'demilestoned',
  'locked',
  'unlocked',
  'pinned',
  'unpinned',
  'transferred',
  'marked_as_duplicate',
  'merged',
]);

export function rosterFromEvents(events: IssueEvent[]): Array<{ login: string; basis: RosterBasis }> {
  const out: Array<{ login: string; basis: RosterBasis }> = [];
  for (const e of events) {
    if (!e.actor || e.actor.bot || !PRIVILEGED_EVENTS.has(e.event)) continue;
    // Issue forms can apply labels on behalf of the author at creation time.
    if (
      (e.event === 'labeled' || e.event === 'unlabeled') &&
      e.issueAuthor &&
      e.issueAuthor.toLowerCase() === e.actor.login.toLowerCase() &&
      e.issueCreatedAt &&
      Math.abs(Date.parse(e.at) - Date.parse(e.issueCreatedAt)) < 120_000
    )
      continue;
    out.push({ login: e.actor.login, basis: e.event === 'merged' ? 'merged' : 'triage' });
  }
  return out;
}

/** Extracts individual @user owners from a CODEOWNERS file. Team handles (@org/team) are skipped. */
export function parseCodeowners(text: string): string[] {
  const found = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    for (const token of line.split(/\s+/).slice(1)) {
      const match = /^@([a-z\d](?:[a-z\d-]{0,38}))$/i.exec(token);
      if (match) found.add(match[1]);
    }
  }
  return [...found];
}

export function buildRoster(input: {
  owner?: { login: string; type?: string } | null;
  events?: IssueEvent[];
  codeowners?: string[];
  associations?: Array<{ login: string; association: string }>;
  mergedBy?: Array<string | null | undefined>;
}): Roster {
  const roster: Roster = new Map();
  const add = (login: string | null | undefined, basis: RosterBasis) => {
    if (!login || /\[bot\]$/i.test(login)) return;
    const key = login.toLowerCase();
    const entry = roster.get(key) ?? { login, basis: [] };
    if (!entry.basis.includes(basis)) entry.basis.push(basis);
    roster.set(key, entry);
  };
  if (input.owner && input.owner.type !== 'Organization') add(input.owner.login, 'owner');
  for (const { login, basis } of rosterFromEvents(input.events ?? [])) add(login, basis);
  for (const login of input.codeowners ?? []) add(login, 'codeowners');
  for (const login of input.mergedBy ?? []) add(login, 'merged');
  for (const { login, association } of input.associations ?? [])
    if (isTeamAssociation(association)) add(login, 'association');
  return roster;
}

export function teamCheck(roster: Roster) {
  return (login: string, association: string) => isTeamAssociation(association) || roster.has(login.toLowerCase());
}

export function describeBasis(basis: RosterBasis[]): string {
  const labels: Record<RosterBasis, string> = {
    association: 'GitHub team badge',
    triage: 'labels or assigns issues',
    merged: 'merges pull requests',
    codeowners: 'listed in CODEOWNERS',
    owner: 'repository owner',
  };
  return basis.map((b) => labels[b]).join(' · ');
}
