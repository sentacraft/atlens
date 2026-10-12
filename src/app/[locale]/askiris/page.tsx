import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import { resolveAskIrisEntry } from "@/lib/url/askiris";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string | string[]; conversation?: string | string[] }>;

// Experimental AskIris surface: reachable only by direct URL (no nav entry) and
// kept out of search indexes until it ships for real. Mount is resolved from the
// user's effective-mount preference client-side, so the route carries no mount
// segment.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Reading searchParams opts this route into dynamic (SSR) rendering — needed so a
// /askiris?q=… hand-off can render the thread on the server and skip the hero
// flash, rather than the client discovering the query only after first paint.
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
