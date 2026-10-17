import { useState } from 'react';
import type { TeamReport } from '../../background/reports/team';
import { describeBasis } from '../../core/team';
import { hours, plural, time } from '../../shared/format';
import { Checked, Ext, Loading, Note, Observed, Stat, Warnings } from './common';
import { useRequest } from './hooks';
import { ArrowIcon } from './icons';

function Responses({ data, kind }: { data: TeamReport; kind: 'pr' | 'issue' }) {
  // Waiting time is measured at the moment the evidence was checked, so renders stay pure.
  const checked = Date.parse(data.checkedAt);
  const s = data.summary[kind];
  const items = data.groups[kind];
  return (
    <div className="cc-block">
      <h3>
        {kind === 'pr' ? 'Pull requests' : 'Issues'} from outside contributors
        <span>
          {s.answered}/{s.sampled} answered
        </span>
      </h3>
      <div className="cc-metrics">
        <Stat value={s.sufficient ? hours(s.medianHours) : '—'} label="Median first team reply" />
        <Stat value={s.sufficient ? hours(s.averageHours) : '—'} label="Average first team reply" />
      </div>
      <p className="cc-caption">
        {s.sufficient
          ? 'Unanswered items are listed below and excluded from the timings.'
          : 'Not enough evidence yet: timings need at least 3 answered items.'}{' '}
        {s.unanswered} without a team reply.
      </p>
      {items.length > 0 && (
        <details>
          <summary>Inspect {plural(items.length, 'sampled item')}</summary>
          {items.map((item) => (
            <div className="cc-row" key={item.number}>
              <Ext href={item.response?.url || item.url}>
                #{item.number} {item.title}
              </Ext>
              <small>
                by @{item.author} ·{' '}
                {item.partial
                  ? 'long discussion; timing unknown'
                  : item.hours === null
                    ? `no team reply yet · waiting ${hours((checked - Date.parse(item.createdAt)) / 3_600_000)}`
                    : `first team reply in ${hours(item.hours)}${item.response ? ` by @${item.response.login}` : ''}`}
              </small>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function TeamData({ data, onRefresh, busy }: { data: TeamReport; onRefresh: () => void; busy: boolean }) {
  return (
    <>
      <Observed event={data.latestTeam} label="Latest team activity in the sample" />
      <Responses data={data} kind="pr" />
      <Responses data={data} kind="issue" />
      <h3>People who maintain this project</h3>
      {data.members.length ? (
        data.members.map((m) => (
          <div className="cc-person" key={m.login}>
            <div className="cc-avatar" aria-hidden="true">
              {m.login.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <Ext href={`https://github.com/${m.login}`}>@{m.login}</Ext>
              <small>{describeBasis(m.basis)}</small>
              <small>
                {m.responses
                  ? `${plural(m.responses, 'reply', 'replies')} to outside contributors · ${plural(m.reviews, 'review')}`
                  : 'No replies in this sample'}
              </small>
              {m.latest && <Ext href={m.latest.url}>Last seen {time(m.latest.at)}</Ext>}
            </div>
          </div>
        ))
      ) : (
        <p>No maintainers identified from public evidence.</p>
      )}
      <p className="cc-caption">
        Maintainers are found from GitHub team badges, who labels, assigns and merges, CODEOWNERS and the repository
        owner. It is public evidence, not a complete roster or online status.
      </p>
      <Checked at={data.checkedAt} onRefresh={onRefresh} busy={busy} />
      <Warnings items={data.warnings} label="sampling notes" />
    </>
  );
}

export function TeamTab({ repo, signedIn }: { repo: string; signedIn: boolean }) {
  const [started, setStarted] = useState(false);
  const result = useRequest('team', { repo }, started);
  if (!started)
    return (
      <section className="cc-section">
        <span className="cc-eyebrow">PEOPLE BEHIND THE PROJECT</span>
        <h2>Will someone reply?</h2>
        <p>
          See how quickly the project team answers outside contributors, who actually maintains it, and who is waiting
          without a reply.
        </p>
        <button className="cc-primary" onClick={() => setStarted(true)}>
          Analyze team responses <ArrowIcon size={16} />
        </button>
        <p className="cc-caption">
          {signedIn
            ? 'Signed in: about 2 GitHub requests. Results are cached for 6 hours.'
            : 'Anonymous: about 25 GitHub requests of your 60 per hour. Sign in to make this nearly free.'}
        </p>
      </section>
    );
  return (
    <section className="cc-section">
      <span className="cc-eyebrow">PEOPLE BEHIND THE PROJECT</span>
      <h2>Team responses</h2>
      {result.loading && !result.value && <Loading>Reading public discussions and reviews…</Loading>}
      {result.error && <Note onRetry={() => result.reload(true)}>{result.error}</Note>}
      {result.value && <TeamData data={result.value} onRefresh={() => result.reload(true)} busy={result.loading} />}
    </section>
  );
}
