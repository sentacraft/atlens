import { filterLenses } from "@/lib/lens/lens";
import { getLensesByMount, parseLensIds } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";
import { lensRef } from "@/lib/ai/lens-ref";
import { describeFilters, parsePagePath, type FilterLabels } from "@/lib/askiris/page-ref";
import type { Lens, Mount } from "@/lib/types";

export interface PageLens {
  ref: string;
  name: string;
}

/** What the visitor is looking at when they ask, in the words the site shows them. */
export type PageContext =
  | { kind: "browse"; mount: Mount; filters: string[]; resultCount: number }
  | { kind: "compare"; mount: Mount; lenses: PageLens[] }
  | { kind: "lens"; mount: Mount; lens: PageLens };

/** Reads a page path the client sent; null for pages without lens context. */
export function resolvePageContext(path: string, locale: string, labels: FilterLabels): PageContext | null {
  const page = parsePagePath(path);
  if (!page) {
    return null;
  }
  if (page.kind === "browse") {
    return {
      kind: "browse",
      mount: page.mount,
      filters: describeFilters(page.filters, labels),
      resultCount: filterLenses(getLensesByMount(page.mount, locale), page.filters).length,
    };
  }
  const lenses = parseLensIds(page.kind === "compare" ? page.lensIds : [page.lensId], page.mount, locale).map(
    (lens) => pageLens(lens, labels),
  );
  if (lenses.length === 0) {
    return null;
  }
  return page.kind === "compare"
    ? { kind: "compare", mount: page.mount, lenses }
    : { kind: "lens", mount: page.mount, lens: lenses[0] };
}

/** The refs of the lenses on the page, which count as already looked up this turn. */
export function pageLensRefs(context: PageContext | null): string[] {
  if (context?.kind === "compare") {
    return context.lenses.map((lens) => lens.ref);
  }
  if (context?.kind === "lens") {
    return [context.lens.ref];
  }
  return [];
}

function pageLens(lens: Lens, labels: FilterLabels): PageLens {
  return { ref: lensRef(lens.id), name: lensDisplayName(labels.brand(lens.brand), lens.series, lens.model) };
}
