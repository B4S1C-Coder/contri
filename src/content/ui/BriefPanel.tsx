import { useState } from 'react';
import { buildBrief, type BriefEvidence, type BriefTask } from '../../core/brief';

const CHATS = [
  ['ChatGPT', 'https://chatgpt.com/'],
  ['Claude', 'https://claude.ai/new'],
  ['Gemini', 'https://gemini.google.com/app'],
] as const;

export function BriefPanel({
  item,
  evidence,
}: {
  item: { repo: string; title: string; number: number; url: string };
  evidence: BriefEvidence;
}) {
  const [task, setTask] = useState<BriefTask>('plan');
  const [status, setStatus] = useState('');
  const brief = buildBrief(item, task, evidence);
  return (
    <details className="cc-brief">
      <summary>Prepare a contribution brief</summary>
      <p className="cc-caption">
        A source-linked brief to paste into any AI chat. Nothing is sent automatically; that service&apos;s privacy
        policy applies.
      </p>
      <label>
        What do you need?
        <select value={task} onChange={(e) => setTask(e.target.value as BriefTask)}>
          <option value="plan">Plan my contribution</option>
          <option value="explain">Explain this issue</option>
          <option value="review">Self-review checklist for my PR</option>
        </select>
      </label>
      <textarea aria-label="Contribution brief preview" readOnly value={brief} rows={6} />
      <button
        className="cc-secondary"
        onClick={() =>
          void navigator.clipboard
            .writeText(brief)
            .then(() => setStatus('Copied. Paste it into your AI chat.'))
            .catch(() => setStatus('Copy is unavailable here. Select the text and copy it manually.'))
        }
      >
        Copy brief
      </button>
      {status && (
        <p role="status" className="cc-caption">
          {status}
        </p>
      )}
      <div className="cc-presets">
        {CHATS.map(([name, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer">
            Open {name} ↗
          </a>
        ))}
      </div>
    </details>
  );
}
