"use client";

import { useEffect } from "react";
import { useMountedCompare } from "@/context/CompareProvider";
import { useCompareUrl } from "@/hooks/useCompareUrl";

/**
 * Projects the current compare state onto the address bar for the compare
 * page surface — and only the compare page.
 *
 * CompareContext is the single client-side source of truth for the lens
 * selection. The compare page's URL (`?ids=A,B,C`) is a derived projection
 * so the comparison can be linked, refreshed, or shared. Other surfaces
 * (lens list, lens detail) carry compare state via context only; their URLs
 * have nothing to sync, so this hook is never mounted there.
 *
 * Implementation note: `window.history.replaceState` is used instead of
 * `router.replace` because the latter triggers an RSC round-trip, which is
 * wasteful here — the new URL maps to the same page and the new compareIds
 * are already authoritative on the client. `history.replaceState` updates
 * the address bar without contacting the server; Next.js' monkey-patched
 * history API still notifies `usePathname` / `useSearchParams` consumers.
 */
export function useCompareUrlSync() {
  const { compareIds } = useMountedCompare();
  const { buildLocalizedCompareUrl } = useCompareUrl();

  useEffect(() => {
    window.history.replaceState(null, "", buildLocalizedCompareUrl(compareIds));
  }, [compareIds, buildLocalizedCompareUrl]);
}
