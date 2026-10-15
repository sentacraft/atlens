import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { getLensesByMount } from "@/lib/lens/data";
import { SITE_TOPICS, siteFacts } from "@/lib/site-facts";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";

function factsFor(topic: (typeof SITE_TOPICS)[number], locale: string): string {
  return siteFacts([topic], locale)[0].facts.join("\n");
}

describe("siteFacts", () => {
  it("has facts for every topic, and fact ids are unique", () => {
    for (const { topic, facts } of siteFacts([...SITE_TOPICS], "en")) {
      expect(facts.length, topic).toBeGreaterThan(0);
    }
    const ids = HANDWRITTEN_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns each requested topic once", () => {
    expect(siteFacts(["privacy", "privacy", "data"], "en").map((group) => group.topic)).toEqual(["privacy", "data"]);
  });

  it("names the author as the user's locale writes it", () => {
    expect(factsFor("project", "zh")).toContain(zh.About.authorName);
    expect(factsFor("project", "en")).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("describes coverage from the lens data and the coverage table", () => {
    const data = factsFor("data", "en");
    expect(data).toContain(`X mount, ${getLensesByMount("X", "en").length} lenses in all`);
    const fujifilm = getLensesByMount("X", "en").filter((lens) => lens.brand === "fujifilm").length;
    expect(data).toContain(`Fujifilm: ${fujifilm} lenses; current lenses covered, discontinued covered, cinema covered`);
  });

  it("names features and account benefits as the site shows them in the user's language", () => {
    expect(factsFor("usage", "zh")).toContain(`"${zh.Nav.collections}"`);
    expect(factsFor("usage", "en")).toContain(`"${en.Nav.collections}"`);
    expect(factsFor("account", "zh")).toContain(zh.Auth.benefitFavorites);
  });

  it("lists affiliate stores and price sources from code and data", () => {
    expect(factsFor("business", "en")).toContain(`English site: ${en.Purchase.disclosureDetail}`);
    expect(factsFor("prices", "en")).toMatch(/used from .*eBay/);
  });
});
