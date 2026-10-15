import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ProfilePage from "@/components/me/ProfilePage";
import { getLensSummaries } from "@/lib/lens/data";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

// Static shell: the account loads in the browser, so the route stays prerendered.
export default async function MePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfilePage lenses={getLensSummaries(locale)} />;
}
