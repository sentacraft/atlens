import { describe, expect, it } from "vitest";
import { ACTION_LINKS, PAGE_LINKS, factLinkMarkdown, type FactLink } from "@/lib/askiris/inline-links";
import { fillUiStrings } from "@/lib/ui-strings";

describe("fact link labels", () => {
  const links: FactLink[] = [
    ...Object.keys(PAGE_LINKS).map((key) => `page:${key}` as FactLink),
    ...Object.keys(ACTION_LINKS).map((key) => `action:${key}` as FactLink),
  ];

  it.each(["en", "zh"])("resolves every label to the site's own wording in %s", (locale) => {
    for (const link of links) {
      expect(fillUiStrings(factLinkMarkdown(link), locale)).toMatch(/^\[[^{}[\]]+\]\((page|action):\w+\)$/);
    }
  });
});

describe("page link labels", () => {
  it("are plain text in every locale", () => {
    for (const locale of ["en", "zh"]) {
      for (const { label } of Object.values(PAGE_LINKS)) {
        expect(fillUiStrings(label, locale)).not.toMatch(/<\/?\w+>/);
      }
    }
  });
});
