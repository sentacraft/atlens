import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { COLLECTIONS, getCollectionStats, getRelatedCollectionsWithStats } from "@/lib/collections";
import { getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount, mountSeoLabel, mountHasCollections } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { buildCollectionItemListSchema } from "@/lib/lens/seo";
import { lensDisplayName } from "@/lib/lens/format";
import { SITE } from "@/config/site";
import { ACTION_ESCAPE_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";
import JsonLd from "@/components/seo/JsonLd";
import CollectionLensGrid from "@/components/collection/CollectionLensGrid";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import BackToTopButton from "@/components/nav/BackToTopButton";
import { ShareButton } from "@/components/share/ShareButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";

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
  const { locale, mount, slug } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCollections(resolvedMount)) {
    return {};
  }
  const allLenses = getLensesByMount(resolvedMount, locale);
  const stats = getCollectionStats(slug, allLenses, locale);
  if (!stats) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Collection" });
  const title = localized(stats.collection.title, locale);
  const mountLabel = t("mountLabel", { mount: mountSeoLabel(resolvedMount) });
  const baseTitle = `${title} — ${mountLabel}`;
  // Current-year suffix lives only in the SERP <title> as a freshness/CTR cue;
  // resolved at build time, so it rolls forward on the next deploy. The on-page
  // <h1> and collection cards render the bare title, never this string.
  const seoTitle = t("seoTitleYear", { base: baseTitle, year: String(new Date().getFullYear()) });
  const description = localized(stats.collection.description, locale);

  const prefix = t("metaPrefix", { count: stats.lensCount, brandCount: stats.brandCount });
  const metaDesc = `${prefix} ${description}`;

  return {
    title: seoTitle,
    description: metaDesc,
    openGraph: {
      // OG title stays year-free — a shared social card has no freshness intent.
      title: `${baseTitle} | Atlens`,
      description: metaDesc,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/${mount}/collections/${slug}`),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Params;
}) {
  const { locale, mount, slug } = await params;
  setRequestLocale(locale);

  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCollections(resolvedMount)) {
    notFound();
  }
  const mountLenses = getLensesByMount(resolvedMount, locale);
  const collectionStats = getCollectionStats(slug, mountLenses, locale);
  if (!collectionStats) {
    notFound();
  }

  const { collection, lenses, lensCount, brandCount } = collectionStats;
  const t = await getTranslations({ locale, namespace: "Collection" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });

  const title = localized(collection.title, locale);
  const mountLabel = t("mountLabel", { mount: mountSeoLabel(resolvedMount) });
  const description = localized(collection.description, locale);
  const statsLabel = t("stats", { count: lensCount, brandCount });
  const relatedWithStats = getRelatedCollectionsWithStats(slug, mountLenses, locale);

  // ItemList schema: declares this page as an ordered list of lenses, each
  // pointing at its own detail page. URLs mirror the lens-detail canonical so
  // the list resolves to the same entities Google already knows.
  const itemListSchema = buildCollectionItemListSchema({
    name: title,
    description,
    url: `${SITE.url}/${locale}/lenses/${mount}/collections/${slug}`,
    items: lenses.map((lens) => ({
      name: lensDisplayName(tBrand(lens.brand), lens.series, lens.model),
      url: `${SITE.url}/${locale}/lenses/${mount}/${lens.id}`,
    })),
  });

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-[max(10rem,calc(var(--compare-bar-height,0px)+8rem))]">
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Breadcrumb
              segments={[
                { label: tNav("lenses"), href: `/lenses/${mount}/browse` },
                { label: t("breadcrumbCollections"), href: `/lenses/${mount}/collections` },
              ]}
              current={title}
            />
            <div className="flex shrink-0 items-center gap-1">
              <ShareButton
                lenses={lenses}
                linkOnly
                shareText={t("shareText", { title, mount: mountLabel })}
                triggerClassName={UTILITY_BTN_CLS}
              />
              <FeedbackTrigger type="general" className={UTILITY_BTN_CLS}>
                <Flag className="size-4" />
                <span className="hidden sm:inline">{t("reportIssue")}</span>
              </FeedbackTrigger>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {statsLabel}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base dark:text-zinc-300">
            {description}
          </p>
        </header>
        <CollectionLensGrid lenses={lenses} />

        {/* Completeness feedback sits right after the grid, while the user is
            still in this collection's context — not after the leave-the-page
            CTA below. */}
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          {t("feedbackPrompt")}{" "}
          <FeedbackTrigger type="general">
            {t("feedbackLink")}
          </FeedbackTrigger>
        </p>

        <footer className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("relatedCollections")}
            </h2>
            <Link
              href={`/lenses/${mount}/collections`}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("viewAllCollections")} →
            </Link>
          </div>
          <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
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
          </ul>
          <div className="mt-6 flex justify-center border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <Link
              href={`/lenses/${mount}/browse`}
              className={`rounded-xl ${ACTION_ESCAPE_CLS}`}
            >
              <span>{t("browseAllPill", { count: mountLenses.length })}</span>
              <ArrowRight size={15} className="text-zinc-400 transition-colors group-hover:text-white dark:text-zinc-500 dark:group-hover:text-zinc-900" aria-hidden="true" />
            </Link>
          </div>
        </footer>
      </main>
      <BackToTopButton />
    </>
  );
}
