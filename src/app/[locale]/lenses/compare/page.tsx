import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { parseLensIds } from "@/lib/lens";
import { getPresetBySlug } from "@/lib/trending";
import CompareTable from "@/components/CompareTable";
import ComparePageHeader from "@/components/ComparePageHeader";
import CuratedComparisons from "@/components/CuratedComparisons";
import BackButton from "@/components/BackButton";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string; preset?: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("Compare");
  const { locale } = await params;
  const { ids, preset } = await searchParams;
  const lenses = parseLensIds(ids);

  if (preset) {
    const found = getPresetBySlug(preset);
    if (found) {
      const lang = locale === "zh" ? "zh" : "en";
      const title = found.title[lang];
      return { title, openGraph: { title: `${title} | X-Glass` } };
    }
  }

  if (lenses.length < 2) {
    return { title: t("title") };
  }

  const title = lenses.map((l) => l.model).join(" vs ");
  return {
    title,
    openGraph: { title: `${title} | X-Glass` },
  };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string; from?: "lens" | "home"; lensId?: string; preset?: string }>;
}) {
  const { locale } = await params;
  const { ids, from, lensId, preset } = await searchParams;
  const lenses = parseLensIds(ids);

  const lang = locale === "zh" ? "zh" : "en";
  const presetTitle = preset ? (getPresetBySlug(preset)?.title[lang] ?? undefined) : undefined;

  // Determine back destination based on referrer context
  const fallbackHref =
    from === "lens" && lensId ? `/lenses/${lensId}` :
    from === "home" ? "/" :
    "/lenses";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col gap-3 sm:gap-4">
      {/* Header */}
      <ComparePageHeader lenses={lenses} fallbackHref={fallbackHref} minColumns={2} presetTitle={presetTitle} />

      {/* Table — minColumns=2 ensures cold start always shows 2 search-trigger columns.
          hideBodyWhenEmpty keeps cold start compact: only the slot headers are shown,
          the spec rows appear once the user adds the first lens. */}
      <CompareTable key={lenses.length === 0 ? "_empty_" : ids} lenses={lenses} minColumns={2} hideBodyWhenEmpty />

      {/* Curated presets — client component, self-hides when compare list is non-empty */}
      <CuratedComparisons />

      {lenses.length > 0 && (
        <BackButton fallbackHref={fallbackHref} />
      )}
    </div>
  );
}
