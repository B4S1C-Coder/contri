import { useEffect, useState } from 'react';
import type { OverviewReport } from '../../background/reports/overview';
import type { Saved } from '../../core/brief';
import { ago, count } from '../../shared/format';
import { call, type Watched } from '../../shared/protocol';
import { Ext } from './common';

function WatchList() {
  const [items, setItems] = useState<Watched[]>([]);
  const [status, setStatus] = useState('');
  useEffect(() => {
    void call('watchList', {})
      .then(setItems)
      .catch((e: Error) => setStatus(e.message));
  }, []);
  return (
    <>
      <h3>Watched issues</h3>
      <p className="cc-caption">
        Checked hourly. You get a notification when a watched issue is unassigned, gets a pull request, goes quiet or
        closes.
      </p>
      {status && <p className="cc-caption">{status}</p>}
      {!items.length && <p className="cc-caption">Use Watch on any issue to follow it here.</p>}
      {items.map((w) => (
        <div className="cc-row" key={w.url}>
          <Ext href={w.url}>
            {w.repo}#{w.number} {w.title}
          </Ext>
          <small>
            {w.lastChange ?? 'No changes yet'}
            {w.checkedAt ? ` · checked ${ago(w.checkedAt)}` : ' · first check within the hour'}
          </small>
          <button
            className="cc-link-button"
            onClick={() =>
              void call('watchRemove', { url: w.url })
                .then(setItems)
                .catch((e: Error) => setStatus(e.message))
            }
          >
            Stop watching
          </button>
        </div>
      ))}
    </>
  );
}

export function SavedTab({ onSelect }: { onSelect: (repo: string) => void }) {
  const [items, setItems] = useState<Saved[]>([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, OverviewReport>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void call('saved', {})
      .then(setItems)
      .catch((e: Error) => setStatus(e.message));
  }, []);

  const repos = [...new Set(items.map((i) => i.repo))];
  const compare = async () => {
    setBusy(true);
    setReports({});
    try {
      for (const repo of selected) {
        try {
          const value = await call('overview', { repo });
          setReports((r) => ({ ...r, [repo]: value }));
        } catch (e) {
          setStatus(`${repo}: ${(e as Error).message}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cc-section">
      <span className="cc-eyebrow">YOUR SHORTLIST</span>
      <h2>Saved for later.</h2>
      <p className="cc-caption">Only what you save is stored, in this browser profile. Up to 50 items.</p>
      {status && (
        <p role="status" className="cc-caption">
          {status}
        </p>
      )}
      {!items.length && <p>Save a project or issue to come back to it.</p>}
      {items.map((item) => (
        <div className="cc-block" key={item.url}>
          <Ext href={item.url}>{item.title}</Ext>
          <button className="cc-link-button" onClick={() => onSelect(item.repo)}>
            Open {item.repo} in CONTRI
          </button>
          <textarea
            aria-label={`Notes for ${item.title}`}
            value={item.note}
            maxLength={2000}
            placeholder="Private notes"
            onChange={(e) =>
              setItems((old) => old.map((i) => (i.url === item.url ? { ...i, note: e.target.value } : i)))
            }
          />
          <div className="cc-presets">
            <button
              onClick={() =>
                void call('save', { item, updateNote: true })
                  .then(() => setStatus('Note saved'))
                  .catch((e: Error) => setStatus(e.message))
              }
            >
              Save note
            </button>
            <button
              onClick={() =>
                void call('removeSaved', { url: item.url })
                  .then(setItems)
                  .catch((e: Error) => setStatus(e.message))
              }
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      {repos.length > 1 && (
        <>
          <h3>Compare up to three projects</h3>
          {repos.map((repo) => (
            <label className="cc-check" key={repo}>
              <input
                type="checkbox"
                checked={selected.includes(repo)}
                disabled={busy || (!selected.includes(repo) && selected.length === 3)}
                onChange={(e) =>
                  setSelected((old) => (e.target.checked ? [...old, repo] : old.filter((r) => r !== repo)))
                }
              />
              {repo}
            </label>
          ))}
          <button className="cc-secondary" disabled={busy || !selected.length} onClick={() => void compare()}>
            {busy ? 'Reading evidence…' : 'Compare activity'}
          </button>
          {Object.entries(reports).map(([repo, r]) => (
            <div className="cc-row" key={repo}>
              <strong>{repo}</strong>
              <small>
                {count(r.mergedExact)} PRs merged in 90 days · {r.sample.authors} human authors · {r.openIssues ?? '—'}{' '}
                open issues
              </small>
            </div>
          ))}
        </>
      )}
      <WatchList />
    </section>
  );
}
