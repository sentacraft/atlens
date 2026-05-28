import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseLensIds } from "@/lib/lens";
import { urlSegmentToMount } from "@/lib/mount";
import { findPresetByIds } from "@/lib/curated-presets";
import { getSharedCollections } from "@/lib/collections";
import CompareTable from "@/components/CompareTable";
import ComparePageHeader from "@/components/ComparePageHeader";
import CompareTelemetry from "@/components/telemetry/CompareTelemetry";
import CuratedComparisons from "@/components/CuratedComparisons";
import BackToTopButton from "@/components/BackToTopButton";
import Breadcrumb from "@/components/Breadcrumb";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { mountToUrlSegment } from "@/lib/mount";
import { lensDisplayName } from "@/lib/lens.format";
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
        title: `${title} | X-Glass`,
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
        title: `${emptyTitle} | X-Glass`,
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
      title: `${title} | X-Glass`,
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
  const t = await getTranslations({ locale, namespace: "Compare" });
  const seg = mountToUrlSegment(resolvedMount);
  const lenses = parseLensIds(ids, resolvedMount, locale);
  const sharedCollections = lenses.length > 0
    ? getSharedCollections(lenses, resolvedMount, locale)
    : [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-40 flex flex-col gap-3 sm:gap-4">
      <Breadcrumb
        segments={[{ label: tNav("lenses"), href: `/lenses/${seg}` }]}
        current={tNav("compare")}
      />
      <ComparePageHeader />
      <CompareTable key={lenses.length === 0 ? "_empty_" : ids} lenses={lenses} minColumns={2} hideBodyWhenEmpty />
      {sharedCollections.length > 0 && (
        <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("collectionsTitle")}
            </h2>
            <Link
              href={`/lenses/${seg}/collections`}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("viewAllCollections")} →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {sharedCollections.map((c) => (
              <Link
                key={c.slug}
                href={`/lenses/${seg}/collections/${c.slug}`}
                className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
              >
                <span className="font-normal text-zinc-900 group-hover:text-white dark:text-zinc-100 dark:group-hover:text-zinc-900">
                  {locale === "zh" ? c.title.zh : c.title.en}
                </span>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-400 dark:text-zinc-500 dark:group-hover:text-zinc-500">
                  {c.lensCount}
                </span>
                <span className="text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {resolvedMount === "X" && <CuratedComparisons />}
      <BackToTopButton />
      <CompareTelemetry lensIds={lenses.map((l) => l.id)} />
    </div>
  );
}
