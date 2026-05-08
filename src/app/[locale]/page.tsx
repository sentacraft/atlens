import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale, "") };
}
import DataInfo from "@/components/DataFooter";
import HomeCta from "@/components/HomeCta";
import Tagline from "@/components/Tagline";
import Iris from "@/components/Iris";
import { IRIS_HERO } from "@/config/iris-config";

export default function Home() {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-col h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] overflow-clip">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-16 flex-1">
        <Iris config={IRIS_HERO} uid="hero" />
        <h1 className="mt-8 text-5xl sm:text-6xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50 font-heading">
          {t("appName")}
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
