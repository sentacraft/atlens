import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localized } from "@/i18n/localized";
import BrandPicker from "@/components/brand/BrandPicker";
import { LineupShare } from "@/components/charts/ChartShare";
import LineupChart from "@/components/charts/LineupChart";
import CollectionLensGrid from "@/components/collection/CollectionLensGrid";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { DataSourceInline } from "@/components/lens/DataSource";
import BackToTopButton from "@/components/nav/BackToTopButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import SupportNote from "@/components/support/SupportNote";
import { SITE } from "@/config/site";
import { BROWSE_PAGE_MAIN_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";
import { BRANDS, getBrandInfo, getBrandLenses } from "@/lib/brands";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildLineup } from "@/lib/charts/lineup";
import { getBrandCollectionsWithStats } from "@/lib/collection-stats";
import { formatDataDate } from "@/lib/charts/data-date";
import { getLensesByMount, meta } from "@/lib/lens/data";
import { brandLabel, focalRangeDisplay, lensDisplayName } from "@/lib/lens/format";
import { buildCollectionItemListSchema } from "@/lib/lens/seo";
import { mountHasCollections, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { brandPath, browsePath, collectionsPath, lensPath } from "@/lib/url/routes";

type Params = Promise<{ locale: string; mount: string; brand: string }>;

export function generateStaticParams() {
  return BRANDS.map(({ slug }) => ({ brand: slug }));
}

// Keep dynamicParams at its default: see the note in [id]/page.tsx.

async function load(params: Params) {
  const { locale, mount, brand } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  const info = getBrandInfo(brand);
  if (!resolvedMount || !mountHasCollections(resolvedMount) || !info) {
    return undefined;
  }
  const mountLenses = getLensesByMount(resolvedMount, locale);
  const lineup = buildLineup(mountLenses, brand);
  if (!lineup) {
    return undefined;
  }
  const t = await getTranslations({ locale, namespace: "Brand" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const name = brandLabel(tBrand, brand);
  return {
    locale,
    mount,
    resolvedMount,
    info,
    name,
    lineup,
    lenses: getBrandLenses(mountLenses, brand),
    brands: chartBrands(mountLenses),
    cineCount: countCineLenses(mountLenses, brand),
    title: t("title", { brand, label: name }),
    summary: t("summary", {
      count: lineup.count,
      primes: lineup.primes.reduce((n, column) => n + column.lenses.length, 0),
      zooms: lineup.zooms.length,
      focal: focalRangeDisplay(lineup.focalMin, lineup.focalMax),
    }),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) {
    return {};
  }
  const t = await getTranslations({ locale: data.locale, namespace: "Collection" });
  // The year suffix is for the SERP title only; it rolls forward on each deploy.
  const seoTitle = t("seoTitleYear", { base: data.title, year: String(new Date().getFullYear()) });
  const description = `${data.summary} ${localized(data.info.description, data.locale)}`;
  return {
    title: seoTitle,
    description,
    openGraph: { title: `${data.title} | Atlens`, description, images: defaultOgImages() },
    alternates: buildAlternates(data.locale, `lenses/${data.mount}/brands/${data.info.slug}`),
  };
}

export default async function BrandPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load(params);
  if (!data) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Brand" });
  const tCollection = await getTranslations({ locale, namespace: "Collection" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const description = localized(data.info.description, locale);
  const related = getBrandCollectionsWithStats(data.info.slug, locale);

  const itemListSchema = buildCollectionItemListSchema({
    name: data.title,
    description,
    url: `${SITE.url}/${locale}${brandPath(data.resolvedMount, data.info.slug)}`,
    items: data.lenses.map((lens) => ({
      name: lensDisplayName(brandLabel(tBrand, lens.brand), lens.series, lens.model),
      url: `${SITE.url}/${locale}${lensPath(lens)}`,
    })),
  });

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className={BROWSE_PAGE_MAIN_CLS}>
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Breadcrumb segments={[{ label: tNav("lenses"), href: browsePath(data.resolvedMount) }]} current={data.name} />
            <div className="flex shrink-0 items-center gap-1">
              <LineupShare
                lineup={data.lineup}
                name={data.name}
                otherBrands={data.brands.length - 1}
                title={data.title}
                summary={data.summary}
                dataDate={formatDataDate(meta.lastUpdated, locale)}
              />
              <FeedbackTrigger type="general" className={UTILITY_BTN_CLS}>
                <Flag className="size-4" />
                <span className="hidden sm:inline">{tCollection("reportIssue")}</span>
              </FeedbackTrigger>
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{data.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {data.summary}
            <DataSourceInline />
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">{description}</p>
        </header>

        <LineupChart lineup={data.lineup} size="responsive" />
        {data.cineCount > 0 && (
          <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("cineNote", { brand: data.name, count: data.cineCount })}</p>
        )}

        <section className="mt-12 flex flex-col gap-4" aria-labelledby="brand-lenses">
          <h2 id="brand-lenses" className="font-heading text-lg font-bold text-zinc-900 md:text-xl">
            {t("allLenses", { count: data.lenses.length })}
          </h2>
          <CollectionLensGrid lenses={data.lenses} />
        </section>

        <footer className="mt-12 flex flex-col gap-10">
          {related.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {t("relatedCollections", { brand: data.name })}
                </h2>
                <Link
                  href={collectionsPath(data.resolvedMount)}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  {tCollection("viewAllCollections")} →
                </Link>
              </div>
              <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {related.map(({ collection, previewLens, lensCount, brandCount }) => (
                  <li key={collection.slug}>
                    <RelatedCollectionCard
                      collection={collection}
                      previewLens={previewLens}
                      locale={locale}
                      statsLabel={tCollection("stats", { count: lensCount, brandCount })}
                      density="comfortable"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("otherBrands")}</h2>
            <BrandPicker
              locale={locale}
              mount={data.resolvedMount}
              brands={data.brands.filter(({ brand }) => brand !== data.info.slug)}
              label={t("otherBrands")}
            />
          </section>
          <SupportNote />
        </footer>
      </main>
      <BackToTopButton />
    </>
  );
}
