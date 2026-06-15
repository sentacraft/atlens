import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COLLECTION_GROUPS,
  collectionLensCount,
  type CollectionGroup,
} from "@/lib/collections";
import { getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount, mountHasCollections } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import LensIndexShell from "@/components/browse/LensIndexShell";
import CollectionChipRail from "@/components/collection/CollectionChipRail";

type Params = Promise<{ locale: string; mount: string }>;

function localized(field: { en: string; zh: string }, locale: string): string {
  return locale === "zh" ? field.zh : field.en;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, mount } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCollections(resolvedMount)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "Collection" });

  const title = t("indexTitle");
  const description = t("indexDescription");

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Atlens`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/${mount}/collections`),
  };
}

// Per-group presentation: the section heading's i18n key and marker badge.
// Typed Record<CollectionGroup, …> so the compiler guarantees every group in
// collections.json has presentation here — and no stale extras. The section
// ORDER is not here: it comes from the group key order in collections.json
// (COLLECTION_GROUPS), authored "hardest for browse filters to reconstruct"
// first (portability / aperture / price / sub-brand series / Chinese combos)
// down to single-toggle categories (brand / traits / dedicated optics).
const GROUP_META: Record<CollectionGroup, { key: string; marker: string[]; markerItalic?: boolean }> = {
  portability: { key: "category_portability", marker: ["G"] },
  aperture: { key: "category_aperture", marker: ["ƒ"], markerItalic: true },
  price: { key: "category_price", marker: ["$"] },
  chinese: { key: "category_chinese", marker: ["CN"] },
  series: { key: "category_series", marker: ["SERIES"] },
  prime: { key: "category_prime", marker: ["PRIME"] },
  zoom: { key: "category_zoom", marker: ["ZOOM"] },
  trait: { key: "category_trait", marker: ["WR"] },
  brand: { key: "category_brand", marker: ["BRAND"] },
  dedicated: { key: "category_dedicated", marker: ["✦"] },
};

export default async function CollectionsIndexPage({
  params,
}: {
  params: Params;
}) {
  const { locale, mount } = await params;
  setRequestLocale(locale);

  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCollections(resolvedMount)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Collection" });
  const mountLenses = getLensesByMount(resolvedMount, locale);

  const categories = COLLECTION_GROUPS.map(({ group, collections }) => ({
    id: `section-${group}`,
    ...GROUP_META[group],
    collections,
    label: t(GROUP_META[group].key),
    count: collections.length,
  }));

  const totalCollections = COLLECTION_GROUPS.reduce((n, g) => n + g.collections.length, 0);
  const totalLenses = mountLenses.length;

  return (
    <LensIndexShell className="pb-16">
      <main className="pt-5">
      {/* The section nav and its position are owned by LensIndexShell, so the
          tab row lands identically to the browse view. The summary keeps the
          keyword-rich title as an sr-only h1 for SEO (mirroring the browse
          page); the visible header is a one-line summary the tab label can't
          convey — collection and lens counts — plus a short subtitle. */}
      <header id="collections-top" className="pb-3">
        <h1 className="sr-only">{t("indexTitle")}</h1>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
            {t("indexStats", { count: totalCollections, lensCount: totalLenses })}
          </p>
          {/* Mirror the browse view: surface coverage next to the count, where
              users form the "is this complete?" judgment, instead of leaving it
              buried in About. */}
          <Link
            href="/about#coverage"
            className="whitespace-nowrap text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {t("coverageLink")}
          </Link>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t("indexSubtitle")}
        </p>
      </header>

      {/* Sticky chip rail */}
      <CollectionChipRail
        sections={categories.map((cat) => ({
          id: cat.id,
          label: cat.label,
          count: cat.count,
        }))}
        totalCount={totalCollections}
        allLabel={t("chipAll")}
      />

      {/* Section blocks */}
      {categories.map((cat, catIdx) => (
        <section
          key={cat.id}
          id={cat.id}
          className={`scroll-mt-[calc(var(--nav-height)+56px)] pt-7 pb-2 ${catIdx === categories.length - 1 ? "pb-8" : ""}`}
        >
          {/* Section head */}
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden="true" className="inline-flex shrink-0 gap-[3px]">
              {cat.marker.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center justify-center rounded-[3px] border border-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-[0.04em] text-zinc-900 dark:border-zinc-400 dark:text-zinc-400 ${"markerItalic" in cat && cat.markerItalic ? "italic" : ""}`}
                >
                  {label}
                </span>
              ))}
            </span>
            <h2 className="font-heading text-[17px] font-bold leading-tight text-zinc-900 dark:text-zinc-100">
              {cat.label}
            </h2>
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              {t("sectionCount", { count: cat.count })}
            </span>
          </div>

          {/* Collection grid */}
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {cat.collections.map((collection) => {
              const lensCount = collectionLensCount(collection.slug, locale);
              return (
                <Link
                  key={collection.slug}
                  href={`/lenses/${mount}/collections/${collection.slug}`}
                  className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-zinc-100 py-2.5 transition-colors dark:border-zinc-800"
                >
                  <div>
                    <p className="text-sm font-medium leading-snug text-zinc-900 group-hover:underline dark:text-zinc-100">
                      {localized(collection.title, locale)}
                    </p>
                    <p className="mt-0.5 text-xs leading-[1.45] text-zinc-500 dark:text-zinc-400">
                      {localized(collection.shortDescription, locale)}
                    </p>
                  </div>
                  <span className="pt-0.5 font-mono text-[11px] whitespace-nowrap text-zinc-400 dark:text-zinc-500">
                    {t("lensCountShort", { count: lensCount })}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* Footer CTA */}
      <footer className="mt-8 flex justify-center">
        <Link
          href={`/lenses/${mount}/browse`}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${ACTION_PRIMARY_CLS}`}
        >
          {t("browseAllPill", { count: totalLenses })}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
      </main>
    </LensIndexShell>
  );
}
