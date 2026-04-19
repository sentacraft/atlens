/**
 * Brand alias registry for search.
 *
 * English aliases are seeded from x-glass-pipeline/sources.yaml.
 * CJK aliases and informal abbreviations are maintained here independently
 * since the pipeline registry has no localization scope.
 *
 * Key: canonical brand key (matches lenses.json `brand` field).
 * Value: list of aliases — any capitalisation/spelling variant the user might type.
 */
export const BRAND_ALIASES: Record<string, string[]> = {
  fujifilm: ["Fujifilm", "Fujinon", "Fuji", "富士", "富士胶片", "フジ", "フジフイルム"],
  "7artisans": ["7Artisans", "Seven Artisans", "七工匠"],
  sigma: ["Sigma", "适马"],
  tamron: ["Tamron", "腾龙"],
  viltrox: ["Viltrox", "唯卓仕", "唯卓"],
  ttartisan: ["TTArtisan", "TTArtisans", "铭匠光学", "铭匠"],
  brightinstar: ["Brightin Star", "星曜", "星耀光学"],
  sgimage: ["SG Image", "SG-Image", "SGimage", "深光影像"],
};

/** Returns all aliases for a brand key, or an empty array if unknown. */
export function getAliasesForBrand(brandKey: string): string[] {
  return BRAND_ALIASES[brandKey] ?? [];
}
