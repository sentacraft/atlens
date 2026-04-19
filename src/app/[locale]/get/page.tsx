import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InstallPage from "@/components/InstallPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Install");
  return { title: t("pageTitle") };
}

export default function GetPage() {
  return <InstallPage />;
}
