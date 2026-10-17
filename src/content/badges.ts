import type { InsightReport } from '../background/reports/insight';
import { verdict, type Verdict } from '../core/verdict';
import { count, hours } from '../shared/format';
import { call, peek, type BadgeMode } from '../shared/protocol';
import { parsePage } from '../shared/repo';
import { onNavigate } from './navigation';
import { githubTheme } from './theme';

/**
 * Small native-feeling badges inside GitHub's own UI:
 *  - next to an issue title: "Looks free" / "Open PR #12" / "Claimed by @x"
 *  - in a repository's About sidebar: recent merges and team reply time
 * They never spend GitHub requests unless the user is signed in or clicks them.
 */

export const OPEN_EVENT = 'contri:open';

const BADGE_CSS = `
:host{all:initial;display:inline-block;margin:6px 0 2px;font:12px/1.4 "Contri Sans",system-ui,sans-serif}
button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:5px 11px 5px 8px;border-radius:999px;
  color:#f3f6ee;border:1px solid #ffffff75;background:linear-gradient(145deg,#476263f0,#304a48f2 58%,#3e5143f0);
  box-shadow:0 4px 14px #122a302b,inset 0 1px 0 #ffffff35;max-width:100%}
:host([data-theme=dark]) button{border-color:#ffffff3d;background:linear-gradient(145deg,#2a3f3ff2,#1c2e2cf5 58%,#243328f2);box-shadow:0 4px 14px #0000004d,inset 0 1px 0 #ffffff22}
button:hover{filter:brightness(1.08)}
button:focus-visible{outline:2px solid #fce9b6;outline-offset:2px}
.brand{font-size:9px;letter-spacing:1.6px;font-weight:600;opacity:.85}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:#d4e2da}
.good .dot{background:#8fd6a8}.warn .dot{background:#f2cf7c}.busy .dot{background:#f0a08e}.unknown .dot{background:#cfd8d2}
.label{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.muted{opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spin{width:9px;height:9px;border-radius:50%;border:2px solid #ffffff40;border-top-color:#fce9b6;animation:s .9s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
`;

type Settings = { mode: BadgeMode; signedIn: boolean };

function createBadge(id: string) {
  const host = document.createElement('div');
  host.id = id;
  host.dataset.contri = 'badge';
  host.dataset.theme = githubTheme();
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = BADGE_CSS;
  const button = document.createElement('button');
  shadow.append(style, button);
  return { host, button };
}

function render(
  button: HTMLButtonElement,
  parts: { tone?: Verdict['tone']; label: string; detail?: string; loading?: boolean; title?: string },
) {
  button.className = parts.tone ?? '';
  button.title = parts.title ?? '';
  button.replaceChildren();
  const add = (cls: string, text = '') => {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    button.append(el);
  };
  add(parts.loading ? 'spin' : 'dot');
  add('brand', 'CONTRI');
  add('label', parts.label);
  if (parts.detail) add('muted', parts.detail);
}

const openWidget = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT));

/* ---------- issue title badge ---------- */

function issueAnchor(): Element | null {
  const title =
    document.querySelector('[data-testid="issue-title"]') ??
    document.querySelector('.gh-header-title') ??
    document.querySelector('.js-issue-title');
  return title?.closest('h1') ?? title ?? null;
}

const ISSUE_ID = 'contri-issue-badge';

