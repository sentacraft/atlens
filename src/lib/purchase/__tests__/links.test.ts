import { describe, expect, it } from "vitest";
import { getAllLenses } from "@/lib/lens/data";
import { buildPurchaseLinks } from "@/lib/purchase/links";
import type { Lens } from "@/lib/types";

const BASE_LENS = getAllLenses("en")[0];

function lensWithOffers(brand: string, entries: NonNullable<NonNullable<Lens["pricing"]>["global"]>["new"]): Lens {
  return {
    ...BASE_LENS,
    brand,
    pricing: {
      global: {
        new: entries,
      },
    },
  };
}

describe("buildPurchaseLinks", () => {
  it.each(["US", "DE", "GB", "AT"] as const)(
    "builds non-affiliate Amazon links without any tag param for %s",
    (country) => {
      const lens = lensWithOffers("fujifilm", [
        {
          price: 899,
          currency: "USD",
          source: "Amazon",
          url: "https://www.amazon.com/dp/B0B9Z12345",
          sampledAt: "2026-10-05",
          purchasableChannel: "amazon",
        },
      ]);

      const links = buildPurchaseLinks(lens, "en", country);
      const amazon = links.find((link) => link.channel === "amazon");
      expect(amazon).toBeDefined();
      expect(amazon!.isAffiliate).toBe(false);
      expect(new URL(amazon!.url).searchParams.has("tag")).toBe(false);
    },
  );

  it("keeps enrolled official store and eBay affiliate links intact", () => {
    const lens = lensWithOffers("viltrox", [
      {
        price: 179,
        currency: "USD",
        source: "Viltrox",
        url: "https://viltrox.com/products/af-35mm-f17",
        sampledAt: "2026-10-05",
        purchasableChannel: "official",
      },
      {
        price: 179,
        currency: "USD",
        source: "Amazon",
        url: "https://www.amazon.com/dp/B0DTEST123",
        sampledAt: "2026-10-05",
        purchasableChannel: "amazon",
      },
    ]);

    const links = buildPurchaseLinks(lens, "en", "US");
    const official = links.find((link) => link.channel === "official");
    const amazon = links.find((link) => link.channel === "amazon");
    const ebay = links.find((link) => link.channel === "ebay");

    expect(official?.isAffiliate).toBe(true);
    expect(new URL(official!.url).searchParams.get("ref")).toBe("owbtcyuk");
    expect(amazon?.isAffiliate).toBe(false);
    expect(new URL(amazon!.url).searchParams.has("tag")).toBe(false);
    expect(ebay?.isAffiliate).toBe(true);
    expect(new URL(ebay!.url).searchParams.get("campid")).toBeTruthy();
  });

  it("keeps zh locale on non-affiliate JD and Taobao links", () => {
    const links = buildPurchaseLinks(BASE_LENS, "zh", "CN");
    expect(links.map((link) => link.channel)).toEqual(["jd", "taobao"]);
    expect(links.every((link) => !link.isAffiliate)).toBe(true);
  });
});
