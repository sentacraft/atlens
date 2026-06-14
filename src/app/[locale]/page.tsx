import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { buildAlternates } from "@/lib/seo";
import { getLensesByMount } from "@/lib/lens/data";
import DataInfo from "@/components/DataFooter";
import HomeCta from "@/components/HomeCta";
import HeroBrand from "@/components/mount/MountTag";
import HeroIris from "@/components/iris/HeroIris";
import Tagline from "@/components/Tagline";

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
  // Enables static rendering for this page. Must be called before any
  // useTranslations/getTranslations descendant access.
  setRequestLocale(locale);

  const xLenses = getLensesByMount("X", locale);
  const gLenses = getLensesByMount("G", locale);
  const mountStats = {
    X: { lensCount: xLenses.length, brandCount: new Set(xLenses.map((l) => l.brand)).size },
    G: { lensCount: gLenses.length, brandCount: new Set(gLenses.map((l) => l.brand)).size },
  };
  // Most recent date any lens entered the library, across both mounts — drives
  // the "What's New" freshness hint in the footer.
  const lastAddedAt =
    [...xLenses, ...gLenses]
      .map((l) => l.createdAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

  return <HomeContent mountStats={mountStats} lastAddedAt={lastAddedAt} />;
}

function HomeContent({ mountStats, lastAddedAt }: { mountStats: { X: { lensCount: number; brandCount: number }; G: { lensCount: number; brandCount: number } }; lastAddedAt: string | null }) {
  const t = useTranslations("Common");

  return (
    <div className="relative h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] overflow-clip grid place-items-center">
      <section className="flex flex-col items-center text-center px-4">
        <HeroIris />
        <h1 className="mt-8 text-5xl sm:text-6xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50 font-heading">
          <HeroBrand />
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400 max-w-sm">
          {t("appDesc")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <HomeCta />
          </div>
          <DataInfo mountStats={mountStats} lastAddedAt={lastAddedAt} />
        </div>
      </section>

      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <Tagline />
      </div>
    </div>
  );
}
