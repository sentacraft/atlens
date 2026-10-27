import type { Metadata } from "next";
import { localized } from "@/i18n/localized";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { THEME_GROUPS, type ThemeGroup } from "@/lib/collections";
import { getCollectionStats, getSeries } from "@/lib/collection-stats";
import { getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount, mountHasCollections } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import LensIndexShell from "@/components/browse/LensIndexShell";
import CollectionChipRail from "@/components/collection/CollectionChipRail";
import { BRANDS, getBrandLenses } from "@/lib/brands";
import { brandLabel } from "@/lib/lens/format";
import { aboutPath, brandPath, browsePath, collectionPath } from "@/lib/url/routes";

type Params = Promise<{ locale: string; mount: string }>;

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

const GROUP_META = {
  portability: { key: "category_portability", marker: ["G"] },
  aperture: { key: "category_aperture", marker: ["ƒ"], markerItalic: true },
  price: { key: "category_price", marker: ["$"] },
  chinese: { key: "category_chinese", marker: ["CN"] },
  prime: { key: "category_prime", marker: ["PRIME"] },
  zoom: { key: "category_zoom", marker: ["ZOOM"] },
  trait: { key: "category_trait", marker: ["WR"] },
  dedicated: { key: "category_dedicated", marker: ["✦"] },
} as const satisfies Record<ThemeGroup, { key: string; marker: readonly string[]; markerItalic?: boolean }>;

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
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const mountLenses = getLensesByMount(resolvedMount, locale);
  const series = getSeries(locale);
  const brands = BRANDS.map((brand) => ({
    slug: brand.slug,
    name: brandLabel(tBrand, brand.slug),
    count: getBrandLenses(mountLenses, brand.slug).length,
  }));
  const categories = THEME_GROUPS.map(({ group, collections }) => ({
    id: `section-${group}`,
    ...GROUP_META[group],
    label: t(GROUP_META[group].key),
    count: collections.length,
    items: collections.map((collection) => ({
      key: collection.slug,
      href: collectionPath(resolvedMount, collection.slug),
      title: localized(collection.title, locale),
      summary: localized(collection.shortDescription, locale),
      count: getCollectionStats(collection.slug, locale)?.lensCount ?? 0,
    })),
  }));
  const themeCount = categories.reduce((n, cat) => n + cat.count, 0);

  return (
    <LensIndexShell mount={resolvedMount} active="collections" className="pb-16">
      <main className="pt-6 sm:pt-7">
        <h1 className="sr-only">{t("indexTitle")}</h1>

        <section aria-labelledby="brands-heading">
          <div className="mb-3 flex items-baseline gap-2.5 sm:mb-4 sm:gap-3">
            <h2 id="brands-heading" className="font-heading text-[19px] font-bold leading-tight text-zinc-900 sm:text-xl">
              {t("brandsHeading")}
            </h2>
            <span className="font-mono text-[11px] text-zinc-500">
              {t("brandsStats", { brands: brands.length, series: series.length })}
            </span>
          </div>
          <div className="grid auto-rows-fr grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
            {brands.map((brand) => (
              <Link
                key={brand.slug}
                href={brandPath(resolvedMount, brand.slug)}
                className="flex flex-col gap-0.5 rounded-xl border border-zinc-200 px-2.5 py-2.5 transition-colors hover:border-zinc-400 hover:bg-zinc-50 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 sm:px-4 sm:py-3.5"
              >
                <span className="text-sm font-semibold text-zinc-900 sm:text-[15px]">{brand.name}</span>
                <span className="font-mono text-[11px] whitespace-nowrap text-zinc-500">
                  {t("lensCountShort", { count: brand.count })}
                </span>
              </Link>
            ))}
          </div>
          {series.length > 0 && (
            <div className="mt-3.5 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
              <h3 className="text-xs font-semibold text-zinc-600 sm:mr-1.5">{t("seriesLabel")}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {series.map(({ collection, brand, name, lensCount }) => (
                  <li key={collection.slug}>
                    <Link
                      href={collectionPath(resolvedMount, collection.slug)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 sm:py-1"
                    >
                      {brandLabel(tBrand, brand)} {name}
                      <span className="font-mono text-[10px] text-zinc-500">{lensCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="themes-heading" className="mt-9 border-t border-zinc-200 pt-6 sm:mt-11 sm:pt-7">
          <header id="collections-top" className="pb-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h2 id="themes-heading" className="font-heading text-[19px] font-bold leading-tight text-zinc-900 sm:text-xl">
                {t("themesHeading")}
              </h2>
              <span className="font-mono text-[11px] text-zinc-500">
                {t("indexStats", { count: themeCount, lensCount: mountLenses.length })}
              </span>
              <Link
                href={aboutPath("coverage")}
                className="whitespace-nowrap text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline"
              >
                {t("coverageLink")}
              </Link>
            </div>
          </header>

          <CollectionChipRail
            sections={categories.map((cat) => ({ id: cat.id, label: cat.label, count: cat.count }))}
            totalCount={themeCount}
            allLabel={t("chipAll")}
          />

          {categories.map((cat, catIdx) => (
            <section
              key={cat.id}
              id={cat.id}
              className={`scroll-mt-[calc(var(--nav-height)+56px)] pt-7 pb-2 ${catIdx === categories.length - 1 ? "pb-8" : ""}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden="true" className="inline-flex shrink-0 gap-[3px]">
                  {cat.marker.map((label) => (
                    <span
                      key={label}
                      className={`inline-flex items-center justify-center rounded-[3px] border border-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-[0.04em] text-zinc-900 ${"markerItalic" in cat && cat.markerItalic ? "italic" : ""}`}
                    >
                      {label}
                    </span>
                  ))}
                </span>
                <h3 className="font-heading text-[17px] font-bold leading-tight text-zinc-900">
                  {cat.label}
                </h3>
                <span className="font-mono text-[11px] text-zinc-500">
                  {t("sectionCount", { count: cat.count })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {cat.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-zinc-100 py-2.5 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium leading-snug text-zinc-900 group-hover:underline">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-[1.45] text-zinc-500">
                        {item.summary}
                      </p>
                    </div>
                    <span className="pt-0.5 font-mono text-[11px] whitespace-nowrap text-zinc-400">
                      {t("lensCountShort", { count: item.count })}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </section>

        <footer className="mt-8 flex justify-center">
          <Link
            href={browsePath(resolvedMount)}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${ACTION_PRIMARY_CLS}`}
          >
            {t("browseAllPill", { count: mountLenses.length })}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </footer>
      </main>
    </LensIndexShell>
  );
}
