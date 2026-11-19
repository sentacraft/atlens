import "server-only";
import { getCollectionStats } from "@/lib/collection-stats";
import { getLensImageUrl } from "@/lib/lens/image";
import { buildPromoGroupPages, promoLens, type PromoDeck } from "@/lib/promo-collection";
import zh from "@/messages/zh.json";

const SLUGS = ["pancake", "under-200g", "fast-aperture-primes", "fisheye"] as const;
const PANCAKE_COVER = [
  "fujifilm-xf-18mmf2-r-x", "fujifilm-xf-23mmf28-r-wr-x", "voigtlander-27mm-f20-ultron-x",
];
export const promoLabels = zh.PromoStudio;
const END_PAGE_COPY: Record<string, PromoDeck["related"][number]> = {
  "under-200g": { title: promoLabels.lightweightTitle, description: promoLabels.lightweightDetail },
  "fast-aperture-primes": { title: promoLabels.fastPrimeTitle, description: promoLabels.fastPrimeDetail },
};

export function getPromoCollection(slug: string | undefined) {
  const sources = SLUGS.flatMap((id) => {
    const stats = getCollectionStats(id, "zh");
    if (!stats) {return [];}
    const lenses = stats.lenses.filter((lens) => lens.mount === "X");
    return lenses.length ? [{ collection: stats.collection, lenses }] : [];
  });
  const source = sources.find(({ collection }) => collection.slug === slug) ?? sources[0];
  if (!source) {return null;}
  const { collection, lenses } = source;
  const pancake = collection.slug === "pancake";
  const brands: Record<string, string> = zh.Brands;
  const toRow = (lens: (typeof lenses)[number]) => {
    const row = promoLens(lens, brands[lens.brand] ?? lens.brand, getLensImageUrl(lens.id));
    if (row.id === "voigtlander-18mm-f28-color-skopar-asph-x") {
      return { ...row, name: row.name.replace(/ aspherical$/, ""), brand: `${row.brand} · aspherical` };
    }
    return row;
  };
  const orderedCover = [...lenses].sort((a, b) => a.focalLengthMin - b.focalLengthMin || a.id.localeCompare(b.id));
  const picks = pancake ? PANCAKE_COVER.flatMap((id) => orderedCover.find((lens) => lens.id === id) ?? []) : [];
  for (const index of [0, Math.floor(orderedCover.length / 2), orderedCover.length - 1]) {
    if (picks.length < 3 && !picks.includes(orderedCover[index])) {picks.push(orderedCover[index]);}
  }
  const deck: PromoDeck = {
    slug: collection.slug,
    collectionTitle: collection.title.zh,
    title: pancake ? promoLabels.pancakeTitle : collection.title.zh,
    subtitle: pancake ? promoLabels.pancakeSubtitle : collection.shortDescription.zh,
    scope: pancake ? promoLabels.pancakeScope : undefined,
    lensCount: lenses.length,
    brandCount: new Set(lenses.map((lens) => lens.brand)).size,
    cover: picks.map(toRow),
    pages: [{ kind: "cover" }, ...buildPromoGroupPages(lenses, toRow, pancake ? [18, 23, 27] : []).map((page) => ({ kind: "group" as const, ...page })), { kind: "end" }],
    related: sources.filter((other) => other !== source).map(({ collection }) => (
      END_PAGE_COPY[collection.slug] ?? { title: collection.title.zh, description: collection.shortDescription.zh }
    )),
  };
  return { deck, options: sources.map(({ collection }) => ({ slug: collection.slug, title: collection.title.zh })) };
}
