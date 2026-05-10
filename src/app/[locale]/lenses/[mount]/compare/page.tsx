import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { parseLensIds } from "@/lib/lens";
import { urlSegmentToMount } from "@/lib/mount";
import { getPresetBySlug } from "@/lib/trending";
import CompareTable from "@/components/CompareTable";
import ComparePageHeader from "@/components/ComparePageHeader";
import CuratedComparisons from "@/components/CuratedComparisons";
import { buildAlternates } from "@/lib/seo";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string; mount: string }>;
type SearchParams = Promise<{ ids?: string; from?: "lens" | "home"; lensId?: string; preset?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const t = await getTranslations("Compare");
  const { locale, mount } = await params;
  const { ids, preset } = await searchParams;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    return { title: t("title") };
  }

  const lenses = parseLensIds(ids, resolvedMount, locale);
  const alternates = buildAlternates(locale, `lenses/${mount}/compare`);

  if (preset) {
    const found = getPresetBySlug(preset);
    if (found) {
      const lang = locale === "zh" ? "zh" : "en";
      const title = found.titleSecondary
        ? `${found.titlePrimary[lang]}: ${found.titleSecondary[lang]}`
        : found.titlePrimary[lang];
      return { title, openGraph: { title: `${title} | X-Glass` }, alternates };
    }
  }

  if (lenses.length < 2) {
    return { title: t("title"), alternates };
  }

  const title = lenses.map((l) => l.model).join(" vs ");
  return {
    title,
    openGraph: { title: `${title} | X-Glass` },
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
  const { ids, preset } = await searchParams;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }

  const lenses = parseLensIds(ids, resolvedMount, locale);

  const lang = locale === "zh" ? "zh" : "en";
  const foundPreset = preset ? getPresetBySlug(preset) : undefined;
  const presetTitleLines: string[] | undefined = foundPreset
    ? [
        foundPreset.titlePrimary[lang],
        ...(foundPreset.titleSecondary ? [foundPreset.titleSecondary[lang]] : []),
      ]
    : undefined;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col gap-3 sm:gap-4">
      <ComparePageHeader lenses={lenses} minColumns={2} presetTitleLines={presetTitleLines} />
      <CompareTable key={lenses.length === 0 ? "_empty_" : ids} lenses={lenses} minColumns={2} hideBodyWhenEmpty />
      {resolvedMount === "X" && <CuratedComparisons />}
    </div>
  );
}
