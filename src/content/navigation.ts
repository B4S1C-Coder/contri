/**
 * GitHub is a single-page app (Turbo + React). Instead of observing the whole DOM,
 * listen to the navigation signals the browser and GitHub already emit.
 */
export function onNavigate(callback: (href: string) => void): () => void {
  let previous = location.href;
  const check = () => {
    if (location.href === previous) return;
    previous = location.href;
    callback(previous);
  };
  const events = ['turbo:load', 'turbo:render', 'popstate', 'pageshow'];
  for (const name of events) window.addEventListener(name, check);
  document.addEventListener('turbo:load', check);

  const nav = (window as unknown as { navigation?: EventTarget }).navigation;
  const onNavigateSuccess = () => setTimeout(check, 0);
  nav?.addEventListener('navigatesuccess', onNavigateSuccess);

  // Fallback for browsers without the Navigation API: a cheap string comparison.
  const timer = nav ? undefined : setInterval(check, 1500);

  return () => {
    for (const name of events) window.removeEventListener(name, check);
    document.removeEventListener('turbo:load', check);
    nav?.removeEventListener('navigatesuccess', onNavigateSuccess);
    if (timer) clearInterval(timer);
  };
}
