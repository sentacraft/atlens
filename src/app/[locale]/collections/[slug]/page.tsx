import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COLLECTIONS, getCategoryKey, getRelatedCollections } from "@/lib/collections";
import { getAllLenses } from "@/lib/lens";
import { getLensImageUrl } from "@/lib/lens-image";
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

  const lenses = getAllLenses(locale).filter((l) => collection.filter(l, locale));
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
  const lenses = getAllLenses(locale).filter((l) => collection.filter(l, locale));
  const brandCount = new Set(lenses.map((l) => l.brand)).size;

  const title = localized(collection.title, locale);
  const description = localized(collection.description, locale);
  const stats = t("stats", { count: lenses.length, brandCount });
  const related = getRelatedCollections(slug);
  const allXLenses = getAllLenses(locale).filter((l) => l.mount === "X");
  const allBrandCount = new Set(allXLenses.map((l) => l.brand)).size;

  const categoryKey = getCategoryKey(slug);
  const categoryTagKey =
    categoryKey === "focal" ? "categoryFocalTag" :
    categoryKey === "brand" ? "categoryBrandTag" :
    "categoryFeatureTag";

  const relatedData = related.map((c) => {
    const cls = allXLenses.filter((l) => c.filter(l, locale));
    return {
      collection: c,
      lensCount: cls.length,
      brandCount: new Set(cls.map((l) => l.brand)).size,
      previewIds: cls.slice(0, 3).map((l) => l.id),
    };
  });

  const browsePreviewIds = allXLenses.slice(0, 3).map((l) => l.id);

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
          <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {description}
          </p>
        </header>
        <CollectionLensGrid lenses={lenses} />

        <footer className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          {relatedData.length > 0 && (
            <nav className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("relatedCollections")}
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {relatedData.map(({ collection: c, lensCount: lc, brandCount: bc, previewIds }) => (
                  <li key={c.slug}>
                    <Link
                      href={`/collections/${c.slug}`}
                      className="group block h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                    >
                      <div className="flex items-end gap-1 border-b border-zinc-100 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-800/30" style={{ aspectRatio: "5/3" }}>
                        {previewIds.map((id) => (
                          <div key={id} className="relative h-full flex-1 overflow-hidden rounded">
                            <Image
                              src={getLensImageUrl(id)}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-contain"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                          {t(categoryTagKey)}
                        </p>
                        <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                          {localized(c.title, locale)}
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {t("stats", { count: lc, brandCount: bc })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <Link
            href="/lenses/x"
            className="group block overflow-hidden rounded-2xl bg-zinc-900 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  {t("browseAllEyebrow")}
                </p>
                <h3 className="text-lg font-bold leading-tight sm:text-xl">
                  {t("browseAllTitle")}
                </h3>
                <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-500">
                  {t("stats", { count: allXLenses.length, brandCount: allBrandCount })}
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                {browsePreviewIds.map((id) => (
                  <div key={id} className="relative h-12 w-12 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 dark:border-zinc-300 dark:bg-zinc-200">
                    <Image
                      src={getLensImageUrl(id)}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
              <span className="shrink-0 font-mono text-2xl">→</span>
            </div>
          </Link>
        </footer>
      </main>
      <CompareBar />
      <BackToTopButton />
    </>
  );
}
