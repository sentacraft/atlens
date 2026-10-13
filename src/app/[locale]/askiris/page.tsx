import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import { resolveAskIrisEntry } from "@/lib/url/askiris";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string | string[]; conversation?: string | string[] }>;

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
    <AskIrisChat entry={resolveAskIrisEntry(await searchParams)} lensIndex={getLensLinkIndex(locale)} />
  );
}
