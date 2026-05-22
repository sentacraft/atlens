"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useMountedCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { buildComparePath } from "@/lib/compare-url";

/**
 * Projects the current compare state onto the address bar for the compare
 * page surface — and only the compare page.
 *
 * `CompareContext` is the single client-side source of truth for the lens
 * selection. The compare page's URL (`?ids=A,B,C`) is a write-only derived
 * view so the comparison can be linked, refreshed, or shared. Other surfaces
 * (lens list, lens detail) carry compare state via context only; their URLs
 * have nothing to sync, so this hook is never mounted there.
 *
 * Why `window.history.replaceState` instead of `router.replace`: the latter
 * forces an RSC round-trip even though the new ids are already authoritative
 * on the client. `history.replaceState` (monkey-patched by Next.js) updates
 * the address bar without contacting the server while still notifying
 * `usePathname` / `useSearchParams` subscribers.
 *
 * Why this hook does NOT read `useSearchParams`: the URL only carries `ids`.
 * Anything else previously squatting on the query string (`preset`, `from`,
 * `lensId`) has been removed — `preset` is reverse-derived from `ids` where
 * needed, `from` / `lensId` were dead code. With nothing else to preserve,
 * the projection becomes a pure function of compare state, and the effect's
 * deps are all stable primitives. No race window between `useSearchParams`
 * updating synchronously after a router navigation and `compareIds` syncing
 * via `useLayoutEffect` moments later.
 */
export function useCompareUrlSync() {
  const { compareIds } = useMountedCompare();
  const mount = useEffectiveMount();
  const locale = useLocale();

  useEffect(() => {
    const url = buildComparePath(mount, compareIds, locale);

    // No-op when the URL already matches — avoids re-emitting a router event
    // (and the associated subscriber re-renders) for an already-correct URL.
    if (window.location.pathname + window.location.search === url) {
      return;
    }
    window.history.replaceState(null, "", url);
  }, [compareIds, mount, locale]);
}
