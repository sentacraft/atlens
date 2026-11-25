import "server-only";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { getAllLenses } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";
import { lensRef, type LensLinkIndex } from "@/lib/ai/lens-ref";

const BRAND_NAMES: Record<string, Record<string, string>> = { en: en.Brands, zh: zh.Brands };

// Every mount: after a mount switch, earlier segments stay on screen and their links must work.
const cache = new Map<string, LensLinkIndex>();

export function getLensLinkIndex(locale: string): LensLinkIndex {
  let index = cache.get(locale);
  if (!index) {
    const brands = BRAND_NAMES[locale] ?? BRAND_NAMES.en;
    index = Object.fromEntries(
      getAllLenses(locale).map((lens) => [
        lensRef(lens.id),
        {
          id: lens.id,
          mount: lens.mount,
          name: lensDisplayName(brands[lens.brand] ?? lens.brand, lens.series, lens.model),
          review: lens.searchAliases.review,
        },
      ]),
    );
    cache.set(locale, index);
  }
  return index;
}
