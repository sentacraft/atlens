import { describe, expect, it } from "vitest";
import lensesData from "@/data/lenses.json";
import type { Lens } from "@/lib/types";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import { lensSearchQuery } from "@/lib/lens/lens";

const base = (lensesData as unknown as Lens[])[0];
const viltrox: Lens = {
  ...base,
  brand: "viltrox",
  model: "AF 23mm F1.4",
  searchAliases: { en: "Viltrox AF 23mm f1.4 Fuji X", zh: "唯卓仕 AF 23mm f1.4 富士" },
};

function links(locale: string, lens: Lens = viltrox) {
  return buildReviewSearchLinks({ lens, locale, brandName: "Viltrox", reviewKeyword: locale === "zh" ? "评测" : "review" });
}

describe("lensSearchQuery", () => {
  it("uses the alias for the page language, falling back to English", () => {
    expect(lensSearchQuery(viltrox, "zh")).toBe("唯卓仕 AF 23mm f1.4 富士");
    expect(lensSearchQuery(viltrox, "en")).toBe("Viltrox AF 23mm f1.4 Fuji X");
    expect(lensSearchQuery({ ...viltrox, searchAliases: { en: "Viltrox AF 23mm f1.4 Fuji X" } }, "zh")).toBe(
      "Viltrox AF 23mm f1.4 Fuji X",
    );
  });
});

describe("buildReviewSearchLinks", () => {
  it("offers Bilibili, YouTube, Bing and Flickr on the Chinese page, in that order", () => {
    expect(links("zh").map((link) => [link.channel, link.kind])).toEqual([
      ["bilibili", "video"],
      ["youtube", "video"],
      ["bing", "article"],
      ["flickr", "photos"],
    ]);
  });

  it("offers YouTube, Google, Flickr and r/fujifilm on the English page, in that order", () => {
    expect(links("en").map((link) => [link.channel, link.kind])).toEqual([
      ["youtube", "video"],
      ["google", "article"],
      ["flickr", "photos"],
      ["reddit", "discussion"],
    ]);
  });

  it("searches videos and articles for the page-language alias plus the review keyword", () => {
    const byChannel = Object.fromEntries(links("zh").map((link) => [link.channel, new URL(link.url)]));
    expect(byChannel.bilibili.searchParams.get("keyword")).toBe("唯卓仕 AF 23mm f1.4 富士 评测");
    expect(byChannel.youtube.searchParams.get("search_query")).toBe("唯卓仕 AF 23mm f1.4 富士 评测");
    expect(byChannel.bing.origin).toBe("https://www.bing.com");
    expect(byChannel.bing.searchParams.get("q")).toBe("唯卓仕 AF 23mm f1.4 富士 评测");
  });

  it("searches Flickr for the English brand and model, without the store-listing mount suffix", () => {
    const flickr = new URL(links("zh").find((link) => link.channel === "flickr")!.url);
    expect(flickr.searchParams.get("text")).toBe("Viltrox AF 23mm F1.4");
  });

  it("searches r/fujifilm for the alias alone", () => {
    const reddit = new URL(links("en").find((link) => link.channel === "reddit")!.url);
    expect(reddit.pathname).toBe("/r/fujifilm/search/");
    expect(reddit.searchParams.get("q")).toBe("Viltrox AF 23mm f1.4 Fuji X");
  });
});
