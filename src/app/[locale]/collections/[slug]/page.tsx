import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COLLECTIONS, getRelatedCollections } from "@/lib/collections";
import { getAllLenses } from "@/lib/lens";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import CollectionLensGrid from "@/components/CollectionLensGrid";
import CompareBar from "@/components/CompareBar";
import BackToTopButton from "@/components/BackToTopButton";

type Params = Promise<{ locale: string; slug: string }>;

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
  const description = localized(collection.description, locale);

  const lenses = getAllLenses(locale).filter(collection.filter);
  const brandCount = new Set(lenses.map((l) => l.brand)).size;
  const prefix = t("metaPrefix", { count: lenses.length, brandCount });
  const metaDesc = `${prefix} ${description}`;

  return {
    title,
    description: metaDesc,
    openGraph: {
      title: `${title} | X-Glass`,
      description: metaDesc,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `collections/${slug}`),
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
  const lenses = getAllLenses(locale).filter(collection.filter);
  const brandCount = new Set(lenses.map((l) => l.brand)).size;

  const title = localized(collection.title, locale);
  const description = localized(collection.description, locale);
  const stats = t("stats", { count: lenses.length, brandCount });
  const related = getRelatedCollections(slug);

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))]">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {stats}
          </p>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {description}
          </p>
        </header>
        <CollectionLensGrid lenses={lenses} />

        <footer className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          {related.length > 0 && (
            <nav className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("relatedCollections")}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/collections/${c.slug}`}
                      className="inline-block rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {localized(c.title, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <Link
            href="/lenses/x"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {t("browseAll")} →
          </Link>
        </footer>
      </main>
      <CompareBar />
      <BackToTopButton />
    </>
  );
}
