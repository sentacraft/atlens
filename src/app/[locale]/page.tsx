import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { buildAlternates } from "@/lib/seo";
import { getLensesByMount } from "@/lib/lens/data";
import { COLLECTIONS } from "@/lib/collections";
import { getFeaturedCollectionsWithStats } from "@/lib/collection-stats";
import DataInfo from "@/components/DataFooter";
import HeroBrand from "@/components/mount/MountTag";
import HeroIris from "@/components/iris/HeroIris";
import Tagline from "@/components/Tagline";
import HomeHeroActions from "@/components/home/HomeHeroActions";
import HomeCollections, { type FeaturedCollection } from "@/components/home/HomeCollections";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale, "") };
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  // Must run before any translation access.
  setRequestLocale(locale);

  const xLenses = getLensesByMount("X", locale);
  const gLenses = getLensesByMount("G", locale);
  const mountStats = {
    X: { lensCount: xLenses.length, brandCount: new Set(xLenses.map((l) => l.brand)).size },
    G: { lensCount: gLenses.length, brandCount: new Set(gLenses.map((l) => l.brand)).size },
  };
  const lastAddedAt =
    [...xLenses, ...gLenses]
      .map((l) => l.createdAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

  const tCollection = await getTranslations({ locale, namespace: "Collection" });
  const featured = getFeaturedCollectionsWithStats(locale).map(({ collection, previewLens, lensCount, brandCount }) => ({
    collection,
    previewLens,
    statsLabel: tCollection("stats", { count: lensCount, brandCount }),
  }));

  return <HomeContent mountStats={mountStats} lastAddedAt={lastAddedAt} featured={featured} locale={locale} />;
}

function HomeContent({
  mountStats,
  lastAddedAt,
  featured,
  locale,
}: {
  mountStats: { X: { lensCount: number; brandCount: number }; G: { lensCount: number; brandCount: number } };
  lastAddedAt: string | null;
  featured: FeaturedCollection[];
  locale: string;
}) {
  const t = useTranslations("Common");

  return (
    <div data-testid="home-hero" className="flex min-h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] flex-col overflow-x-clip">
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <HeroIris />
        <h1 className="mt-8 text-5xl sm:text-6xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50 font-heading">
          <HeroBrand />
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400 max-w-sm">
          {t("appDesc")}
        </p>
        <div className="mt-8 flex w-full flex-col items-center gap-3">
          <HomeHeroActions />
          <DataInfo mountStats={mountStats} lastAddedAt={lastAddedAt} />
        </div>
      </section>

      <HomeCollections featured={featured} total={Object.keys(COLLECTIONS).length} locale={locale} />
      <div className="flex justify-center pt-5 pb-6">
        <Tagline />
      </div>
    </div>
  );
}
