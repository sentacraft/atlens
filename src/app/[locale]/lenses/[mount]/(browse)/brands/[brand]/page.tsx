import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag } from "lucide-react";
import { localized } from "@/i18n/localized";
import BrandPicker from "@/components/brand/BrandPicker";
import { BrandShare } from "@/components/charts/ChartShare";
import LineupChart from "@/components/charts/LineupChart";
import ScopeNote from "@/components/charts/ScopeNote";
import TimelineSection from "@/components/charts/TimelineSection";
import CollectionLensGrid from "@/components/collection/CollectionLensGrid";
import CollectionLinks from "@/components/collection/CollectionLinks";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { DataSourcePill } from "@/components/lens/DataSource";
import BackToTopButton from "@/components/nav/BackToTopButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import SupportNote from "@/components/support/SupportNote";
import { SITE } from "@/config/site";
import { ANCHORED_SECTION_CLS, BROWSE_PAGE_MAIN_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS, PAGE_SECTION_HEADING_CLS, SECTION_HEADING_CLS, SECTION_HEADING_ROW_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";
import { BRANDS, getBrandInfo, getBrandLenses } from "@/lib/brands";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildLineup } from "@/lib/charts/lineup";
import { buildTimeline } from "@/lib/charts/timeline";
import { getBrandCollectionsWithStats } from "@/lib/collection-stats";
import { formatDataDate } from "@/lib/charts/data-date";
import { getLensesByMount, meta } from "@/lib/lens/data";
import { brandLabel, focalRangeDisplay } from "@/lib/lens/format";
import { buildItemListSchema, lensListItems } from "@/lib/lens/seo";
import { mountHasCollections, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { chartHref } from "@/lib/url/charts";
import { brandPath, browsePath, chartPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

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
    timeline: buildTimeline(mountLenses.filter((lens) => lens.brand === brand)),
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
  const tPage = await getTranslations({ locale: data.locale, namespace: "Brand" });
  const brand = data.info.slug;
  // The year suffix is for the SERP title only; it rolls forward on each deploy.
  const seoTitle = t("seoTitleYear", {
    base: tPage("metaTitle", { brand, label: data.name, count: data.lenses.length }),
    year: String(new Date().getFullYear()),
  });
  const description = tPage("metaDescription", {
    brand,
    label: data.name,
    summary: data.summary,
    intro: localized(data.info.description, data.locale),
  });
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
  const tCharts = await getTranslations({ locale, namespace: "Charts" });
  const hasTimeline = data.timeline.entries.length > 0;
  const contents = [
    { id: "lineup", label: t("lineupHeading") },
    ...(hasTimeline ? [{ id: "timeline", label: tCharts("timelineHeading") }] : []),
    { id: "lenses", label: t("lensList") },
  ];

  const itemListSchema = buildItemListSchema({
    name: data.title,
    description,
    url: `${SITE.url}/${locale}${brandPath(data.resolvedMount, data.info.slug)}`,
    items: lensListItems(data.lenses, (brand) => brandLabel(tBrand, brand), locale),
  });

  const share = {
    lineup: data.lineup,
    timeline: data.timeline,
    name: data.name,
    otherBrands: data.brands.length - 1,
    title: data.title,
    summary: data.summary,
    dataDate: formatDataDate(meta.lastUpdated, locale),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className={BROWSE_PAGE_MAIN_CLS}>
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Breadcrumb segments={[{ label: tNav("lenses"), href: browsePath(data.resolvedMount) }]} current={data.name} />
            <div className="flex shrink-0 items-center gap-1">
              <BrandShare {...share} posters={["lineup", "timeline"]} trigger="utility" />
              <FeedbackTrigger type="general" className={UTILITY_BTN_CLS}>
                <Flag className="size-4" />
                <span className="hidden sm:inline">{tCollection("reportIssue")}</span>
              </FeedbackTrigger>
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{data.title}</h1>
          <p className="mt-2 text-xs text-zinc-500">{data.summary}</p>
          <DataSourcePill className="mt-2" />
          {data.cineCount > 0 && (
            <div className="mt-1">
              <ScopeNote>{t("cineNote", { brand: data.name, count: data.cineCount })}</ScopeNote>
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">{description}</p>
          <nav aria-label={t("contents")} className="mt-4 flex flex-wrap gap-1.5">
            {contents.map(({ id, label }) => (
              <a key={id} href={`#${id}`} className={cn(CHIP_BASE_CLS, CHIP_IDLE_CLS)}>
                {label}
              </a>
            ))}
          </nav>
        </header>

        <section id="lineup" className={ANCHORED_SECTION_CLS} aria-labelledby="lineup-heading">
          <div className={SECTION_HEADING_ROW_CLS}>
            <h2 id="lineup-heading" className={PAGE_SECTION_HEADING_CLS}>
              {t("lineupHeading")}
            </h2>
            <BrandShare {...share} posters={["lineup"]} trigger="section" />
          </div>
          <LineupChart lineup={data.lineup} mode={{ kind: "section" }} />
        </section>

        {hasTimeline && (
          <TimelineSection
            className="mt-12"
            entries={data.timeline.entries}
            years={data.timeline.years}
            total={data.lenses.length}
            fullHref={chartHref(chartPath(data.resolvedMount, "timeline"), { brand: data.info.slug })}
            action={<BrandShare {...share} posters={["timeline"]} trigger="section" />}
          />
        )}

        <section id="lenses" className={cn(ANCHORED_SECTION_CLS, "mt-12")} aria-labelledby="lenses-heading">
          <div className="flex flex-wrap items-baseline gap-x-3 border-b border-zinc-200 pb-2">
            <h2 id="lenses-heading" className={PAGE_SECTION_HEADING_CLS}>
              {t("lensList")}
            </h2>
            <span className="text-sm text-zinc-500">{t("lensCount", { count: data.lenses.length })}</span>
          </div>
          <CollectionLensGrid lenses={data.lenses} />
        </section>

        <footer className="mt-12 flex flex-col gap-10">
          <CollectionLinks
            items={related}
            mount={data.resolvedMount}
            locale={locale}
            title={t("relatedCollections", { brand: data.name })}
          />
          <section className="flex flex-col gap-4">
            <h2 className={SECTION_HEADING_CLS}>{t("otherBrands")}</h2>
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
