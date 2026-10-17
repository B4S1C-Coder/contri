import type { ReactNode } from 'react';
import type { Event } from '../../core/metrics';
import type { Verdict } from '../../core/verdict';
import { ago, time } from '../../shared/format';
import { safeHref } from '../../shared/repo';
import { CheckIcon, ExternalIcon, RefreshIcon, WarningIcon } from './icons';

export function Note({
  children,
  tone = 'warn',
  onRetry,
}: {
  children: ReactNode;
  tone?: 'warn' | 'info';
  /** Shows a "Try again" button so a failed request can be recovered in place. */
  onRetry?: () => void;
}) {
  return (
    <p className={`cc-note cc-note-${tone}`} role="status">
      <WarningIcon size={14} />
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="cc-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </p>
  );
}

export function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const safe = safeHref(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a href={safe} target="_blank" rel="noreferrer" className={className}>
      {children}
      <ExternalIcon size={11} />
    </a>
  );
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <p className="cc-loading" role="status">
      <span className="cc-spinner" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Observed({ event, label }: { event: Event | null; label: string }) {
  return (
    <div className="cc-observed">
      <span>{label}</span>
      {event ? (
        <Ext href={event.url}>
          {time(event.at)} · @{event.login} · {event.kind.toLowerCase()}
        </Ext>
      ) : (
        <strong>Not observed in this sample</strong>
      )}
    </div>
  );
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div title={hint}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function VerdictPill({ verdict, compact }: { verdict: Verdict; compact?: boolean }) {
  return (
    <div className={`cc-verdict cc-tone-${verdict.tone}`} title={verdict.detail}>
      {verdict.tone === 'good' ? <CheckIcon size={14} /> : <WarningIcon size={14} />}
      <span>
        <b>{verdict.label}</b>
        {!compact && <small>{verdict.detail}</small>}
      </span>
    </div>
  );
}

export function Checked({ at, onRefresh, busy }: { at: string; onRefresh?: () => void; busy?: boolean }) {
  return (
    <p className="cc-caption cc-checked">
      Checked {ago(at)}
      {onRefresh && (
        <button className="cc-icon-button" onClick={onRefresh} disabled={busy} aria-label="Fetch fresh evidence">
          <RefreshIcon size={12} />
        </button>
      )}
    </p>
  );
}

export function Warnings({ items, label = 'coverage notes' }: { items: string[]; label?: string }) {
  if (!items.length) return null;
  return (
    <details className="cc-warnings">
      <summary>
        {items.length} {label}
      </summary>
      {items.map((w, i) => (
        <p className="cc-caption" key={i}>
          {w}
        </p>
      ))}
    </details>
  );
}
