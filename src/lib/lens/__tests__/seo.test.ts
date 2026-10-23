import { describe, expect, it } from "vitest";
import { SITE } from "@/config/site";
import { buildItemListSchema, lensListItems } from "@/lib/lens/seo";

describe("lensListItems", () => {
  it("names each lens the way the site does and links it in the page's locale", () => {
    const items = lensListItems(
      [{ id: "sigma-18-50-x", mount: "X", brand: "sigma", series: "Contemporary", model: "18-50mm F2.8 DC DN | Contemporary" }],
      () => "Sigma",
      "en",
    );
    expect(items).toEqual([{ name: "Sigma 18-50mm F2.8 DC DN | Contemporary", url: `${SITE.url}/en/lenses/x/sigma-18-50-x` }]);
  });
});

describe("buildItemListSchema", () => {
  it("numbers the items from one", () => {
    const schema = buildItemListSchema({ name: "List", description: "", url: SITE.url, items: [{ name: "A", url: "a" }, { name: "B", url: "b" }] });
    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement.map((item) => item.position)).toEqual([1, 2]);
  });
});
