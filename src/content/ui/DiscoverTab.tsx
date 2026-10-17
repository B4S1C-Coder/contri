import { useState } from 'react';
import type { DiscoverInput } from '../../background/reports/discover';
import { count } from '../../shared/format';
import { Loading, Note, Warnings } from './common';
import { useRequest } from './hooks';
import { ArrowIcon, SearchIcon } from './icons';

export function DiscoverTab({
  onSelect,
  signedIn,
  login,
}: {
  onSelect: (repo: string) => void;
  signedIn: boolean;
  login?: string;
}) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('');
  const [input, setInput] = useState<DiscoverInput | null>(null);
  const result = useRequest('discover', input ?? { query: '', language: '', personalize: false }, input !== null);

  return (
    <section className="cc-section">
      <span className="cc-eyebrow">FIND A PROJECT</span>
      <h2>Where you&apos;ll be welcome.</h2>
      <p>
        Active projects with open beginner issues, ranked by recent human merges
        {signedIn ? ' and the number of good first issues' : ''}.
      </p>
      {signedIn && (
        <button className="cc-primary" onClick={() => setInput({ query: '', language: '', personalize: true })}>
          Match projects to my languages{login ? ` (@${login})` : ''} <ArrowIcon size={15} />
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setInput({ query: text, language, personalize: false });
        }}
      >
        <div className="cc-search">
          <SearchIcon size={15} />
          <input
            aria-label="Keyword"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Keyword, e.g. accessibility"
            maxLength={80}
          />
          <button aria-label="Find projects">
            <ArrowIcon size={16} />
          </button>
        </div>
        <div className="cc-filters">
          <input
            aria-label="Language"
            placeholder="Language, e.g. Python"
            value={language}
            maxLength={30}
            onChange={(e) => setLanguage(e.target.value.replace(/[^\w+#.-]/g, ''))}
          />
        </div>
      </form>
      {!input && (
        <div className="cc-suggestions">
          {['documentation', 'accessibility', 'developer-tools', 'education'].map((q) => (
            <button
              key={q}
              onClick={() => {
                setText(q);
                setInput({ query: q, language, personalize: false });
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      {result.loading && <Loading>Comparing projects…</Loading>}
      {result.error && <Note onRetry={() => result.reload(true)}>{result.error}</Note>}
      {result.value && (
        <>
          <p className="cc-caption">
            {result.value.personalized ? `Matched to ${result.value.languages.join(' and ')}. ` : ''}
            {result.value.rows.length} of about {count(result.value.total)} projects compared.
          </p>
          {result.value.rows.map((r, i) => (
            <button className="cc-result" key={r.repo} onClick={() => onSelect(r.repo)}>
              <strong>
                {i + 1}. {r.repo}
                <ArrowIcon size={14} />
              </strong>
              {r.description && <span>{r.description}</span>}
              <small>
                {[
                  r.merges90 === null ? null : `${r.merges90} human merges (of latest 50)`,
                  r.goodFirstIssues === null ? null : `${r.goodFirstIssues} good first issues`,
                  r.language,
                  `${count(r.stars)} stars`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </button>
          ))}
          {!result.value.rows.length && <p>No matches. Try another keyword or language.</p>}
          <Warnings items={result.value.warnings} label="notes" />
        </>
      )}
    </section>
  );
}
