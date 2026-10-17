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
import { HomeFold, HomeIrisStage } from "@/components/home/HomeIrisStage";

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
    <HomeIrisStage>
      <div className="flex min-h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] flex-col overflow-x-clip">
        {/* sm:pt-18 adds back the 40px the tighter gaps below take out, so the centered hero moves
            down by half of it and the data line stays where it was. */}
        <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:pt-18">
          <HomeFold mode="hide" className="mb-5">
            <HeroIris />
          </HomeFold>
          <HomeFold mode="shrink">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50 font-heading group-data-[folded]:text-3xl sm:group-data-[folded]:text-4xl">
              <HeroBrand />
            </h1>
          </HomeFold>
          <HomeFold mode="hide" className="mt-2">
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 max-w-sm sm:text-lg">
              {t("appDesc")}
            </p>
          </HomeFold>
          <HomeFold mode="move" className="relative mt-5 flex w-full flex-col items-center">
            <HomeHeroActions />
          </HomeFold>
          <HomeFold mode="hide" className="mt-0.5 sm:mt-1">
            <DataInfo mountStats={mountStats} lastAddedAt={lastAddedAt} />
          </HomeFold>
        </section>

        <HomeFold mode="move">
          <HomeCollections featured={featured} total={Object.keys(COLLECTIONS).length} locale={locale} />
          <div className="flex justify-center pt-5 pb-6">
            <Tagline />
          </div>
        </HomeFold>
      </div>
    </HomeIrisStage>
  );
}
