import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ChartsHeader from "@/components/charts/ChartsHeader";
import { DataSourceInline } from "@/components/lens/DataSource";
import { WeightShare, WeightShareFromUrl } from "@/components/charts/ChartShare";
import WeightLadderChart, { WeightLadderChartFromUrl } from "@/components/charts/WeightLadderChart";
import JsonLd from "@/components/seo/JsonLd";
import SupportNote from "@/components/support/SupportNote";
import { SITE } from "@/config/site";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands, countCineLenses, type ChartLens } from "@/lib/charts/catalog";
import { buildWeightLadder } from "@/lib/charts/weight";
import { formatDataDate } from "@/lib/charts/data-date";
import { getLensesByMount, meta } from "@/lib/lens/data";
import { brandLabel, lensDisplayName } from "@/lib/lens/format";
import { buildItemListSchema, lensListItems } from "@/lib/lens/seo";
import { mountHasCharts, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { chartPath } from "@/lib/url/routes";

type Params = Promise<{ locale: string; mount: string }>;

async function load(params: Params) {
  const { locale, mount } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCharts(resolvedMount)) {
    return undefined;
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const ladder = buildWeightLadder(lenses);
  const brands = chartBrands(lenses);
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const brandName = (brand: string) => brandLabel(tBrand, brand);
  const lensName = (lens: ChartLens | undefined) => (lens ? lensDisplayName(brandName(lens.brand), lens.series, lens.model) : "");
  const seo = {
    title: t("weightMetaTitle", { count: ladder.count }),
    description: t("weightMetaDesc", {
      count: ladder.count,
      brandCount: brands.length,
      brands: new Intl.ListFormat(locale, { type: "conjunction" }).format(brands.slice(0, 4).map((b) => brandName(b.brand))),
      lightest: lensName(ladder.lightest),
      min: ladder.lightest?.weightG ?? 0,
      heaviest: lensName(ladder.heaviest),
      max: ladder.heaviest?.weightG ?? 0,
    }),
    items: lensListItems(
      ladder.tiers.flatMap((tier) => tier.lenses),
      brandName,
      locale,
    ),
  };
  return { locale, mount, resolvedMount, ladder, brands, seo, cineCount: countCineLenses(lenses) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) {
    return {};
  }
  const { title, description } = data.seo;
  return {
    title,
    description,
    openGraph: { title: `${title} | Atlens`, description, images: defaultOgImages() },
    alternates: buildAlternates(data.locale, `lenses/${data.mount}/charts/weight`),
  };
}

export default async function WeightPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load(params);
  if (!data) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Charts" });
  const { ladder } = data;
  const chartProps = { mount: data.resolvedMount, tiers: ladder.tiers, brands: data.brands };
  const shareProps = {
    tiers: ladder.tiers,
    brands: data.brands,
    title: t("weightTitle"),
    count: ladder.count,
    maxG: ladder.heaviest?.weightG ?? 0,
    minG: ladder.lightest?.weightG ?? 0,
    dataDate: formatDataDate(meta.lastUpdated, locale),
  };

  const itemList = buildItemListSchema({
    name: data.seo.title,
    description: data.seo.description,
    url: `${SITE.url}/${locale}${chartPath(data.resolvedMount, "weight")}`,
    items: data.seo.items,
  });
  return (
    <>
      <JsonLd data={itemList} />
      <main className={BROWSE_PAGE_MAIN_CLS}>
        <ChartsHeader
          locale={locale}
          mount={data.resolvedMount}
          active="weight"
          note={t("weightNote", { count: data.cineCount })}
          title={t("weightTitle")}
          description={t("weightDesc", {
            model: ladder.heaviest?.model ?? "",
            weight: ladder.heaviest?.weightG ?? 0,
            ratio: ladder.ratio ?? 0,
          })}
          action={
            <Suspense fallback={<WeightShare {...shareProps} selection={{}} />}>
              <WeightShareFromUrl {...shareProps} />
            </Suspense>
          }
        >
          <DataSourceInline />
        </ChartsHeader>
        <Suspense fallback={<WeightLadderChart tiers={ladder.tiers} mode={{ kind: "page", initial: {}, mount: data.resolvedMount, brands: data.brands }} />}>
          <WeightLadderChartFromUrl {...chartProps} />
        </Suspense>
        <SupportNote className="mt-12" />
      </main>
    </>
  );
}
