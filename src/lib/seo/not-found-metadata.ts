import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Head tags for a route whose data is missing. Returning nothing would inherit the layout's title
 * and description, which are the home page's.
 */
export async function notFoundMetadata(locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return { title: t("title"), description: t("description") };
}
