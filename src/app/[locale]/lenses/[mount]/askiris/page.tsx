import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import { urlSegmentToMount } from "@/lib/mount";

type Params = Promise<{ locale: string; mount: string }>;

// Experimental AskIris surface: reachable only by direct URL (no nav entry) and
// kept out of search indexes until it ships for real.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AskIrisPage({ params }: { params: Params }) {
  const { locale, mount: mountParam } = await params;
  setRequestLocale(locale);
  const mount = urlSegmentToMount(mountParam);
  if (!mount) {
    notFound();
  }
  return <AskIrisChat mount={mount} locale={locale} />;
}
