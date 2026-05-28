import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COLLECTIONS,
  PRIME_SLUGS,
  ZOOM_SLUGS,
  BRAND_SLUGS,
  SERIES_SLUGS,
  PRICE_SLUGS,
  PORTABILITY_SLUGS,
  APERTURE_SLUGS,
  TRAIT_SLUGS,
  DEDICATED_SLUGS,
  FOCUS_SLUGS,
} from "@/lib/collections";
import { getLensesByMount } from "@/lib/lens";
import type { Mount } from "@/lib/types";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { ACTION_PRIMARY_CLS } from "@/lib/ui-tokens";
import Breadcrumb from "@/components/Breadcrumb";
import CollectionChipRail from "@/components/CollectionChipRail";

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
  const t = await getTranslations({ locale, namespace: "Collection" });

  const title = t("indexTitle");
  const description = t("indexDescription");

  return {
    title,
    description,
    openGraph: {
      title: `${title} | X-Glass`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/${mount}/collections`),
  };
}

const CATEGORIES = [
  { id: "section-prime", key: "category_prime", slugs: PRIME_SLUGS },
  { id: "section-zoom", key: "category_zoom", slugs: ZOOM_SLUGS },
  { id: "section-brand", key: "category_brand", slugs: BRAND_SLUGS },
  { id: "section-series", key: "category_series", slugs: SERIES_SLUGS },
  { id: "section-price", key: "category_price", slugs: PRICE_SLUGS },
  { id: "section-portability", key: "category_portability", slugs: PORTABILITY_SLUGS },
  { id: "section-aperture", key: "category_aperture", slugs: APERTURE_SLUGS },
  { id: "section-trait", key: "category_trait", slugs: TRAIT_SLUGS },
  { id: "section-dedicated", key: "category_dedicated", slugs: DEDICATED_SLUGS },
  { id: "section-focus", key: "category_focus", slugs: FOCUS_SLUGS },
] as const;

export default async function CollectionsIndexPage({
  params,
}: {
  params: Params;
}) {
  const { locale, mount } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Collection" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const mountLenses = getLensesByMount(mount as Mount, locale);

  const countFor = (slug: string) => {
    const c = COLLECTIONS[slug];
    return c ? mountLenses.filter((l) => c.filter(l, locale)).length : 0;
  };

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    label: t(cat.key),
    count: cat.slugs.length,
  }));

  const totalCollections = Object.keys(COLLECTIONS).length;
  const totalLenses = mountLenses.length;

  return (
    <main className="mx-auto max-w-[960px] px-6 pt-8 pb-16">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb
          segments={[{ label: tNav("lenses"), href: `/lenses/${mount}` }]}
          current={t("breadcrumbCollections")}
        />
      </div>

      {/* Page title row */}
      <header className="pb-6">
        <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {t("eyebrow")}
        </p>
        <h1 className="font-heading text-[32px] font-bold leading-[1.15] text-zinc-900 dark:text-zinc-100">
          {t("indexTitle")}
        </h1>
        <p className="mt-2.5 max-w-[560px] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t("indexStats", { count: totalCollections, lensCount: totalLenses })}
          {" — "}
          {t("indexDescription")}
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
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border-[1.5px] border-dashed border-zinc-400 font-mono text-[9px] font-semibold tracking-[0.04em] text-zinc-400 dark:border-zinc-500 dark:text-zinc-500"
            >
              ICON
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
            {cat.slugs.map((slug) => {
              const collection = COLLECTIONS[slug];
              if (!collection) {
                return null;
              }
              const lensCount = countFor(slug);
              return (
                <Link
                  key={slug}
                  href={`/lenses/${mount}/collections/${slug}`}
                  className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-zinc-100 py-2.5 transition-colors dark:border-zinc-800"
                >
                  <div>
                    <p className="text-sm font-medium leading-snug text-zinc-900 group-hover:underline dark:text-zinc-100">
                      {localized(collection.title, locale)}
                    </p>
                    <p className="mt-0.5 text-xs italic leading-[1.45] text-zinc-500 dark:text-zinc-400">
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
          href={`/lenses/${mount}`}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${ACTION_PRIMARY_CLS}`}
        >
          {t("browseAllPill", { count: totalLenses })}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
