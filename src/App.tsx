import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CaretRight, ChartLineUp, Compass, GithubLogo, MagnifyingGlass, SealCheck, WarningCircle } from '@phosphor-icons/react';
import { analyze, clearCache, rankSearch, type Analysis } from './github';

import { GlassEffect } from './GlassEffect';
import { useActiveRepository } from './useActiveRepository';

type Page = 'overview' | 'evidence' | 'issues' | 'guide' | 'discover';
type Result = { data: Analysis; stale: boolean };
type Ranked = Awaited<ReturnType<typeof rankSearch>>;
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const relative = (value: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};
const compact = (value: number, limited = false) => `${limited ? '≥' : ''}${value}`;

function ActivityChart({ weeks }: { weeks: Analysis['activity']['weeks'] }) {
  const max = Math.max(1, ...weeks.map(w => w.count));
  const points = weeks.map((w, i) => `${22 + i * 24},${122 - (w.count / max) * 74}`).join(' ');
  const first = weeks[0]?.from;
  const last = weeks[weeks.length - 1]?.from;
  return <div className="chart" role="img" aria-label={`Merged pull requests by week over 90 days: ${weeks.map(w => w.count).join(', ')}`}>
    <svg viewBox="0 0 336 148" preserveAspectRatio="none" aria-hidden="true">
      <line x1="18" y1="126" x2="318" y2="126" className="chart-baseline" />
      <polyline points={points} className="chart-line" />
      {weeks.map((w, i) => <circle key={w.from} cx={22 + i * 24} cy={122 - (w.count / max) * 74} r="3.5" className="chart-dot" />)}
    </svg>
    <div className="chart-labels"><span>{first && date(first)}</span><span>Weekly merged PRs</span><span>{last && date(last)}</span></div>
  </div>;
}

function Status({ analysis }: { analysis: Analysis }) {
  if (analysis.repo.archived) return <span className="status quiet">Archived project</span>;
  if (analysis.repo.disabled) return <span className="status quiet">Disabled project</span>;
  if (!analysis.availability.pulls || !analysis.availability.commits) return <span className="status quiet">Partial evidence available</span>;
  if (analysis.activity.merged === 0 && analysis.activity.commits === 0) return <span className="status quiet">Little recent activity</span>;
  return <span className="status">Recent activity observed</span>;
}

function RepoOverview({ result, onPage }: { result: Result; onPage: (page: Page) => void }) {
  const { data, stale } = result;
  return <>
    <section className="hero">
      <div className="hero-head"><span className="eyebrow">PUBLIC GITHUB REPOSITORY</span><span className="hero-date">{stale ? 'Cached' : 'Checked'} {date(data.fetchedAt)}</span></div>
      <h1>{data.repo.full_name}</h1>
      <a className="repo-link" href={data.repo.html_url} target="_blank" rel="noreferrer">View repository <ArrowRight size={12} /></a>
      <Status analysis={data} />
      {data.availability.pulls ? <ActivityChart weeks={data.activity.weeks} /> : <p className="chart-unavailable">Activity chart unavailable</p>}
    </section>
    <main className="content">
      <h2>{data.repo.archived ? 'This project is archived.' : 'A clearer read on this repo.'}</h2>
      <p className="lead">{data.repo.description || 'No repository description provided.'}</p>
      {stale && <p className="notice"><WarningCircle size={18} /> GitHub is unavailable. Showing the last saved result.</p>}
      {data.warnings.map(w => <p className="notice" key={w}><WarningCircle size={18} /> {w}</p>)}
      <div className="stat-row"><div><strong>{data.availability.pulls ? compact(data.activity.merged, data.limited.pulls) : '—'}</strong><span>Merged PRs</span></div><div><strong>{data.availability.pulls ? compact(data.activity.authors, data.limited.pulls) : '—'}</strong><span>PR authors</span></div><div><strong>{data.availability.commits ? compact(data.activity.commits, data.limited.commits) : '—'}</strong><span>Linked commits</span></div></div>
      <p className="caption">Last 90 days · known bots excluded · commits count GitHub-linked human authors. ≥ means a lower bound.</p>
      <div className="insight"><div className="insight-icon"><ChartLineUp size={20} /></div><div><strong>Project-team response</strong><p>{data.response.sufficient ? `${data.response.replied} of ${data.response.sampled} sampled outside-contributor PRs received a team reply.` : 'Insufficient evidence from recent outside-contributor PRs.'}</p></div></div>
      <button className="primary" onClick={() => onPage('evidence')}>Inspect the evidence <ArrowRight size={20} /></button>
      <button className="text-action" onClick={() => onPage('issues')}>Find an issue <ArrowRight size={18} /></button>
      <nav className="section-nav" aria-label="Repository sections"><button onClick={() => onPage('guide')}><BookOpen size={18} /> Contribution guide <CaretRight size={16} /></button><button onClick={() => onPage('discover')}><Compass size={18} /> Compare other repositories <CaretRight size={16} /></button></nav>
    </main>
  </>;
}

