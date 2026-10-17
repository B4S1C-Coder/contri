import type { Repo } from '../../background/reports/repo';
import type { OverviewReport } from '../../background/reports/overview';
import { recentMerges } from '../../core/metrics';
import { count, hours, time } from '../../shared/format';
import { Checked, Ext, Loading, Note, Observed, Stat, Warnings } from './common';
import { useRequest } from './hooks';
import { ArrowIcon } from './icons';
import { SaveButton } from './SaveButton';

function Chart({ data }: { data: OverviewReport['sample'] }) {
  const max = Math.max(1, ...data.weeks.map((w) => w.count));
  const points = data.weeks.map((w, i) => [5 + i * 25, 55 - (w.count / max) * 45] as const);
  return (
    <div className="cc-chart">
      <svg
        viewBox="0 0 310 64"
        role="img"
        aria-label={`Human merged PRs per week over 90 days: ${data.weeks.map((w) => w.count).join(', ')}`}
      >
        <path
          d={`M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
        ))}
      </svg>
      <div>
        <span>90 days · human merges per week</span>
        <span>{data.limited ? 'Latest 100 merges' : 'Complete window'}</span>
      </div>
    </div>
  );
}

function Activity({ data, onRefresh, busy }: { data: OverviewReport; onRefresh: () => void; busy: boolean }) {
  const recent = recentMerges(data.sample);
  return (
    <>
      <div className="cc-metrics">
        <Stat
          value={count(data.mergedExact)}
          label="PRs merged · 90d"
          hint="Exact count from GitHub search, excluding common bots (Dependabot, Renovate, GitHub Actions, pre-commit)."
        />
        <Stat
          value={data.sample.available ? `${data.sample.limited ? '≥' : ''}${count(data.sample.authors)}` : '—'}
          label="Human PR authors"
        />
        <Stat
          value={data.commits.count === null ? '—' : `${data.commits.limited ? '≥' : ''}${count(data.commits.count)}`}
          label="Commits · 90d"
        />
      </div>
      <div className={`cc-signal ${recent === null ? '' : recent ? 'cc-tone-good' : 'cc-tone-warn'}`}>
        {recent === null
          ? 'Recent merge activity could not be loaded. See the notes below.'
          : recent
            ? `${recent} human merges in the last four weeks.`
            : 'No human merges observed in the last four weeks.'}
      </div>
      {data.sample.available && <Chart data={data.sample} />}
      <div className="cc-facts">
        <span>
          Open issues <b>{count(data.openIssues)}</b>
        </span>
        <span>
          Open PRs <b>{count(data.openPRs)}</b>
        </span>
        <span>
          Median time to merge{' '}
          <b>{data.mergeTiming.sufficient ? hours(data.mergeTiming.medianHours) : 'Small sample'}</b>
        </span>
        <span>
          Merges timed <b>{data.mergeTiming.answered}</b>
        </span>
      </div>
      <Observed event={data.latest} label="Latest human commit or merge" />
      {data.release && (
        <div className="cc-observed">
          <span>Latest release</span>
          <Ext href={data.release.url}>
            {data.release.name} · {time(data.release.publishedAt)}
          </Ext>
        </div>
      )}
      <Checked at={data.checkedAt} onRefresh={onRefresh} busy={busy} />
      <Warnings items={data.warnings} />
    </>
  );
}

export function OverviewTab({
  repo,
  meta,
  go,
}: {
  repo: string;
  meta: Repo;
  go: (tab: 'issues' | 'guide' | 'team') => void;
}) {
  const activity = useRequest('overview', { repo });
  return (
    <section className="cc-section">
      <span className="cc-eyebrow">REPOSITORY OVERVIEW</span>
      <h2>{meta.name}</h2>
      <p className="cc-description">{meta.description || 'No description provided.'}</p>
      <div className="cc-tags">
        {[
          meta.language,
          meta.license,
          meta.archived ? 'Archived' : null,
          meta.fork ? 'Fork' : null,
          ...meta.topics.slice(0, 3),
        ]
          .filter(Boolean)
          .map((v) => (
            <span key={v}>{v}</span>
          ))}
      </div>
      {meta.archived && <Note>This repository is archived and read-only. Contributions will not be merged.</Note>}
      {meta.fork && (
        <Note tone="info">
          This is a fork{meta.parent ? ` of ${meta.parent}` : ''}. Most contributions belong upstream.
        </Note>
      )}
      <div className="cc-facts">
        <span>
          Stars <b>{count(meta.stars)}</b>
        </span>
        <span>
          Forks <b>{count(meta.forks)}</b>
        </span>
      </div>
      {activity.loading && !activity.value && <Loading>Reading 90-day activity…</Loading>}
      {activity.error && <Note>{activity.error}</Note>}
      {activity.value && (
        <Activity data={activity.value} onRefresh={() => activity.reload(true)} busy={activity.loading} />
      )}
      <div className="cc-actions">
        <button className="cc-primary" onClick={() => go('issues')}>
          Find an issue <ArrowIcon size={15} />
        </button>
        <button className="cc-secondary" onClick={() => go('team')}>
          Will someone reply?
        </button>
      </div>
      <SaveButton item={{ repo, url: meta.url, title: repo, note: '' }} />
    </section>
  );
}
