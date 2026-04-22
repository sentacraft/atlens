import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InstallPage from "@/components/InstallPage";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Install" });
  return { title: t("pageTitle"), alternates: buildAlternates(locale, "get") };
}

export default function GetPage() {
  return <InstallPage />;
}