function issueBadge(repo: string, number: number, settings: Settings, state: Map<string, InsightReport | 'error'>) {
  const anchor = issueAnchor();
  if (!anchor) return;
  const key = `${repo}#${number}`;
  const host = document.getElementById(ISSUE_ID);
  if (host && host.dataset.key === key) {
    if (!host.isConnected || host.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', host);
    return;
  }
  host?.remove();
  const badge = createBadge(ISSUE_ID);
  badge.host.dataset.key = key;
  anchor.insertAdjacentElement('afterend', badge.host);

  const show = (report: InsightReport) => {
    const v = verdict({ issueState: report.issue.state, link: report.link, claim: report.claim });
    render(badge.button, { tone: v.tone, label: v.label, detail: 'Open details', title: v.detail });
    badge.button.onclick = openWidget;
  };
  const load = async (force = false) => {
    render(badge.button, { loading: true, label: 'Checking availability…' });
    try {
      const report = await call('insight', { repo, number }, { force });
      state.set(key, report);
      if (badge.host.dataset.key === key) show(report);
    } catch (e) {
      state.set(key, 'error');
      render(badge.button, { tone: 'unknown', label: 'Check failed', detail: 'Retry', title: (e as Error).message });
      badge.button.onclick = () => void load(true);
    }
  };

  const known = state.get(key);
  if (known && known !== 'error') return show(known);
  const auto = settings.mode === 'always' || (settings.mode === 'smart' && settings.signedIn);
  void peek('insight', { repo, number }).then((cached) => {
    if (badge.host.dataset.key !== key) return;
    if (cached) return show(cached);
    if (auto) return void load();
    render(badge.button, { tone: 'unknown', label: 'Can I work on this?', detail: 'Check' });
    badge.button.onclick = () => void load();
  });
}

/* ---------- repository sidebar badge ---------- */

const REPO_ID = 'contri-repo-badge';

function repoAnchor(): Element | null {
  const headings = document.querySelectorAll('.Layout-sidebar h2, [data-testid="repository-sidebar"] h2, aside h2');
  for (const h of headings) if (h.textContent?.trim() === 'About') return h;
  return null;
}

function repoBadge(repo: string, settings: Settings) {
  const anchor = repoAnchor();
  if (!anchor) return;
  const host = document.getElementById(REPO_ID);
  if (host && host.dataset.key === repo) {
    if (!host.isConnected || host.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', host);
    return;
  }
  host?.remove();
  const badge = createBadge(REPO_ID);
  badge.host.dataset.key = repo;
  anchor.insertAdjacentElement('afterend', badge.host);
  badge.button.onclick = openWidget;
  render(badge.button, { label: 'Contribution signals', detail: 'Open' });

  const auto = settings.mode === 'always' || (settings.mode === 'smart' && settings.signedIn);
  void (async () => {
    const overview = auto
      ? await call('overview', { repo }).catch(() => null)
      : await peek('overview', { repo }).catch(() => null);
    const team = await peek('team', { repo }).catch(() => null);
    if (badge.host.dataset.key !== repo) return;
    const parts: string[] = [];
    if (overview?.mergedExact != null) parts.push(`${count(overview.mergedExact)} PRs merged · 90d`);
    const median = team?.summary.pr.sufficient
      ? team.summary.pr.medianHours
      : team?.summary.issue.sufficient
        ? team.summary.issue.medianHours
        : null;
    if (median != null) parts.push(`team replies ~${hours(median)}`);
    if (!parts.length) return;
    const recent = overview ? overview.sample.weeks.slice(-4).reduce((n, w) => n + w.count, 0) : null;
    render(badge.button, {
      tone: recent === null ? undefined : recent > 0 ? 'good' : 'warn',
      label: parts[0],
      detail: parts[1],
      title: 'Open CONTRI for details',
    });
  })();
}

/* ---------- lifecycle ---------- */

export function startBadges(): () => void {
  const state = new Map<string, InsightReport | 'error'>();
  let settings: Settings | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;

  const loadSettings = async () => {
    const [prefs, connection] = await Promise.all([call('prefs', {}), call('connection', {})]);
    settings = { mode: prefs.badges, signedIn: connection.connected };
  };

  const tick = () => {
    if (!settings || settings.mode === 'off') return;
    const page = parsePage(location.href);
    if (!page.repo) return;
    if (page.issue) issueBadge(page.repo, page.issue, settings, state);
    else document.getElementById(ISSUE_ID)?.remove();
    const isRepoHome = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length === 2;
    if (isRepoHome) repoBadge(page.repo, settings);
    else document.getElementById(REPO_ID)?.remove();
  };

  // GitHub re-renders headers often; a cheap re-check re-attaches our badge without watching the DOM.
  const schedule = () => {
    if (timer) clearInterval(timer);
    tick();
    timer = setInterval(tick, 2000);
  };

  void loadSettings()
    .then(schedule)
    .catch(() => {});
  const stopNav = onNavigate(() => {
    void loadSettings()
      .then(schedule)
      .catch(() => {});
  });
  return () => {
    stopNav();
    if (timer) clearInterval(timer);
  };
}
