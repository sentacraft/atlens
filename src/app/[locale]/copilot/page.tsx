import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import CopilotChat from "@/components/copilot/CopilotChat";

type Params = Promise<{ locale: string }>;

// Experimental Copilot surface: reachable only by direct URL (no nav entry) and
// kept out of search indexes until it ships for real.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CopilotPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CopilotChat />;
}
