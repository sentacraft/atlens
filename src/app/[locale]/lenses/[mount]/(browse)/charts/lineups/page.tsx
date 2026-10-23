import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import BrandLineupsOverview from "@/components/charts/BrandLineupsOverview";
import { ChartLinkShare } from "@/components/charts/ChartShare";
import ChartsHeader from "@/components/charts/ChartsHeader";
import JsonLd from "@/components/seo/JsonLd";
import { SITE } from "@/config/site";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands, countCineLenses } from "@/lib/charts/catalog";
import { buildLineup, type Lineup } from "@/lib/charts/lineup";
import { getLensesByMount } from "@/lib/lens/data";
import { brandLabel } from "@/lib/lens/format";
import { buildItemListSchema } from "@/lib/lens/seo";
import { mountHasCharts, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { brandPath, chartPath } from "@/lib/url/routes";

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
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const count = lineups.reduce((n, l) => n + l.count, 0);
  const names = lineups.map((l) => brandLabel(tBrand, l.brand));
  const seo = {
    title: t("lineupsMetaTitle", { brandCount: lineups.length, count }),
    description: t("lineupsMetaDesc", { brandCount: lineups.length, brands: new Intl.ListFormat(locale, { type: "conjunction" }).format(names) }),
    items: lineups.map((l, i) => ({ name: names[i], url: `${SITE.url}/${locale}${brandPath(resolvedMount, l.brand)}` })),
  };
  return {
    locale,
    mount,
    resolvedMount,
    lineups,
    seo,
    cineCount: countCineLenses(lenses),
    title: t("lineupsTitle"),
    description: t("lineupsDesc", { count, brandCount: lineups.length }),
  };
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
  const itemList = buildItemListSchema({
    name: data.seo.title,
    description: data.seo.description,
    url: `${SITE.url}/${locale}${chartPath(data.resolvedMount, "lineups")}`,
    items: data.seo.items,
  });
  return (
    <>
      <JsonLd data={itemList} />
      <main className={BROWSE_PAGE_MAIN_CLS}>
        <ChartsHeader
          locale={locale}
          mount={data.resolvedMount}
          active="lineups"
          title={data.title}
          description={data.description}
          action={<ChartLinkShare title={data.title} />}
        />
        <BrandLineupsOverview locale={locale} mount={data.resolvedMount} lineups={data.lineups} />
        <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("lineupsNote", { count: data.cineCount })}</p>
      </main>
    </>
  );
}
