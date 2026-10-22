import type { Metadata } from "next";
import { localized } from "@/i18n/localized";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseLensIds, getLensesByMount } from "@/lib/lens/data";
import { readCompareIds } from "@/lib/url/compare";
import { getCollectionLensCounts } from "@/lib/collection-stats";
import { urlSegmentToMount } from "@/lib/mount";
import { findPresetByIds } from "@/lib/curated-presets";
import CompareTable from "@/components/compare/CompareTable";
import CompareUrlSync from "@/components/compare/CompareUrlSync";
import ComparePageHeader from "@/components/compare/ComparePageHeader";
import CompareCollections from "@/components/compare/CompareCollections";
import CompareTelemetry from "@/components/compare/CompareTelemetry";
import CuratedComparisons from "@/components/compare/CuratedComparisons";
import SupportNote from "@/components/support/SupportNote";
import BackToTopButton from "@/components/nav/BackToTopButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { lensDisplayName, brandLabel } from "@/lib/lens/format";
import { notFound } from "next/navigation";
import { browsePath } from "@/lib/url/routes";
import { PAGE_GUTTER_CLS } from "@/config/ui-tokens";

// Dynamic: metadata needs ?ids=, and the route cache keys on pathname only.

type Params = Promise<{ locale: string; mount: string }>;
type SearchParams = Promise<{ ids?: string | string[] }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale, mount } = await params;
  const { ids } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Compare" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    return { title: t("title") };
  }

  const lenses = parseLensIds(readCompareIds(ids), resolvedMount, locale);
  const alternates = buildAlternates(locale, `lenses/${mount}/compare`);
  const emptyTitle = resolvedMount === "X" ? t("metaTitleX") : t("metaTitleG");
  const emptyDescription = resolvedMount === "X" ? t("metaDescX") : t("metaDescG");

  const matchedPreset = findPresetByIds(lenses.map((l) => l.id));
  if (matchedPreset) {
    const title = localized(matchedPreset.title, locale);
    return {
      title,
      description: emptyDescription,
      openGraph: {
        title: `${title} | Atlens`,
        description: emptyDescription,
        images: defaultOgImages(),
      },
      alternates,
    };
  }

  if (lenses.length < 2) {
    return {
      title: emptyTitle,
      description: emptyDescription,
      openGraph: {
        title: `${emptyTitle} | Atlens`,
        description: emptyDescription,
        images: defaultOgImages(),
      },
      alternates,
    };
  }

  const title = lenses
    .map((l) => lensDisplayName(brandLabel(tBrand, l.brand), l.series, l.model))
    .join(" vs ");
  const description = t("metaDescCustom", { count: lenses.length });
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Atlens`,
      description,
      images: defaultOgImages(),
    },
    alternates,
  };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale, mount } = await params;
  setRequestLocale(locale);
  const { ids } = await searchParams;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }

  const tNav = await getTranslations("Nav");
  const lenses = parseLensIds(readCompareIds(ids), resolvedMount, locale);
  const allLenses = getLensesByMount(resolvedMount, locale);

  return (
    <div className={`w-full max-w-7xl mx-auto pt-4 sm:pt-8 pb-40 flex flex-col gap-3 sm:gap-4 ${PAGE_GUTTER_CLS}`}>
      <Breadcrumb
        segments={[{ label: tNav("lenses"), href: browsePath(resolvedMount) }]}
        current={tNav("compare")}
      />
      <ComparePageHeader allLenses={allLenses} />
      <CompareTable allLenses={allLenses} minColumns={2} />
      <CompareCollections allLenses={allLenses} lensCounts={getCollectionLensCounts(locale)} />
      {resolvedMount === "X" && <CuratedComparisons allLenses={allLenses} />}
      <SupportNote className="mt-10" />
      <BackToTopButton />
      <CompareUrlSync initialIds={lenses.map((l) => l.id)} />
      <CompareTelemetry lensIds={lenses.map((l) => l.id)} />
    </div>
  );
}
