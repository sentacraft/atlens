import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import { COLLECTIONS } from "@/lib/collections";
import { getLensSummaries } from "@/lib/lens/data";
import { resolveAskIrisEntry } from "@/lib/url/askiris";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Reading searchParams makes this route dynamic, so a ?q= hand-off renders without a hero flash.
export default async function AskIrisPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AskIrisChat
      shell={{ variant: "page", entry: resolveAskIrisEntry(await searchParams) }}
      linkTargets={{ lenses: getLensLinkIndex(locale), collections: Object.keys(COLLECTIONS) }}
      lenses={getLensSummaries(locale)}
    />
  );
}
