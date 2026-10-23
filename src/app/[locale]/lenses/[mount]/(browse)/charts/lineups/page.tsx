import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import BrandLineupsOverview from "@/components/charts/BrandLineupsOverview";
import ChartsHeader from "@/components/charts/ChartsHeader";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildLineup, type Lineup } from "@/lib/charts/lineup";
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
  const lineups = chartBrands(lenses)
    .map(({ brand }) => buildLineup(lenses, brand))
    .filter((lineup): lineup is Lineup => lineup !== undefined);
  const t = await getTranslations({ locale, namespace: "Charts" });
  return {
    locale,
    mount,
    resolvedMount,
    lineups,
    cineCount: countCineLenses(lenses),
    title: t("lineupsTitle"),
    description: t("lineupsDesc", { count: lineups.reduce((n, l) => n + l.count, 0), brandCount: lineups.length }),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) {
    return {};
  }
  return {
    title: data.title,
    description: data.description,
    openGraph: { title: `${data.title} | Atlens`, description: data.description, images: defaultOgImages() },
    alternates: buildAlternates(data.locale, `lenses/${data.mount}/charts/lineups`),
  };
}

export default async function LineupsPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load(params);
  if (!data) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Charts" });
  return (
    <main className={BROWSE_PAGE_MAIN_CLS}>
      <ChartsHeader locale={locale} mount={data.resolvedMount} active="lineups" title={data.title} description={data.description} />
      <BrandLineupsOverview locale={locale} mount={data.resolvedMount} lineups={data.lineups} />
      <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("lineupsNote", { count: data.cineCount })}</p>
    </main>
  );
}
