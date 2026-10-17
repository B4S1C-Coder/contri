import { useCallback, useEffect, useRef, useState } from 'react';
import { call, type Operation, type Operations } from '../../shared/protocol';

export type Request<T> = { value: T | null; error: string; loading: boolean; reload: (force?: boolean) => void };

/** Fetches through the background worker. Re-runs when the input changes; `reload(true)` bypasses the cache. */
export function useRequest<K extends Operation>(
  op: K,
  input: Operations[K]['input'],
  enabled = true,
): Request<Operations[K]['output']> {
  const [value, setValue] = useState<Operations[K]['output'] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const force = useRef(false);
  const key = JSON.stringify(input);

  useEffect(() => {
    setError('');
    if (!enabled) {
      setValue(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const forced = force.current;
    force.current = false;
    if (!forced) setValue(null);
    setLoading(true);
    call(op, JSON.parse(key) as Operations[K]['input'], { signal: controller.signal, force: forced })
      .then((v) => {
        if (!controller.signal.aborted) setValue(v);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted && e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [op, key, enabled, tick]);

  const reload = useCallback((fresh = false) => {
    force.current = fresh;
    setTick((t) => t + 1);
  }, []);

  return { value, error, loading, reload };
}
