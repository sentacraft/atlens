import { describe, expect, it } from "vitest";
import lensesData from "@/data/lenses.json";
import type { Lens } from "@/lib/types";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import { searchNameFor } from "@/lib/lens/lens";

const base = (lensesData as unknown as Lens[])[0];
const viltrox: Lens = {
  ...base,
  brand: "viltrox",
  model: "AF 23mm F1.4",
  searchAliases: {
    store: { en: "Viltrox AF 23mm f1.4 Fuji X", zh: "唯卓仕 AF 23mm f1.4 富士" },
    review: { en: "Viltrox AF 23mm f1.4", zh: "唯卓仕 AF 23mm f1.4" },
  },
};

function links(locale: string, lens: Lens = viltrox) {
  return buildReviewSearchLinks({ lens, locale, reviewKeyword: locale === "zh" ? "评测" : "review" });
}

describe("searchNameFor", () => {
  it("uses the page language's name, falling back to English", () => {
    expect(searchNameFor({ en: "Viltrox AF 23mm f1.4", zh: "唯卓仕 AF 23mm f1.4" }, "zh")).toBe("唯卓仕 AF 23mm f1.4");
    expect(searchNameFor({ en: "Viltrox AF 23mm f1.4", zh: "唯卓仕 AF 23mm f1.4" }, "en")).toBe("Viltrox AF 23mm f1.4");
    expect(searchNameFor({ en: "Viltrox AF 23mm f1.4" }, "zh")).toBe("Viltrox AF 23mm f1.4");
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

  it("searches videos and articles for the page-language review name plus the review keyword", () => {
    const byChannel = Object.fromEntries(links("zh").map((link) => [link.channel, new URL(link.url)]));
    expect(byChannel.bilibili.searchParams.get("keyword")).toBe("唯卓仕 AF 23mm f1.4 评测");
    expect(byChannel.youtube.searchParams.get("search_query")).toBe("唯卓仕 AF 23mm f1.4 评测");
    expect(byChannel.bing.origin).toBe("https://www.bing.com");
    expect(byChannel.bing.searchParams.get("q")).toBe("唯卓仕 AF 23mm f1.4 评测");
    const google = new URL(links("en").find((link) => link.channel === "google")!.url);
    expect(google.searchParams.get("q")).toBe("Viltrox AF 23mm f1.4 review");
  });

  it("searches Flickr for the English review name and r/fujifilm for the page-language one", () => {
    const zhFlickr = new URL(links("zh").find((link) => link.channel === "flickr")!.url);
    expect(zhFlickr.searchParams.get("text")).toBe("Viltrox AF 23mm f1.4");
    const reddit = new URL(links("en").find((link) => link.channel === "reddit")!.url);
    expect(reddit.pathname).toBe("/r/fujifilm/search/");
    expect(reddit.searchParams.get("q")).toBe("Viltrox AF 23mm f1.4");
  });

  it("never searches with the store name", () => {
    for (const locale of ["zh", "en"]) {
      for (const link of links(locale)) {
        expect(decodeURIComponent(link.url)).not.toMatch(/Fuji X|富士/);
      }
    }
  });
});
