import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ChartsHeader from "@/components/charts/ChartsHeader";
import TimelineChart, { TimelineChartFromUrl } from "@/components/charts/TimelineChart";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { buildTimeline } from "@/lib/charts/timeline";
import { getLensesByMount } from "@/lib/lens/data";
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
  const timeline = buildTimeline(getLensesByMount(resolvedMount, locale));
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const list = (brands: string[]) =>
    new Intl.ListFormat(locale, { type: "conjunction" }).format(brands.map((b) => brandLabel(tBrand, b)));
  return {
    locale,
    mount,
    resolvedMount,
    timeline,
    first: String(timeline.years[0]?.year ?? ""),
    last: String(timeline.years.at(-1)?.year ?? ""),
    datedBrands: list(timeline.brands.map((b) => b.brand)),
    undatedBrands: list(timeline.brandsWithoutYear),
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
  const chartProps = { entries: timeline.entries, years: timeline.years, brands: timeline.brands };

  return (
    <main className={BROWSE_PAGE_MAIN_CLS}>
      <ChartsHeader
        locale={locale}
        mount={data.resolvedMount}
        active="timeline"
        title={t("timelineTitle", { first: data.first, last: data.last })}
        description={t("timelineDesc", { count: timeline.entries.length })}
      />
      <Suspense fallback={<TimelineChart {...chartProps} initial={{}} />}>
        <TimelineChartFromUrl {...chartProps} />
      </Suspense>
      {timeline.brandsWithoutYear.length > 0 && (
        <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("timelineMissing", { brands: data.undatedBrands })}</p>
      )}
    </main>
  );
}
