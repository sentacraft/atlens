"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePageQuestions } from "@/components/iris/usePageQuestions";
import { parsePagePath } from "@/lib/askiris/page-ref";
import type { PageStarter } from "@/lib/askiris/starter-questions";
import type { LensSummary } from "@/lib/lens/data";
import { brandLabel, lensDisplayName } from "@/lib/lens/format";

/** Example questions about the page Iris opened over, to show before the general ones. */
export function usePageStarters(path: string | null, lenses: LensSummary[]): PageStarter[] {
  const tBrand = useTranslations("Brands");
  const questions = usePageQuestions();
  const page = useMemo(() => (path ? parsePagePath(path) : null), [path]);

  if (!page) {
    return [];
  }
  const asStarters = (texts: (string | null)[]): PageStarter[] =>
    texts.filter((text): text is string => Boolean(text)).map((text) => ({ text, pool: "page" }));
  if (page.kind === "browse") {
    return asStarters([questions.browse(page.filters)]);
  }
  const ids = page.kind === "compare" ? page.lensIds : [page.lensId];
  const names = ids
    .map((id) => lenses.find((lens) => lens.id === id && lens.mount === page.mount))
    .filter((lens): lens is LensSummary => lens !== undefined)
    .map((lens) => lensDisplayName(brandLabel(tBrand, lens.brand), lens.series, lens.model));
  if (page.kind === "compare") {
    return names.length >= 2 ? asStarters(questions.compare(names)) : [];
  }
  return names.length === 1 ? asStarters(questions.lens(names[0])) : [];
}
