import type { Locale } from "@/i18n/routing";
import type { NamespaceTranslator } from "@/i18n/translator";
import { localized } from "@/i18n/localized";
import type { BrandCount } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import type { Timeline } from "@/lib/charts/timeline";
import type { WeightLadder } from "@/lib/charts/weight";
import type { CollectionStats } from "@/lib/collection-stats";
import { brandLabel, focalRangeDisplay } from "@/lib/lens/format";

/** About where a search result cuts a description off; Chinese characters are about twice as wide. */
export const META_DESCRIPTION_MAX: Record<Locale, number> = { en: 160, zh: 80 };

/** Brands a description names before it falls back to a count. */
const NAMED_BRANDS = 3;

type BrandsT = NamespaceTranslator<"Brands">;

/** The first candidate that fits a search result, else the last, shortest one. */
function fit(locale: Locale, ...candidates: string[]): string {
  return candidates.find((c) => c.length <= META_DESCRIPTION_MAX[locale]) ?? candidates[candidates.length - 1];
}

/** Brands by how many lenses they bring, most first. */
function brandsByCount(brands: string[]): string[] {
  const counts = new Map<string, number>();
  for (const brand of brands) {
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
}

function listOf(locale: Locale, names: string[]): string {
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
}


export function collectionMetaDescription(
  t: NamespaceTranslator<"Collection">,
  tBrand: BrandsT,
  locale: Locale,
  stats: CollectionStats,
  mount: SeoMount,
): string {
  const names = brandsByCount(stats.lenses.map((l) => l.brand)).map((b) => brandLabel(tBrand, b));
  // A series is one brand's line, already named in its title.
  const brands =
    names.length === 1
      ? "none"
      : names.length > NAMED_BRANDS
      ? t("metaBrandsMore", { names: listOf(locale, names.slice(0, NAMED_BRANDS)), total: names.length })
      : listOf(locale, names);
  const name = collectionSeoName(t, tBrand, locale, stats, mount);
  const describe = (source: "yes" | "none") => t("metaDescription", { name, count: stats.lensCount, brands, source });
  return fit(locale, describe("yes"), describe("none"));
}

type SeoMount = "X" | "GFX";

/** What a collection is, with its mount, for its search title and description. */
export function collectionSeoName(
  t: NamespaceTranslator<"Collection">,
  tBrand: BrandsT,
  locale: Locale,
  stats: CollectionStats,
  mount: SeoMount,
): string {
  const title = localized(stats.collection.title, locale);
  // A Fujifilm series already names the maker; the mount before it would repeat it.
  if (title.startsWith(brandLabel(tBrand, "fujifilm"))) {
    return title;
  }
  // Chinese copy keeps a space between Chinese and a number or Latin word: "卡口 23mm 定焦镜头".
  const spaced = locale === "zh" && /^[A-Za-z0-9]/.test(title) ? ` ${title}` : title;
  return t("seoName", { title: spaced, mount });
}

/** A brand's lens count, its primes and zooms, and its focal range. */
export function brandSummary(t: NamespaceTranslator<"Brand">, lineup: Lineup): string {
  return t("summary", {
    count: lineup.count,
    primes: lineup.primes.reduce((n, column) => n + column.lenses.length, 0),
    zooms: lineup.zooms.length,
    focal: focalRangeDisplay(lineup.focalMin, lineup.focalMax),
  });
}

export function brandMetaDescription(
  t: NamespaceTranslator<"Brand">,
  locale: Locale,
  { brand, label, summary }: { brand: string; label: string; summary: string },
): string {
  const describe = (source: "yes" | "none") => t("metaDescription", { brand, label, summary, source });
  return fit(locale, describe("yes"), describe("none"));
}

export function timelineMetaDescription(t: NamespaceTranslator<"Charts">, tBrand: BrandsT, locale: Locale, timeline: Timeline): string {
  return t("timelineMetaDesc", {
    count: timeline.entries.length,
    first: String(timeline.years[0]?.year ?? ""),
    last: String(timeline.years.at(-1)?.year ?? ""),
    brands: listOf(locale, timeline.brands.map((b) => brandLabel(tBrand, b.brand))),
  });
}

export function weightMetaDescription(
  t: NamespaceTranslator<"Charts">,
  tBrand: BrandsT,
  locale: Locale,
  ladder: WeightLadder,
  brands: BrandCount[],
): string {
  return t("weightMetaDesc", {
    count: ladder.count,
    brandCount: brands.length,
    brands: listOf(locale, brands.slice(0, NAMED_BRANDS).map((b) => brandLabel(tBrand, b.brand))),
    min: ladder.lightest?.weightG ?? 0,
    max: ladder.heaviest?.weightG ?? 0,
  });
}

export function lineupsMetaDescription(t: NamespaceTranslator<"Charts">, tBrand: BrandsT, locale: Locale, lineups: Lineup[]): string {
  return t("lineupsMetaDesc", {
    brandCount: lineups.length,
    brands: listOf(locale, lineups.slice(0, NAMED_BRANDS).map((l) => brandLabel(tBrand, l.brand))),
  });
}
