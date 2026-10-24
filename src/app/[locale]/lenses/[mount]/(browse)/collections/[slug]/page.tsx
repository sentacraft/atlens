import type { Metadata } from "next";
import { localized } from "@/i18n/localized";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { COLLECTIONS } from "@/lib/collections";
import { getCollectionStats, getRelatedCollectionsWithStats } from "@/lib/collection-stats";
import { getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount, mountSeoLabel, mountHasCollections } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { buildItemListSchema, lensListItems } from "@/lib/lens/seo";
import { brandLabel } from "@/lib/lens/format";
import { SITE } from "@/config/site";
import { ACTION_ESCAPE_CLS, BROWSE_PAGE_MAIN_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";
import JsonLd from "@/components/seo/JsonLd";
import CollectionLensGrid from "@/components/collection/CollectionLensGrid";
import CollectionLinks from "@/components/collection/CollectionLinks";
import SupportNote from "@/components/support/SupportNote";
import BackToTopButton from "@/components/nav/BackToTopButton";
import { ShareButton } from "@/components/share/ShareButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { DataSourcePill } from "@/components/lens/DataSource";
import { browsePath, collectionPath, collectionsPath } from "@/lib/url/routes";

type Params = Promise<{ locale: string; mount: string; slug: string }>;

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((slug) => ({ slug }));
}

// Keep dynamicParams at its default: see the note in [id]/page.tsx.

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
  const stats = getCollectionStats(slug, locale);
  if (!stats) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Collection" });
  const title = localized(stats.collection.title, locale);
  const mountLabel = t("mountLabel", { mount: mountSeoLabel(resolvedMount) });
  const baseTitle = `${title} — ${mountLabel}`;
  // The year suffix is for the SERP title only; it rolls forward on each deploy.
  const seoTitle = t("seoTitleYear", { base: baseTitle, year: String(new Date().getFullYear()) });
  const description = localized(stats.collection.description, locale);

  const prefix = t("metaPrefix", { count: stats.lensCount, brandCount: stats.brandCount });
  const metaDesc = `${prefix} ${description}`;

  return {
    title: seoTitle,
    description: metaDesc,
    openGraph: {
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
  const collectionStats = getCollectionStats(slug, locale);
  if (!collectionStats) {
    notFound();
  }

  const { collection, lenses, lensCount, brandCount } = collectionStats;
  const t = await getTranslations({ locale, namespace: "Collection" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const tShare = await getTranslations({ locale, namespace: "Share" });

  const title = localized(collection.title, locale);
  const mountLabel = t("mountLabel", { mount: mountSeoLabel(resolvedMount) });
  const description = localized(collection.description, locale);
  const statsLabel = t("stats", { count: lensCount, brandCount });
  const relatedWithStats = getRelatedCollectionsWithStats(slug, locale);

  const itemListSchema = buildItemListSchema({
    name: title,
    description,
    url: `${SITE.url}/${locale}${collectionPath(resolvedMount, slug)}`,
    items: lensListItems(lenses, (brand) => brandLabel(tBrand, brand), locale),
  });

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className={BROWSE_PAGE_MAIN_CLS}>
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Breadcrumb
              segments={[
                { label: tNav("lenses"), href: browsePath(resolvedMount) },
                { label: t("breadcrumbCollections"), href: collectionsPath(resolvedMount) },
              ]}
              current={title}
            />
            <div className="flex shrink-0 items-center gap-1">
              <ShareButton
                heading={tShare("button")}
                posters={[]}
                shareText={t("shareText", { title, mount: mountLabel })}
                trigger="utility"
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
          <p className="mt-2 text-xs text-zinc-500">{statsLabel}</p>
          <DataSourcePill className="mt-2" />
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">
            {description}
          </p>
        </header>
        <CollectionLensGrid lenses={lenses} />

        <p className="mt-8 text-sm text-zinc-500">
          {t("feedbackPrompt")}{" "}
          <FeedbackTrigger type="general">
            {t("feedbackLink")}
          </FeedbackTrigger>
        </p>

        <footer className="mt-12">
          <CollectionLinks items={relatedWithStats} mount={resolvedMount} locale={locale} title={t("relatedCollections")} />
          <div className="mt-6 flex justify-center border-t border-zinc-100 pt-5">
            <Link
              href={browsePath(resolvedMount)}
              className={`rounded-xl ${ACTION_ESCAPE_CLS}`}
            >
              <span>{t("browseAllPill", { count: mountLenses.length })}</span>
              <ArrowRight size={15} className="text-zinc-400 transition-colors group-hover:text-white" aria-hidden="true" />
            </Link>
          </div>
          <SupportNote className="mt-12" />
        </footer>
      </main>
      <BackToTopButton />
    </>
  );
}
