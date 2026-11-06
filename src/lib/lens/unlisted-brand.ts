import unlistedBrands from "@/data/unlisted-brands.json";
import { catalogBrandAtStart, normalizeLensSearchText } from "@/lib/lens/search";

interface OtherBrand {
  en: string;
  zh: string;
  aliases: string[];
}

const OTHER_BRANDS = unlistedBrands as OtherBrand[];

export type NamedUnlistedBrand = { kind: "catalog"; slug: string } | { kind: "other"; name: { en: string; zh: string } };

const squash = (value: string) => normalizeLensSearchText(value).replace(/ /g, "");

// A brand name opens the query when it is followed by the end or a digit ("zeiss 50"), not a letter.
function startsWithName(query: string, name: string): boolean {
  return name.length >= 2 && query.startsWith(name) && !/[a-z]/.test(query.charAt(name.length));
}

/**
 * The brand a query names when the catalog lists no lens for it: a catalog brand with no lenses
 * yet (Zeiss) or a maker the catalog does not cover (Samyang). Null when the query names no such
 * brand, or when the brand has lenses, since a miss then has another cause.
 */
export function namedUnlistedBrand(query: string, brandsWithLenses: ReadonlySet<string>): NamedUnlistedBrand | null {
  const squashed = squash(query);
  if (!squashed) {
    return null;
  }
  for (const other of OTHER_BRANDS) {
    if (other.aliases.some((alias) => startsWithName(squashed, squash(alias)))) {
      return { kind: "other", name: { en: other.en, zh: other.zh } };
    }
  }
  const slug = catalogBrandAtStart(query);
  return slug && !brandsWithLenses.has(slug) ? { kind: "catalog", slug } : null;
}
