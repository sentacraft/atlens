import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { urlSegmentToMount } from "@/lib/mount";
import { getLensesByMount } from "@/lib/lens-data";
import { resolveLensSpecAndFields } from "@/lib/lens-report-fields";
import type { FeedbackContext, FeedbackField, FeedbackType } from "@/lib/feedback";
import FeedbackPageClient from "@/components/FeedbackPageClient";

type Params = Promise<{ locale: string }>;
type Search = Promise<{ type?: string; mount?: string; lensId?: string; q?: string }>;

function resolveType(raw: string | undefined): FeedbackType {
  return raw === "data_issue" ? "data_issue" : "general";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { locale } = await params;
  const { type } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Feedback" });
  const titleKey = resolveType(type) === "data_issue" ? "titleDataIssue" : "titleGeneral";
  return {
    title: t(titleKey),
    // Interactive form surface — not a content page, keep it out of the index.
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const type = resolveType(sp.type);

  let context: FeedbackContext = {};
  let fields: FeedbackField[] | undefined;

  // Reconstruct the lens context (and, for data_issue, the reportable-field
  // list) server-side from the lensId — the same builder the lens detail page
  // uses, so the field list is identical and nothing rich crosses the URL.
  const mount = urlSegmentToMount(sp.mount);
  if (mount && sp.lensId) {
    const lens = getLensesByMount(mount, locale).find((l) => l.id === sp.lensId);
    if (lens) {
      const tBrand = await getTranslations({ locale, namespace: "Brands" });
      context = { lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) };
      if (type === "data_issue") {
        const t = await getTranslations({ locale, namespace: "LensDetail" });
        const tPricing = await getTranslations({ locale, namespace: "Pricing" });
        fields = resolveLensSpecAndFields({ lens, locale, t, tPricing }).reportableFields;
      }
    }
  }

  if (sp.q) {
    context = { ...context, searchQuery: sp.q };
  }

  return (
    <Suspense>
      <FeedbackPageClient type={type} context={context} fields={fields} />
    </Suspense>
  );
}
