import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ChartsHeader from "@/components/charts/ChartsHeader";
import { DataSourceInline } from "@/components/lens/DataSource";
import WeightLadderChart, { WeightLadderChartFromUrl } from "@/components/charts/WeightLadderChart";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildWeightLadder } from "@/lib/charts/weight";
import { getLensesByMount } from "@/lib/lens/data";
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
  return { locale, mount, resolvedMount, ladder: buildWeightLadder(lenses), brands: chartBrands(lenses), cineCount: countCineLenses(lenses) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) {
    return {};
  }
  const t = await getTranslations({ locale: data.locale, namespace: "Charts" });
  const title = t("weightMetaTitle", { count: data.ladder.count });
  const description = t("weightMetaDesc", { min: data.ladder.lightest?.weightG ?? 0, max: data.ladder.heaviest?.weightG ?? 0 });
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

  return (
    <main className={BROWSE_PAGE_MAIN_CLS}>
      <ChartsHeader
        locale={locale}
        mount={data.resolvedMount}
        active="weight"
        title={t("weightTitle")}
        description={t("weightDesc", {
          model: ladder.heaviest?.model ?? "",
          weight: ladder.heaviest?.weightG ?? 0,
          ratio: ladder.ratio ?? 0,
        })}
      >
        <DataSourceInline />
      </ChartsHeader>
      <Suspense fallback={<WeightLadderChart {...chartProps} initial={{}} />}>
        <WeightLadderChartFromUrl {...chartProps} />
      </Suspense>
      <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("weightNote", { count: data.cineCount })}</p>
    </main>
  );
}
