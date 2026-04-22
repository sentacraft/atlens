import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AboutContent from "@/components/AboutContent";
import BackToTopButton from "@/components/BackToTopButton";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("pageTitle"), alternates: buildAlternates(locale, "about") };
}

export default function AboutPage() {
  return (
    <>
      <AboutContent />
      <BackToTopButton />
    </>
  );
}
