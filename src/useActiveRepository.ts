import { useEffect, useRef, useState } from 'react';
import { parseGitHubUrl } from './github';

/** Observe only the active tab in this panel's window; never persist tab URLs. */
export function useActiveRepository(onRepository: (repo: string) => void) {
  const [following, setFollowing] = useState(true);
  const [detected, setDetected] = useState<string | null>(null);
  const callback = useRef(onRepository);
  callback.current = onRepository;
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let sequence = 0;
    let previous: string | null = null;
    const read = async () => {
      const id = ++sequence;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (disposed || id !== sequence) return;
        const repo = parseGitHubUrl(tabs[0]?.url || '');
        setDetected(repo);
        if (following && repo && repo.toLowerCase() !== previous?.toLowerCase()) callback.current(repo);
        previous = repo;
      } catch { if (!disposed) setDetected(null); }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void read(), 350); };
    const updated = (_id: number, change: chrome.tabs.TabChangeInfo) => {
      if (change.url || change.status === 'complete') schedule();
    };
    chrome.tabs.onActivated.addListener(schedule);
    chrome.tabs.onUpdated.addListener(updated);
    void read();
    return () => { disposed = true; clearTimeout(timer); chrome.tabs.onActivated.removeListener(schedule); chrome.tabs.onUpdated.removeListener(updated); };
  }, [following]);
  return { following, setFollowing, detected };
}
