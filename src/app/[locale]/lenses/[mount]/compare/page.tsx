import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseLensIds, getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount } from "@/lib/mount";
import { findPresetByIds } from "@/lib/curated-presets";
import CompareTable from "@/components/compare/CompareTable";
import ComparePageHeader from "@/components/compare/ComparePageHeader";
import CompareCollections from "@/components/compare/CompareCollections";
import CompareTelemetry from "@/components/compare/CompareTelemetry";
import CuratedComparisons from "@/components/compare/CuratedComparisons";
import BackToTopButton from "@/components/nav/BackToTopButton";
import Breadcrumb from "@/components/nav/Breadcrumb";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { mountToUrlSegment } from "@/lib/mount";
import { lensDisplayName } from "@/lib/lens/format";
import { notFound } from "next/navigation";

// Compare page depends on ?ids=A,B,C searchParams for server-rendered metadata
// (title and OG tag include the lens names), so it cannot be fully SSG. The
// trade-off: keep it as SSR but mark it cacheable with a long s-maxage so the
// edge CDN (Vercel Edge Cache / Cloudflare) caches each unique URL after first
// render. Result: per-URL CPU cost happens once per (ids, preset) combination,
// then subsequent visitors hit cache.
export const revalidate = 31536000; // 1 year

type Params = Promise<{ locale: string; mount: string }>;
type SearchParams = Promise<{ ids?: string }>;

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

  const lenses = parseLensIds(ids, resolvedMount, locale);
  const alternates = buildAlternates(locale, `lenses/${mount}/compare`);
  const emptyTitle = resolvedMount === "X" ? t("metaTitleX") : t("metaTitleG");
  const emptyDescription = resolvedMount === "X" ? t("metaDescX") : t("metaDescG");

  // Reverse-derive the curated preset, if any, from the URL's ids.
  // Lets shared `?ids=...` links render with the curated framing in SEO /
  // OG metadata without keeping a separate `?preset=` URL param.
  const matchedPreset = findPresetByIds(lenses.map((l) => l.id));
  if (matchedPreset) {
    const lang = locale === "zh" ? "zh" : "en";
    const title = matchedPreset.title[lang];
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
    .map((l) => lensDisplayName(tBrand(l.brand), l.series, l.model))
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
  const seg = mountToUrlSegment(resolvedMount);
  const lenses = parseLensIds(ids, resolvedMount, locale);
  const allLenses = getLensesByMount(resolvedMount, locale);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-40 flex flex-col gap-3 sm:gap-4">
      <Breadcrumb
        segments={[{ label: tNav("lenses"), href: `/lenses/${seg}/browse` }]}
        current={tNav("compare")}
      />
      <ComparePageHeader allLenses={allLenses} />
      <CompareTable key={lenses.length === 0 ? "_empty_" : ids} lenses={lenses} allLenses={allLenses} minColumns={2} hideBodyWhenEmpty />
      <CompareCollections allLenses={allLenses} />
      {resolvedMount === "X" && <CuratedComparisons allLenses={allLenses} />}
      <BackToTopButton />
      <CompareTelemetry lensIds={lenses.map((l) => l.id)} />
    </div>
  );
}
