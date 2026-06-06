/**
 * Mirrors client state onto the address bar via history.replaceState — the
 * shared discipline for write-only URL projection:
 *   - reads the LIVE URL, so the locale prefix and any foreign params (utm, …)
 *     survive
 *   - lets the caller mutate ONLY the keys it owns
 *   - no-ops when nothing changed, so an already-correct URL never triggers a
 *     redundant history write or subscriber re-render
 *
 * Deliberately a plain function rather than a hook wrapping useEffect: each call
 * site keeps its own native useEffect, so react-hooks/exhaustive-deps still
 * checks that site's dependency array against the mutate closure.
 */
export function projectToUrl(mutate: (url: URL) => void) {
  const url = new URL(window.location.href);
  mutate(url);
  if (url.href === window.location.href) {
    return;
  }
  window.history.replaceState(null, "", url);
}
