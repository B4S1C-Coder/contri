import { useCallback, useEffect, useRef, useState } from 'react';
import { call, type Operation, type Operations } from '../../shared/protocol';

export type Request<T> = { value: T | null; error: string; loading: boolean; reload: (force?: boolean) => void };

type Settled<T> = { request: string; base: string; value: T | null; error: string };

/**
 * Fetches through the background worker. Re-runs when the input changes; `reload(true)`
 * bypasses the cache. While a fresh copy of the same report loads, the previous value
 * stays visible. State is only set from async callbacks; loading is derived.
 */
export function useRequest<K extends Operation>(
  op: K,
  input: Operations[K]['input'],
  enabled = true,
): Request<Operations[K]['output']> {
  const [settled, setSettled] = useState<Settled<Operations[K]['output']>>({
    request: '',
    base: '',
    value: null,
    error: '',
  });
  const [tick, setTick] = useState(0);
  const force = useRef(false);
  const key = JSON.stringify(input);
  const base = `${op}:${key}`;
  const request = `${base}:${tick}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const forced = force.current;
    force.current = false;
    call(op, JSON.parse(key) as Operations[K]['input'], { signal: controller.signal, force: forced })
      .then((value) => {
        if (!controller.signal.aborted) setSettled({ request, base, value, error: '' });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted && e.name !== 'AbortError')
          setSettled({ request, base, value: null, error: e.message });
      });
    return () => controller.abort();
  }, [op, key, enabled, request, base]);

  const reload = useCallback((fresh = false) => {
    force.current = fresh;
    setTick((t) => t + 1);
  }, []);

  const current = enabled && settled.request === request;
  return {
    value: enabled && settled.base === base ? settled.value : null,
    error: current ? settled.error : '',
    loading: enabled && !current,
    reload,
  };
}
