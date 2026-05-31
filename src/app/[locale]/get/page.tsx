import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import InstallPage from "@/components/InstallPage";
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
      {/* Server-rendered h1 so search engines see a page heading without
          waiting for the client-only InstallPage to hydrate. The platform-
          specific titles inside InstallPage are h2 by convention since this
          h1 already names the page. */}
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <InstallPage />
    </>
  );
}
