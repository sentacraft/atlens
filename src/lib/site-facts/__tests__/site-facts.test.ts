import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { getLensesByMount } from "@/lib/lens/data";
import { SITE_TOPICS, siteFacts, uncoveredQuestionFact } from "@/lib/site-facts";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";
import { COLLECTIONS } from "@/lib/collections";

function factsFor(topic: (typeof SITE_TOPICS)[number], locale: string): string {
  return siteFacts([topic], locale, "X")[0].facts.join("\n");
}

describe("siteFacts", () => {
  it("has facts for every topic, and fact ids are unique", () => {
    for (const { topic, facts } of siteFacts([...SITE_TOPICS], "en", "X")) {
      expect(facts.length, topic).toBeGreaterThan(0);
    }
    const ids = HANDWRITTEN_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns each requested topic once", () => {
    expect(siteFacts(["privacy", "privacy", "data"], "en", "X").map((group) => group.topic)).toEqual(["privacy", "data"]);
  });

  it("fills UI names in the user's language, and every placeholder resolves", () => {
    expect(factsFor("project", "zh")).toContain(zh.About.authorName);
    expect(factsFor("project", "en")).not.toMatch(/[\u4e00-\u9fff]/);
    expect(factsFor("account", "zh")).toContain(`"${zh.Auth.deleteAccount}"`);
    for (const locale of ["en", "zh"]) {
      expect(JSON.stringify(siteFacts([...SITE_TOPICS], locale, "X"))).not.toMatch(/\{\w+\.\w+\}/);
    }
  });

  it("gives only the user's own site's tipping channel, store links, and price sources", () => {
    expect(factsFor("business", "zh")).toContain(zh.About.donationWechatLabel);
    expect(factsFor("business", "zh")).not.toContain("Ko-fi");
    expect(factsFor("business", "en")).toContain("tip with Ko-fi");
    expect(factsFor("business", "en")).not.toContain(en.About.donationWechatLabel);
    expect(factsFor("business", "en")).toContain(en.Purchase.disclosureDetail);
    expect(factsFor("prices", "zh")).not.toContain("eBay");
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
    expect(factsFor("usage", "zh")).toContain(`"${zh.Nav.getApp}" page`);
  });

  it("lists price sources from the data", () => {
    expect(factsFor("prices", "en")).toMatch(/used from .*eBay/);
  });

  it("lists every collection from collections.json with its link, on mounts that have them", () => {
    const zhFacts = factsFor("collections", "zh");
    for (const c of Object.values(COLLECTIONS)) {
      expect(zhFacts).toContain(`[${c.title.zh}](collection:${c.slug})`);
    }
    expect(factsFor("collections", "en")).not.toMatch(/[\u4e00-\u9fff]/);
    expect(siteFacts(["collections"], "en", "G")[0].facts.join("\n")).not.toContain("collection:");
  });

  it("hands Iris each fact's links", () => {
    expect(factsFor("business", "zh")).toContain(`(links: [${zh.About.supportTitle}](page:aboutSupport))`);
    expect(factsFor("project", "en")).toContain(`(links: [GitHub](page:repo), [${en.AskIris.linkDataLicense}](page:dataLicense))`);
  });

  it("points questions the facts don't cover to the feedback form, labelled in the user's language", () => {
    expect(uncoveredQuestionFact("zh")).toContain(`[${zh.Nav.feedback}](action:feedback)`);
    expect(uncoveredQuestionFact("en")).toContain(`[${en.Nav.feedback}](action:feedback)`);
  });
});
