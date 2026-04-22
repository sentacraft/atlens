import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { allLenses } from "@/lib/lens";
import LensListClient from "@/components/LensListClient";
import LensesLoading from "./loading";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LensList" });
  return {
    title: t("title"),
    alternates: buildAlternates(locale, "lenses"),
  };
}

export default function LensesPage() {
  return (
    <Suspense fallback={<LensesLoading />}>
      <LensListClient lenses={allLenses} />
    </Suspense>
  );
}
