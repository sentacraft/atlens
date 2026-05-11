import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AboutContent from "@/components/AboutContent";
import BackToTopButton from "@/components/BackToTopButton";
import { buildAlternates } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("pageTitle"), alternates: buildAlternates(locale, "about") };
}

export default async function AboutPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <AboutContent />
      <BackToTopButton />
    </>
  );
}
