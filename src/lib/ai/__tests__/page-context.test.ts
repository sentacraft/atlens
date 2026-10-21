import { describe, expect, it } from "vitest";
import { pageLensRefs, resolvePageContext } from "../page-context";
import type { FilterLabels } from "@/lib/askiris/page-ref";
import { pagePrompt } from "../system-prompt";
import { lensRef } from "../lens-ref";
import { defaultFilters, filterLenses } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { serializeFilters } from "@/lib/url/filter-params";

// Echo translators: the assertions read which key each label came from.
const labels = {
  brand: (slug: string) => `brand:${slug}`,
  list: (key: string) => `list:${key}`,
  badge: (key: string) => `badge:${key}`,
} as unknown as FilterLabels;
const xLenses = getLensesByMount("X", "en");
const [first, second] = xLenses;

describe("resolvePageContext", () => {
  it("describes the browse filters in the filter panel's words and counts the results", () => {
    const filters = { ...defaultFilters, brands: ["fujifilm"], typeFilter: "prime" as const, features: ["wr" as const] };
    const context = resolvePageContext(`/en/lenses/x/browse?${serializeFilters(filters)}`, "en", labels);

    expect(context).toEqual({
      kind: "browse",
      mount: "X",
      filters: ["brand:fujifilm", "list:primes", "list:featureWr"],
      resultCount: filterLenses(xLenses, filters).length,
    });
    expect(pageLensRefs(context)).toEqual([]);
  });

  it("lists the compared lenses, which count as looked up", () => {
    const context = resolvePageContext(`/zh/lenses/x/compare?ids=${first.id},${second.id}`, "en", labels);

    expect(context).toMatchObject({ kind: "compare", mount: "X" });
    expect(pageLensRefs(context)).toEqual([lensRef(first.id), lensRef(second.id)]);
  });

  it("reads the lens of a detail page, with or without the locale prefix", () => {
    for (const path of [`/en/lenses/x/${first.id}`, `/lenses/x/${first.id}`]) {
      expect(pageLensRefs(resolvePageContext(path, "en", labels))).toEqual([lensRef(first.id)]);
    }
  });

  it("has nothing to say about other pages", () => {
    for (const path of ["/en", "/en/about", "/en/lenses/x/collections", "/en/lenses/x/no-such-lens", "/en/lenses/x/compare"]) {
      expect(resolvePageContext(path, "en", labels)).toBeNull();
    }
  });
});

describe("pagePrompt", () => {
  it("links the lenses on the page by ref", () => {
    const context = resolvePageContext(`/en/lenses/x/${first.id}`, "en", labels);

    expect(pagePrompt(context!)).toContain(`(lens:${lensRef(first.id)})`);
  });
});
