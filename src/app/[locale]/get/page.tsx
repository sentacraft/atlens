import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import InstallPage from "@/components/pwa/InstallPage";
import { buildAlternates, defaultOgImages } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Install" });
  const title = t("pageTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Atlens`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, "get"),
  };
}

export default async function GetPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Install" });
  return (
    <>
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <InstallPage />
    </>
  );
}
