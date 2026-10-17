export type Theme = 'light' | 'dark';

/**
 * Follows GitHub's own appearance setting (`data-color-mode` on <html>, including
 * "sync with system"). Both themes are the same CONTRI teal glass; dark is a deeper tint.
 */
export function githubTheme(): Theme {
  const mode = document.documentElement.dataset.colorMode;
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function watchTheme(callback: (theme: Theme) => void): () => void {
  const update = () => callback(githubTheme());
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', update);
  update();
  return () => {
    observer.disconnect();
    media.removeEventListener('change', update);
  };
}
