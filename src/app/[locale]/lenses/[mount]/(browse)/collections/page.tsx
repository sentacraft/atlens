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
import CollectionBreadcrumb from "@/components/CollectionBreadcrumb";

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

function CollectionCard({
  slug,
  mount,
  locale,
  lensCount,
  t,
}: {
  slug: string;
  mount: string;
  locale: string;
  lensCount: number;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const collection = COLLECTIONS[slug];
  if (!collection) {
    return null;
  }

  return (
    <li>
      <Link
        href={`/lenses/${mount}/collections/${slug}`}
        className="group block rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
      >
        <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-100 dark:group-hover:text-zinc-300">
          {localized(collection.title, locale)}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {t("lensCount", { count: lensCount })}
        </p>
      </Link>
    </li>
  );
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Params;
}) {
  const { locale, mount } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Collection" });
  const mountLenses = getLensesByMount(mount as Mount, locale);

  const countFor = (slug: string) => {
    const c = COLLECTIONS[slug];
    return c ? mountLenses.filter((l) => c.filter(l, locale)).length : 0;
  };

  const categories = [
    { label: t("category_prime"), slugs: PRIME_SLUGS },
    { label: t("category_zoom"), slugs: ZOOM_SLUGS },
    { label: t("category_brand"), slugs: BRAND_SLUGS },
    { label: t("category_series"), slugs: SERIES_SLUGS },
    { label: t("category_price"), slugs: PRICE_SLUGS },
    { label: t("category_portability"), slugs: PORTABILITY_SLUGS },
    { label: t("category_aperture"), slugs: APERTURE_SLUGS },
    { label: t("category_trait"), slugs: TRAIT_SLUGS },
    { label: t("category_dedicated"), slugs: DEDICATED_SLUGS },
    { label: t("category_focus"), slugs: FOCUS_SLUGS },
  ];

  const totalCollections = Object.keys(COLLECTIONS).length;
  const totalLenses = mountLenses.length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10">
        <div className="mb-4">
          <CollectionBreadcrumb />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("indexTitle")}
        </h1>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {t("indexStats", { count: totalCollections, lensCount: totalLenses })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base dark:text-zinc-300">
          {t("indexDescription")}
        </p>
      </header>

      {categories.map((cat) => (
        <section key={cat.label} className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {cat.label}
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {cat.slugs.map((slug) => (
              <CollectionCard
                key={slug}
                slug={slug}
                mount={mount}
                locale={locale}
                lensCount={countFor(slug)}
                t={t}
              />
            ))}
          </ul>
        </section>
      ))}

      <footer className="flex justify-center">
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
