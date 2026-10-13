import "server-only";
import { getAllLenses } from "@/lib/lens/data";
import { lensRef, type LensLinkIndex } from "@/lib/ai/lens-ref";

// Every mount: after a mount switch, earlier segments stay on screen and their links must work.
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
