import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { urlSegmentToMount } from "@/lib/mount";
import { getLensesByMount } from "@/lib/lens";
import LensSearchPageClient from "@/components/LensSearchPageClient";

type Params = Promise<{ locale: string; mount: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return {
    title: t("title"),
    // Interactive search surface — not a content page, keep it out of the index.
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ params }: { params: Params }) {
  const { locale, mount } = await params;
  setRequestLocale(locale);
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  return (
    <Suspense>
      <LensSearchPageClient lenses={lenses} />
    </Suspense>
  );
}
