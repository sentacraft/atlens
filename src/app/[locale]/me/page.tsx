import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CompareBar from "@/components/compare/CompareBar";
import ProfilePage from "@/components/me/ProfilePage";
import { InitialAccountProvider } from "@/context/InitialAccountProvider";
import { getAllLenses, getLensSummaries } from "@/lib/lens/data";
import { loadProfile } from "@/lib/me/profile-data";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function MePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const profile = await loadProfile(await headers(), getCloudflareContext().env.APP_DB);
  return (
    <HydrationBoundary state={profile?.state}>
      <InitialAccountProvider user={profile?.user ?? null}>
        <ProfilePage lenses={getLensSummaries(locale)} compareBar={<CompareBar allLenses={getAllLenses(locale)} />} />
      </InitialAccountProvider>
    </HydrationBoundary>
  );
}
