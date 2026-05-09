import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CoverageContent from "@/components/CoverageContent";
import BackToTopButton from "@/components/BackToTopButton";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Coverage" });
  return { title: t("pageTitle"), alternates: buildAlternates(locale, "coverage") };
}

export default function CoveragePage() {
  return (
    <>
      <CoverageContent />
      <BackToTopButton />
    </>
  );
}
