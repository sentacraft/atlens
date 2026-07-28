import { getAllLenses } from "@/lib/lens/data";
import { lensRef } from "@/lib/ai/lens-ref";
import type { Mount } from "@/lib/types";

// ref -> lens, so a `lens:<ref>` Iris writes in its prose can be turned back into a link
// to that lens's page. One derivation of the catalogue with one owner: it is the same
// map for every caller, and the AskIris route is server-rendered per request, so a
// caller building it inline would re-hash the whole catalogue on every page view.
//
// Every mount, not just the active one — a mount switch keeps earlier segments of the
// conversation on screen and their links have to keep working.
export type LensLinkIndex = Record<string, { id: string; mount: Mount }>;

const cache = new Map<string, LensLinkIndex>();

export function getLensLinkIndex(locale: string): LensLinkIndex {
  let index = cache.get(locale);
  if (!index) {
    index = Object.fromEntries(
      getAllLenses(locale).map((lens) => [lensRef(lens.id), { id: lens.id, mount: lens.mount }]),
    );
    cache.set(locale, index);
  }
  return index;
}
