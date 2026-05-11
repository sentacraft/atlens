import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { buildAlternates } from "@/lib/seo";
import DataInfo from "@/components/DataFooter";
import HomeCta from "@/components/HomeCta";
import HeroBrand from "@/components/MountTag";
import HeroIris from "@/components/HeroIris";
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
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-col h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] overflow-clip">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-16 flex-1">
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
          <DataInfo />
        </div>
      </section>

      {/* Tagline — barely visible footer credit */}
      <div className="pb-6 flex justify-center">
        <Tagline />
      </div>
    </div>
  );
}
