import { useState } from 'react';
import type { Saved } from '../../core/brief';
import { call } from '../../shared/protocol';
import { BellIcon, BookmarkIcon } from './icons';

export function SaveButton({ item }: { item: Saved }) {
  const [status, setStatus] = useState('');
  return (
    <div className="cc-inline-action">
      <button
        className="cc-ghost"
        onClick={() =>
          void call('save', { item })
            .then(() => setStatus('Saved to your shortlist'))
            .catch((e: Error) => setStatus(e.message))
        }
      >
        <BookmarkIcon size={14} /> Save
      </button>
      {status && (
        <span role="status" className="cc-caption">
          {status}
        </span>
      )}
    </div>
  );
}

export function WatchButton({ repo, number, title }: { repo: string; number: number; title: string }) {
  const [status, setStatus] = useState('');
  return (
    <div className="cc-inline-action">
      <button
        className="cc-ghost"
        onClick={() =>
          void call('watchAdd', { repo, number, title })
            .then(() => setStatus('Watching — CONTRI checks hourly and notifies you of changes'))
            .catch((e: Error) => setStatus(e.message))
        }
      >
        <BellIcon size={14} /> Watch
      </button>
      {status && (
        <span role="status" className="cc-caption">
          {status}
        </span>
      )}
    </div>
  );
}
