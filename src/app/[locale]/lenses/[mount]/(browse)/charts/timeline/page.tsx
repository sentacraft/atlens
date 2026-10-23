import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ChartsHeader from "@/components/charts/ChartsHeader";
import { TimelineShare, TimelineShareFromUrl } from "@/components/charts/ChartShare";
import TimelineChart, { TimelineChartFromUrl } from "@/components/charts/TimelineChart";
import SupportNote from "@/components/support/SupportNote";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildTimeline } from "@/lib/charts/timeline";
import { formatDataDate } from "@/lib/charts/data-date";
import { getLensesByMount, meta } from "@/lib/lens/data";
import { brandLabel } from "@/lib/lens/format";
import { mountHasCharts, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";

type Params = Promise<{ locale: string; mount: string }>;

async function load(params: Params) {
  const { locale, mount } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCharts(resolvedMount)) {
    return undefined;
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const timeline = buildTimeline(lenses);
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const list = (brands: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(brands);
  const undated = timeline.brandsWithoutYear.map((b) => brandLabel(tBrand, b));
  return {
    locale,
    mount,
    resolvedMount,
    timeline,
    brandTotals: chartBrands(lenses),
    cineCount: countCineLenses(lenses),
    first: String(timeline.years[0]?.year ?? ""),
    last: String(timeline.years.at(-1)?.year ?? ""),
    datedBrands: list(timeline.brands.map((b) => brandLabel(tBrand, b.brand))),
    undated,
    undatedList: list(undated),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) {
    return {};
  }
  const t = await getTranslations({ locale: data.locale, namespace: "Charts" });
  const title = t("timelineMetaTitle", { first: data.first, last: data.last });
  const description = t("timelineMetaDesc", { brands: data.datedBrands });
  return {
    title,
    description,
    openGraph: { title: `${title} | Atlens`, description, images: defaultOgImages() },
    alternates: buildAlternates(data.locale, `lenses/${data.mount}/charts/timeline`),
  };
}

export default async function TimelinePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load(params);
  if (!data) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Charts" });
  const { timeline } = data;
  const pageProps = { mount: data.resolvedMount, brands: timeline.brands, brandTotals: data.brandTotals };
  const count = timeline.entries.length;
  const [first, second, third, ...rest] = data.undated;
  // en names three brands plus "N others", zh says "N brands in all"; message types come from en
  // only, so `total` must not be an inline literal or it is rejected as an unknown property.
  const moreArgs = { count, first, second, third, others: rest.length, total: data.undated.length };
  const description =
    data.undated.length === 0
      ? t("timelineDesc", { count })
      : rest.length === 0
        ? t("timelineDescUndated", { count, brands: data.undatedList, brandCount: data.undated.length })
        : t("timelineDescUndatedMore", moreArgs);
  const title = t("timelineTitle", { first: data.first, last: data.last });
  const shareProps = {
    entries: timeline.entries,
    years: timeline.years,
    brands: timeline.brands,
    title,
    dataDate: formatDataDate(meta.lastUpdated, locale),
  };

  return (
    <main className={BROWSE_PAGE_MAIN_CLS}>
      <ChartsHeader
        locale={locale}
        mount={data.resolvedMount}
        active="timeline"
        note={t("excludesCine", { count: data.cineCount })}
        title={title}
        description={description}
        action={
          <Suspense fallback={<TimelineShare {...shareProps} selection={{}} />}>
            <TimelineShareFromUrl {...shareProps} />
          </Suspense>
        }
      />
      <Suspense fallback={<TimelineChart entries={timeline.entries} years={timeline.years} mode={{ kind: "page", initial: {}, ...pageProps }} />}>
        <TimelineChartFromUrl entries={timeline.entries} years={timeline.years} {...pageProps} />
      </Suspense>
      <SupportNote className="mt-12" />
    </main>
  );
}
