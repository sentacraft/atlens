import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import type { LensLinkIndex } from "@/components/askiris/Markdown";
import { getAllLenses } from "@/lib/lens/data";
import { lensRef } from "@/lib/ai/lens-ref";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string | string[] }>;

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
  const { q } = await searchParams;
  const initialQuery = (Array.isArray(q) ? q[0] : q)?.trim() || undefined;
  // ref -> lens for the whole catalogue, so the thread can turn Iris's inline
  // `lens:<ref>` references into real links. Every mount, not just the active one:
  // a mount switch keeps earlier segments on screen, and their links must still work.
  const lensIndex: LensLinkIndex = Object.fromEntries(
    getAllLenses(locale).map((lens) => [lensRef(lens.id), { id: lens.id, mount: lens.mount }]),
  );
  return <AskIrisChat locale={locale} initialQuery={initialQuery} lensIndex={lensIndex} />;
}
