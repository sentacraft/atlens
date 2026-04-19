import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { allLenses } from "@/lib/lens";
import LensListClient from "@/components/LensListClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LensList" });
  return {
    title: t("title"),
  };
}

export default function LensesPage() {
  return (
    <LensListClient lenses={allLenses} />
  );
}
