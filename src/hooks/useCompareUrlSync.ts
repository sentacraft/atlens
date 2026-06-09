"use client";

import { useEffect } from "react";
import { useCompare } from "@/context/CompareProvider";
import { projectToUrl } from "@/lib/url/projection";

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
 * the projection becomes a pure function of compare state — the effect
 * depends only on `compareIds`.
 */
export function useCompareUrlSync() {
  const { compareIds } = useCompare();

  useEffect(() => {
    projectToUrl((url) => {
      // Own only `ids`; foreign params are left intact. Assign the query as a
      // string (not url.searchParams.set) so the commas in `ids` stay raw
      // (`A,B`) rather than percent-encoded.
      url.searchParams.delete("ids");
      const rest = url.searchParams.toString();
      url.search =
        compareIds.length > 0
          ? (rest ? `${rest}&` : "") + `ids=${compareIds.join(",")}`
          : rest;
    });
  }, [compareIds]);
}