function Evidence({ data }: { data: Analysis }) {
  return <main className="content inner"><span className="eyebrow dark">THE SOURCE, NOT A SCORE</span><h2>Project-team response</h2>
    <p className="lead">A small sample of recent outside-contributor PRs. GitHub owner, member, or collaborator labels are used as project-team signals.</p>
    <div className="evidence-summary"><strong>{data.response.sampled ? `${data.response.replied} / ${data.response.sampled}` : '—'}</strong><span>sampled PRs with a team reply</span></div>
    {data.response.sufficient && data.response.medianHours !== null ? <p className="caption">Median first reply: {data.response.medianHours < 24 ? `${Math.round(data.response.medianHours)} hours` : `${Math.round(data.response.medianHours / 24)} days`}.</p> : <p className="notice"><WarningCircle size={18} /> Insufficient evidence for a response pattern.</p>}
    {data.samples.length ? <div className="list">{data.samples.map(s => <a className="list-row" key={s.pull.number} href={s.url || s.pull.html_url} target="_blank" rel="noreferrer"><span><strong>#{s.pull.number} {s.pull.title}</strong><small>{s.hours === null ? 'No project-team reply observed in sampled history' : `First team reply in ${s.hours < 24 ? `${Math.round(s.hours)}h` : `${Math.round(s.hours / 24)}d`}`}</small>{s.responder && <small className="response-evidence">@{s.responder} · {s.kind}</small>}</span><ArrowRight size={17} /></a>)}</div> : <p className="empty">No recent outside-contributor PRs were available to sample.</p>}
    <p className="caption">Replies and reviews are sampled from public GitHub data. A missing reply in this sample does not prove a project is unwelcoming.</p>
  </main>;
}

function Issues({ data }: { data: Analysis }) {
  return <main className="content inner"><span className="eyebrow dark">CONTRIBUTION OPENINGS</span><h2>Find a useful start.</h2><p className="lead">Open issues labeled good first issue or help wanted. Check the discussion before you begin.</p>
    {data.limited.issues && <p className="notice"><WarningCircle size={18} /> Only 100 recently updated issues were checked.</p>}
    {!data.availability.issues ? <p className="notice">Issue opportunities could not be loaded. Open the full list on GitHub.</p> : data.issues.length ? <div className="list">{data.issues.map(issue => <a className="list-row" key={issue.number} href={issue.html_url} target="_blank" rel="noreferrer"><span><strong>#{issue.number} {issue.title}</strong><small>{issue.labels.map(l => l.name).join(' · ')} · opened {relative(issue.created_at)}</small><small>{issue.assignee ? `Assigned to ${issue.assignee.login}; check before starting` : 'No assignee shown; check for linked work'} · {issue.comments} comments · updated {relative(issue.updated_at)}</small></span><ArrowRight size={17} /></a>)}</div> : <p className="empty">No matching open issues appeared in the recent API sample. Try the repository’s full issue list.</p>}
    <a className="secondary-link" href={`${data.repo.html_url}/issues`} target="_blank" rel="noreferrer">Browse all issues on GitHub <ArrowRight size={16} /></a>
  </main>;
}

function Guide({ data }: { data: Analysis }) {
  const files = data.community?.files;
  const rows = [
    ['README', files?.readme?.html_url], ['License', files?.license?.html_url || data.repo.license?.html_url],
    ['Contributing guide', files?.contributing?.html_url], ['Code of conduct', files?.code_of_conduct?.html_url],
    ['Issue template', files?.issue_template?.html_url], ['Pull request template', files?.pull_request_template?.html_url]
  ];
  return <main className="content inner"><span className="eyebrow dark">BEFORE YOU CONTRIBUTE</span><h2>Read the project’s way of working.</h2><p className="lead">These links show documentation GitHub detects. Read the actual instructions before opening a PR.</p>
    {data.repo.fork && <p className="notice"><WarningCircle size={18} /> This is a fork; GitHub’s community profile may be unavailable.</p>}
    {!data.availability.community && <p className="notice">The community profile is unavailable. Check the repository and any organization-wide instructions directly.</p>}
    <p className="guide-note">Start with the README, follow the contributing guide, and check whether the project asks for a discussion before a PR. The linked documents contain the project’s own instructions.</p>
    <div className="list">{rows.map(([label, link]) => link ? <a className="list-row" href={link} target="_blank" rel="noreferrer" key={label}><span><strong>{label}</strong><small>Open on GitHub</small></span><ArrowRight size={17} /></a> : <div className="list-row" key={label}><span><strong>{label}</strong><small>Not detected in the public community profile</small></span></div>)}</div>
    <p className="caption">A document’s presence does not prove it is current or that contribution will be easy.</p>
  </main>;
}

function Discovery({ openRepo }: { openRepo: (name: string) => void }) {
  const [query, setQuery] = useState(''); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Ranked | null>(null); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!query.trim() || loading) return; setLoading(true); setResult(null); setError(''); try { setResult(await rankSearch(query)); } catch (e) { setError(e instanceof Error ? e.message : 'Search unavailable'); } finally { setLoading(false); } };
  return <main className="content inner discover"><span className="eyebrow dark">EXPLORE PUBLIC GITHUB</span><h2>Find work worth doing.</h2><p className="lead">Search a topic, language, or repository. We compare up to five returned candidates.</p>
    <form className="search" onSubmit={submit}><MagnifyingGlass size={20} /><input aria-label="Search repositories" placeholder="Topic, language, or project" value={query} onChange={e => setQuery(e.target.value)} /><button type="submit" disabled={loading || !query.trim()}>{loading ? 'Reading…' : 'Search'}</button></form>
    <p className="search-hint">Try <button className="query-example" onClick={() => setQuery('climate language:Python')}>climate language:Python</button> or your favorite project.</p>
    {loading && <p className="loading-inline" role="status">Comparing recent activity across up to five repositories…</p>}
    {error && <p className="notice"><WarningCircle size={18} /> {error}</p>}
    {result && <><p className="caption">Compared {result.compared} of {result.rows.length} recently updated candidates. GitHub found about {result.total.toLocaleString()} matches. Ranked by sampled human merges, authors, then linked commits.{result.incomplete ? ' GitHub reported incomplete search results.' : ''}</p>{result.rows.length === 0 && <p className="empty">No matches found. Try a broader topic or remove a filter.</p>}<div className="list">{result.rows.map(({ repo, metrics, limited, error: rowError }, index) => <button className="list-row" onClick={() => openRepo(repo.full_name)} key={repo.full_name}><span><small>{metrics ? `#${index + 1} IN THIS COMPARISON` : 'EVIDENCE UNAVAILABLE'}</small><strong>{repo.full_name}</strong><small>{metrics ? `${metrics.merged} merged PRs · ${metrics.authors} authors · ${metrics.commits} linked commits` : rowError || 'Data unavailable'}</small>{limited && <small>Limited sample; counts are lower bounds</small>}</span><ArrowRight size={17} /></button>)}</div></>}
    {!result && !loading && <p className="empty">Start with a topic you care about. The list will show observed activity, not a promise of acceptance.</p>}
  </main>;
}

export function App() {
  const [page, setPage] = useState<Page>('discover'); const [name, setName] = useState(''); const [input, setInput] = useState('');
  const [result, setResult] = useState<Result | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [cacheMessage, setCacheMessage] = useState('');
  const request = useRef(0);
  const current = useMemo(() => result?.data.repo.full_name || name, [result, name]);
  const openRepo = async (value: string) => { const chosen = value.trim(); if (!chosen) return; const id = ++request.current; setName(chosen); setResult(null); setInput(chosen); setLoading(true); setError(''); setPage('overview'); try { const next = await analyze(chosen); if (request.current === id) setResult(next); } catch (e) { if (request.current === id) { setResult(null); setError(e instanceof Error ? e.message : 'Repository unavailable'); } } finally { if (request.current === id) setLoading(false); } };
  const { following, setFollowing, detected } = useActiveRepository(value => void openRepo(value));
  const manualOpen = (value: string) => { setFollowing(false); void openRepo(value); };
  return <div className="app"><GlassEffect /><header className="topbar"><button className="brand" onClick={() => setPage('discover')} aria-label="Contributor Compass home"><img src="/icon-32.png" alt="" /><span>CONTRIBUTOR COMPASS</span></button><a href="https://github.com/alphasafal/contributor-compass" target="_blank" rel="noreferrer" aria-label="Project source on GitHub"><GithubLogo size={21} /></a></header><div className="follow-bar"><span role="status">{following ? detected ? `Following ${detected}` : 'Open a public GitHub repository to follow' : 'Manual exploration'}</span><button aria-pressed={following} onClick={() => setFollowing(!following)}>{following ? 'Pause' : 'Follow tab'}</button></div><div className="widget-scroll">
    {page !== 'discover' && <div className="subbar"><button onClick={() => setPage('discover')}><ArrowLeft size={16} /> Explore</button>{page !== 'overview' && result && <button onClick={() => setPage('overview')}>Overview <CaretRight size={16} /></button>}</div>}
    {page === 'discover' && <><div className="quick-open"><form onSubmit={e => { e.preventDefault(); manualOpen(input); }}><input aria-label="Open a repository" placeholder="Or enter owner/repo" value={input} onChange={e => setInput(e.target.value)} /><button type="submit" aria-label="Open repository"><ArrowRight size={18} /></button></form></div><Discovery openRepo={manualOpen} /></>}
    {page !== 'discover' && loading && <main className="content inner loading"><div className="spinner" /><h2>Reading public evidence…</h2><p className="lead">This can take a moment because GitHub limits anonymous requests.</p></main>}
    {page !== 'discover' && !loading && error && <main className="content inner"><WarningCircle size={28} /><h2>We couldn’t read this repo.</h2><p className="lead">{error}</p><button className="primary" onClick={() => void openRepo(current)}>Try again <ArrowRight size={18} /></button></main>}
    {page === 'overview' && !loading && result && <RepoOverview result={result} onPage={setPage} />}
    {page === 'evidence' && !loading && result && <Evidence data={result.data} />}
    {page === 'issues' && !loading && result && <Issues data={result.data} />}
    {page === 'guide' && !loading && result && <Guide data={result.data} />}
    </div><footer><span className="footer-note"><SealCheck size={15} /> Public GitHub data · no account required</span><div className="footer-actions"><a href="https://github.com/alphasafal/contributor-compass/blob/main/PRIVACY.md" target="_blank" rel="noreferrer">Privacy & data</a><button onClick={async () => { await clearCache(); setCacheMessage('Local cached reports cleared.'); }}>Clear cached reports</button></div>{cacheMessage && <p role="status">{cacheMessage}</p>}</footer>
  </div>;
}
