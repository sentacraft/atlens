import "server-only";
import { getCollectionStats } from "@/lib/collection-stats";
import { THEME_GROUPS } from "@/lib/collections";
import { getPresetBySlug } from "@/lib/curated-presets";
import { getLensesByMount } from "@/lib/lens/data";
import { getLensImageUrl } from "@/lib/lens/image";
import { buildPromoGroupPages, promoLens, PROMO_THEMES, type PromoDeck } from "@/lib/promo-collection";
import zh from "@/messages/zh.json";

const SLUGS = Object.keys(PROMO_THEMES) as (keyof typeof PROMO_THEMES)[];
const COVER_PICKS: Record<(typeof SLUGS)[number], readonly [string, string, string]> = {
  pancake: ["fujifilm-xf-18mmf2-r-x", "fujifilm-xf-23mmf28-r-wr-x", "voigtlander-27mm-f20-ultron-x"],
  "under-200g": ["fujifilm-xc-15-45mmf35-56-ois-pz-x", "fujifilm-xf-35mmf14-r-x", "viltrox-af-56mm-f17-air-x"],
  "fast-aperture-primes": ["sigma-contemporary-16mm-f14-dc-dn-x", "fujifilm-xf-35mmf14-r-x", "fujifilm-xf-56mmf12-r-wr-x"],
  fisheye: ["laowa-cf-4mmf28-210-circular-fisheye-x", "ttartisan-aps-c-7p5mm-f2-fisheye-x", "laowa-cf-4p5-10mmf28-fisheye-zoom-x"],
  "23mm": ["fujifilm-xf-23mmf2-r-wr-x", "sigma-contemporary-23mm-f14-dc-dn-x", "viltrox-af-23mm-f14-x"],
  "under-200": ["viltrox-af-28mm-f45-x", "ttartisan-af-27mm-f28-x", "7artisans-af-25mm-f18-x"],
  "travel-zoom": [
    "tamron-18-300mm-f35-63-di-iii-a-vc-vxd-x",
    "sigma-contemporary-16-300mm-f35-67-dc-os-x",
    "fujifilm-xf-18-120mmf4-lm-pz-wr-x",
  ],
};
export const promoLabels = zh.PromoStudio;
const END_PAGE_COPY: Record<string, Pick<PromoDeck["related"][number], "title" | "description">> = {
  "under-200g": { title: promoLabels.lightweightTitle, description: promoLabels.lightweightDetail },
  "fast-aperture-primes": { title: promoLabels.fastPrimeTitle, description: promoLabels.fastPrimeDetail },
};
const catalogLenses = getLensesByMount("X", "zh");
const comparisonIds = getPresetBySlug("35mm-equiv-primes")?.lensIds.slice(0, 2) ?? [];
const catalog = {
  brands: new Set(catalogLenses.map((lens) => lens.brand)).size,
  lenses: catalogLenses.length,
  themes: THEME_GROUPS.reduce((count, group) => count + group.collections.length, 0),
};

export function getPromoCollection(slug: string | undefined) {
  const sources = SLUGS.flatMap((id) => {
    const stats = getCollectionStats(id, "zh");
    if (!stats) {return [];}
    const lenses = stats.lenses.filter((lens) => lens.mount === "X");
    return lenses.length ? [{ id, collection: stats.collection, lenses, theme: PROMO_THEMES[id] }] : [];
  });
  const source = sources.find(({ collection }) => collection.slug === slug) ?? sources[0];
  if (!source) {return null;}
  const { collection, lenses } = source;
  const pancake = collection.slug === "pancake";
  const fish = collection.slug === "fisheye";
  const brands: Record<string, string> = zh.Brands;
  const toRow = (lens: (typeof lenses)[number]) => {
    const row = promoLens(lens, brands[lens.brand] ?? lens.brand, getLensImageUrl(lens.id));
    if (row.id === "voigtlander-18mm-f28-color-skopar-asph-x") {
      return { ...row, name: row.name.replace(/ aspherical$/, ""), brand: `${row.brand} · aspherical` };
    }
    return row;
  };
  const orderedCover = [...lenses].sort((a, b) => a.focalLengthMin - b.focalLengthMin || a.id.localeCompare(b.id));
  const picks = (COVER_PICKS[source.id] ?? []).flatMap((id) => orderedCover.find((lens) => lens.id === id) ?? []);
  for (const index of [0, Math.floor(orderedCover.length / 2), orderedCover.length - 1]) {
    if (picks.length < 3 && !picks.includes(orderedCover[index])) {picks.push(orderedCover[index]);}
  }
  const deck: PromoDeck = {
    slug: collection.slug,
    title: pancake ? promoLabels.pancakeTitle : collection.title.zh,
    subtitle: pancake ? promoLabels.pancakeSubtitle : collection.shortDescription.zh,
    scope: pancake ? promoLabels.pancakeScope : source.id === "under-200" ? promoLabels.budgetPriceNotice : undefined,
    lensCount: lenses.length,
    brandCount: new Set(lenses.map((lens) => lens.brand)).size,
    cover: picks.map((lens) => {
      const row = toRow(lens);
      return { ...row, caption: pancake ? `${row.brand} ${row.name.split(/ F\d/)[0]}` : undefined };
    }),
    pages: [{ kind: "cover" }, ...buildPromoGroupPages(lenses, toRow, source.theme).map((page) => ({ kind: "group" as const, ...page })), { kind: "end" }],
    theme: source.theme,
    related: sources.filter((other) => other !== source).slice(0, 2).map(({ collection, lenses }) => ({
      title: END_PAGE_COPY[collection.slug]?.title ?? collection.title.zh,
      description: fish && collection.slug === "pancake" ? promoLabels.pancakeThemeDetail
        : fish && collection.slug === "under-200g" ? promoLabels.lightweightThemeDetail
        : END_PAGE_COPY[collection.slug]?.description ?? collection.shortDescription.zh,
      slug: collection.slug,
      count: lenses.length,
    })),
    catalog,
    comparison: comparisonIds.flatMap((id) => {
      const lens = catalogLenses.find((item) => item.id === id);
      return lens ? [toRow(lens)] : [];
    }),
  };
  return { deck, options: sources.map(({ collection }) => ({ slug: collection.slug, title: collection.title.zh })) };
}
