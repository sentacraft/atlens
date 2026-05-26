import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COLLECTIONS, getRelatedCollections } from "@/lib/collections";
import { getAllLenses } from "@/lib/lens";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import CollectionLensGrid from "@/components/CollectionLensGrid";
import RelatedCollectionCard from "@/components/RelatedCollectionCard";
import BrowseAllTile from "@/components/BrowseAllTile";
import BackToTopButton from "@/components/BackToTopButton";
import CollectionBreadcrumb from "@/components/CollectionBreadcrumb";

type Params = Promise<{ locale: string; mount: string; slug: string }>;

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((slug) => ({ slug }));
}

function localized(field: { en: string; zh: string }, locale: string): string {
  return locale === "zh" ? field.zh : field.en;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = COLLECTIONS[slug];
  if (!collection) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Collection" });
  const title = localized(collection.title, locale);
  const mountLabel = locale === "zh" ? "富士 X 卡口" : "Fujifilm X-Mount";
  const seoTitle = `${title} — ${mountLabel}`;
  const description = localized(collection.description, locale);

  const lenses = getAllLenses(locale).filter((l) => collection.filter(l, locale));
  const brandCount = new Set(lenses.map((l) => l.brand)).size;
  const prefix = t("metaPrefix", { count: lenses.length, brandCount });
  const metaDesc = `${prefix} ${description}`;

  return {
    title: seoTitle,
    description: metaDesc,
    openGraph: {
      title: `${seoTitle} | X-Glass`,
      description: metaDesc,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/x/collections/${slug}`),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = COLLECTIONS[slug];
  if (!collection) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Collection" });
  const lenses = getAllLenses(locale).filter((l) => collection.filter(l, locale));
  const brandCount = new Set(lenses.map((l) => l.brand)).size;

  const title = localized(collection.title, locale);
  const description = localized(collection.description, locale);
  const stats = t("stats", { count: lenses.length, brandCount });
  const allXLenses = getAllLenses(locale).filter((l) => l.mount === "X");
  const related = getRelatedCollections(slug, allXLenses, locale);
  const allBrandCount = new Set(allXLenses.map((l) => l.brand)).size;

  const relatedWithStats = related.map((c) => {
    const ls = allXLenses.filter((l) => c.filter(l, locale));
    return {
      collection: c,
      previewLens: ls[0],
      lensCount: ls.length,
      brandCount: new Set(ls.map((l) => l.brand)).size,
    };
  });

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-[max(10rem,calc(var(--compare-bar-height,0px)+8rem))]">
        <header className="mb-8">
          <div className="mb-4">
            <CollectionBreadcrumb title={title} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {stats}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base dark:text-zinc-300">
            {description}
          </p>
        </header>
        <CollectionLensGrid lenses={lenses} />

        <footer className="mt-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("relatedCollections")}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
            {relatedWithStats.map(({ collection: c, previewLens, lensCount: lc, brandCount: bc }) => (
              <li key={c.slug}>
                <RelatedCollectionCard
                  collection={c}
                  previewLens={previewLens}
                  locale={locale}
                  statsLabel={t("stats", { count: lc, brandCount: bc })}
                />
              </li>
            ))}
            <li className="sm:col-span-2 md:col-span-1">
              <BrowseAllTile lensCount={allXLenses.length} brandCount={allBrandCount} />
            </li>
          </ul>
          <div className="mt-4 text-right">
            <Link
              href="/lenses/x/collections"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("viewAllCollections")} →
            </Link>
          </div>
        </footer>
      </main>
      <BackToTopButton />
    </>
  );
}
