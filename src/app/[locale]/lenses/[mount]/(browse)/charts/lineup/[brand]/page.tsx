import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localized } from "@/i18n/localized";
import ChartsHeader from "@/components/charts/ChartsHeader";
import LineupBrandPicker from "@/components/charts/LineupBrandPicker";
import LineupChart from "@/components/charts/LineupChart";
import { BROWSE_PAGE_MAIN_CLS } from "@/config/ui-tokens";
import { chartBrands } from "@/lib/charts/catalog";
import { buildLineup } from "@/lib/charts/lineup";
import { getBrandCollection } from "@/lib/collections";
import { getLensesByMount } from "@/lib/lens/data";
import { brandLabel, focalRangeDisplay } from "@/lib/lens/format";
import { mountHasCharts, urlSegmentToMount } from "@/lib/mount";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { collectionPath } from "@/lib/url/routes";

type Params = Promise<{ locale: string; mount: string; brand: string }>;

export function generateStaticParams() {
  return chartBrands(getLensesByMount("X", "en")).map(({ brand }) => ({ brand }));
}

// Keep dynamicParams at its default: see the note in [id]/page.tsx.

async function load(params: Params) {
  const { locale, mount, brand } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount || !mountHasCharts(resolvedMount)) {
    return undefined;
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const lineup = buildLineup(lenses, brand);
  if (!lineup) {
    return undefined;
  }
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const primes = lineup.primes.reduce((n, column) => n + column.lenses.length, 0);
  return {
    locale,
    mount,
    resolvedMount,
    lineup,
    brands: chartBrands(lenses),
    collection: getBrandCollection(brand),
    title: t("lineupTitle", { brand, label: brandLabel(tBrand, brand) }),
    description: t("lineupDesc", {
      count: lineup.count,
      primes,
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
  return {
    title: data.title,
    description: data.description,
    openGraph: { title: `${data.title} | Atlens`, description: data.description, images: defaultOgImages() },
    alternates: buildAlternates(data.locale, `lenses/${data.mount}/charts/lineup/${data.lineup.brand}`),
  };
}

export default async function LineupPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load(params);
  if (!data) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Charts" });

  return (
    <main className={BROWSE_PAGE_MAIN_CLS}>
      <ChartsHeader locale={locale} mount={data.resolvedMount} active="lineup" title={data.title} description={data.description} />
      <div className="mb-8 flex flex-col gap-3">
        <LineupBrandPicker locale={locale} mount={data.resolvedMount} brands={data.brands} current={data.lineup.brand} />
        {data.collection && (
          <Link
            href={collectionPath(data.resolvedMount, data.collection.slug)}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-900"
          >
            <span className="text-sm font-semibold text-zinc-900">
              {t("lineupCollection", { title: localized(data.collection.title, locale) })}
            </span>
            <span className="shrink-0 text-sm text-zinc-600">{t("openCollection")}</span>
          </Link>
        )}
      </div>
      <LineupChart lineup={data.lineup} />
      <p className="mt-8 text-xs leading-relaxed text-zinc-500">{t("lineupNote")}</p>
    </main>
  );
}
