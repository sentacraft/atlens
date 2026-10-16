import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { ABOUT_FACT_SOURCES, staleAboutCopy } from "@/lib/site-facts/about-sources";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";

describe("About copy and the site facts it restates", () => {
  it("cites existing facts from existing About messages", () => {
    const ids = new Set(HANDWRITTEN_FACTS.map((fact) => fact.id));
    for (const [key, { facts }] of Object.entries(ABOUT_FACT_SOURCES)) {
      expect(en.About, key).toHaveProperty(key);
      expect(zh.About, key).toHaveProperty(key);
      for (const id of facts) {
        expect(ids.has(id), `${key} cites unknown fact ${id}`).toBe(true);
      }
    }
  });

  it("was reviewed against the facts as they are now", () => {
    const stale = staleAboutCopy().map(
      ({ key, facts, hash }) => `About.${key} (cites ${facts.join(", ")}): re-review the copy, then set hash to "${hash}"`,
    );
    expect(stale).toEqual([]);
  });
});
