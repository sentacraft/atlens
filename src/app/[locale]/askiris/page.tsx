import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import { BRANDS } from "@/lib/brands";
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
  // Drawn on the server so the example questions match after hydration. A dynamic server
  // component renders once per request, so the purity rule's re-render concern does not apply.
  // eslint-disable-next-line react-hooks/purity
  const starterSeed = Math.floor(Math.random() * 2 ** 32);
  return (
    <AskIrisChat
      shell={{ variant: "page", entry: resolveAskIrisEntry(await searchParams), starterSeed }}
      linkTargets={{ lenses: getLensLinkIndex(locale), collections: Object.keys(COLLECTIONS), brands: BRANDS.map((b) => b.slug) }}
      lenses={getLensSummaries(locale)}
    />
  );
}
