import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getLensesByMount } from "@/lib/lens";
import { urlSegmentToMount } from "@/lib/mount";
import LensListClient from "@/components/LensListClient";
import LensesLoading from "./loading";
import { buildAlternates } from "@/lib/seo";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string; mount: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, mount } = await params;
  const t = await getTranslations({ locale, namespace: "LensList" });
  return {
    title: t("title"),
    alternates: buildAlternates(locale, `lenses/${mount}`),
  };
}

export default async function LensesPage({ params }: { params: Params }) {
  const { mount } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }
  const lenses = getLensesByMount(resolvedMount);

  return (
    <Suspense fallback={<LensesLoading />}>
      <LensListClient lenses={lenses} />
    </Suspense>
  );
}
