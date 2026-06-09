import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLensesByMount } from "@/lib/lens/data";
import { urlSegmentToMount } from "@/lib/mount";
import LensListClient from "@/components/browse/LensListClient";
import LensesLoading from "../loading";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string; mount: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, mount } = await params;
  const t = await getTranslations({ locale, namespace: "LensList" });
  const resolvedMount = urlSegmentToMount(mount);

  if (!resolvedMount) {
    return {
      title: t("title"),
      alternates: buildAlternates(locale, `lenses/${mount}/browse`),
    };
  }

  const lenses = getLensesByMount(resolvedMount, locale);
  const brandCount = new Set(lenses.map((l) => l.brand)).size;
  const title = resolvedMount === "X" ? t("metaTitleX") : t("metaTitleG");
  const description =
    resolvedMount === "X"
      ? t("metaDescX", { count: lenses.length, brandCount })
      : t("metaDescG", { count: lenses.length });

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Atlens`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/${mount}/browse`),
  };
}

export default async function LensesPage({ params }: { params: Params }) {
  const { locale, mount } = await params;
  setRequestLocale(locale);
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "LensList" });
  const h1Title = resolvedMount === "X" ? t("metaTitleX") : t("metaTitleG");

  const allLenses = getLensesByMount(resolvedMount, locale);

  return (
    <>
      {/* Server-rendered h1 so the static HTML carries a heading even when the
          Suspense fallback (loading.tsx skeleton) is what Next.js pre-renders
          for the initial response. LensListClient's own visible heading is
          rendered client-side after hydration; this sr-only h1 is the SEO
          anchor. */}
      <h1 className="sr-only">{h1Title}</h1>
      <Suspense fallback={<LensesLoading />}>
        <LensListClient lenses={allLenses} />
      </Suspense>
    </>
  );
}
