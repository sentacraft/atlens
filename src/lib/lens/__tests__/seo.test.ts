import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { SITE } from "@/config/site";
import { buildItemListSchema, buildLensDescription, lensListItems } from "@/lib/lens/seo";
import { getLensesByMount } from "@/lib/lens/data";
import { META_DESCRIPTION_MAX } from "@/lib/seo/meta-description";
import type { LensImageAsset } from "@/lib/types";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

const mtf = { id: "mtf", role: "mtf" } as const;
const diagram = { id: "diagram", role: "optical-construction" } as const;

describe.each([
  { locale: "en", messages: en, chartText: "MTF charts", diagramText: "optical diagram" },
  { locale: "zh", messages: zh, chartText: "MTF 曲线", diagramText: "光学结构图" },
] as const)("lens descriptions in $locale", ({ locale, messages, chartText, diagramText }) => {
  const t = createTranslator({ locale, messages, namespace: "LensDetail" });
  const lens = getLensesByMount("G", locale).find((item) => item.id === "fujifilm-gf-35-70mmf45-56-wr-g")!;
  const describeImages = (images?: LensImageAsset[]) => buildLensDescription({
    lens: { ...lens, images }, mount: "G", brandName: "Fujifilm", locale, t,
  });

  it("keeps the existing summary without optical images", () => {
    const description = describeImages();
    expect(description).toContain(t("metaWr"));
    expect(description).not.toContain(chartText);
    expect(description).not.toContain(diagramText);
    expect(describeImages([{ id: "product", role: "product" }])).toBe(description);
  });

  it.each([
    [[mtf], true, false],
    [[diagram], false, true],
    [[mtf, diagram], true, true],
  ] as const)("describes only the optical images that are present: %j", (images, hasChart, hasDiagram) => {
    const description = describeImages([...images]);
    expect(description.includes(chartText)).toBe(hasChart);
    expect(description.includes(diagramText)).toBe(hasDiagram);
    expect(description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX[locale]);
  });
});

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
