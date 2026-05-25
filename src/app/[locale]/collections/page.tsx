import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  COLLECTIONS,
  FOCAL_SLUGS,
  BRAND_SLUGS,
  FEATURE_SLUGS,
} from "@/lib/collections";
import { getAllLenses } from "@/lib/lens";
import { buildAlternates, defaultOgImages } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

function localized(field: { en: string; zh: string }, locale: string): string {
  return locale === "zh" ? field.zh : field.en;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
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
    alternates: buildAlternates(locale, "collections"),
  };
}

function CollectionCard({
  slug,
  locale,
  lensCount,
  t,
}: {
  slug: string;
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
        href={`/collections/${slug}`}
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
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Collection" });
  const allLenses = getAllLenses(locale);

  const countFor = (slug: string) => {
    const c = COLLECTIONS[slug];
    return c ? allLenses.filter((l) => c.filter(l, locale)).length : 0;
  };

  const categories = [
    { label: t("categoryFocal"), slugs: FOCAL_SLUGS },
    { label: t("categoryBrand"), slugs: BRAND_SLUGS },
    { label: t("categoryFeature"), slugs: FEATURE_SLUGS },
  ];

  const totalCollections = Object.keys(COLLECTIONS).length;
  const totalLenses = allLenses.filter((l) => l.mount === "X").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("indexTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {t("indexStats", { count: totalCollections, lensCount: totalLenses })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base dark:text-zinc-300">
          {t("indexDescription")}
        </p>
      </header>

      {categories.map((cat) => (
        <section key={cat.label} className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {cat.label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.slugs.map((slug) => (
              <CollectionCard
                key={slug}
                slug={slug}
                locale={locale}
                lensCount={countFor(slug)}
                t={t}
              />
            ))}
          </ul>
        </section>
      ))}

      <footer className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <Link
          href="/lenses/x"
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t("browseAll")} →
        </Link>
      </footer>
    </main>
  );
}
