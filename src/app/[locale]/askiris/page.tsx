import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";

type Params = Promise<{ locale: string }>;

// Experimental AskIris surface: reachable only by direct URL (no nav entry) and
// kept out of search indexes until it ships for real. Mount is resolved from the
// user's effective-mount preference client-side, so the route carries no mount
// segment.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AskIrisPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AskIrisChat locale={locale} />;
}
