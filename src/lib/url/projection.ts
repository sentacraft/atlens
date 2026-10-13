// A plain function, not a hook, so exhaustive-deps still checks each call site's own effect.
export function projectToUrl(mutate: (url: URL) => void) {
  const url = new URL(window.location.href);
  mutate(url);
  if (url.href === window.location.href) {
    return;
  }
  window.history.replaceState(null, "", url);
}
