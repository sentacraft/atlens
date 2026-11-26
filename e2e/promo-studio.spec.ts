import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";

for (const collection of ["pancake", "under-200g", "fast-aperture-primes", "fisheye", "travel-zoom", "23mm", "under-200"]) {
  test(`shares the cover layout for ${collection}`, { tag: "@local-only" }, async ({ page }) => {
    await page.goto(`/admin/promo?collection=${collection}`);
    const cover = page.getByRole("article");
    const mount = cover.getByText("富士 X 卡口", { exact: true });
    await expect(mount).toBeVisible();
    expect(await mount.evaluate((item) => item.nextElementSibling?.tagName)).toBe("H2");
    await expect(cover.locator("footer")).not.toContainText(/富士 X 卡口|\d+ \/ \d+|按等效焦距分组|定焦与变焦分开比较/);
    const figures = cover.locator("figure");
    await expect(figures).toHaveCount(3);
    await expect(figures.locator("figcaption > span")).toHaveCount(3);
    await expect(figures.locator("figcaption > strong")).toHaveCount(3);
    await expect(cover.getByRole("heading")).toHaveCSS("letter-spacing", "-1.24px");
    await expect(cover.getByRole("heading")).toHaveCSS("margin-bottom", "24px");
    await expect(figures.first().locator("..")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const positions = await figures.evaluateAll((nodes) => nodes.map((figure) => ({
      photo: figure.querySelector("img")!.getBoundingClientRect().top,
      caption: figure.querySelector("figcaption")!.getBoundingClientRect().top,
    })));
    expect(new Set(positions.map(({ photo }) => photo)).size).toBe(1);
    expect(new Set(positions.map(({ caption }) => caption)).size).toBe(1);
    const layout = await cover.evaluate((poster) => {
      const photos = poster.querySelector("figure")!.parentElement!;
      const row = photos.getBoundingClientRect();
      const above = row.top - photos.previousElementSibling!.getBoundingClientRect().bottom;
      const footer = poster.querySelector("footer")!;
      const below = footer.getBoundingClientRect().top - row.bottom;
      const [stats, note] = [...footer.children];
      const [lenses, brands] = [...stats.children];
      const bounds = stats.getBoundingClientRect();
      const posterBounds = poster.getBoundingClientRect();
      const statsOffset = (bounds.left + bounds.right - posterBounds.left - posterBounds.right) / 2;
      const centers = [lenses, brands].map((item) => {
        const { top, height } = item.getBoundingClientRect();
        return top + height / 2;
      });
      return {
        statsOffset,
        footerRuleWidth: getComputedStyle(footer).borderTopWidth,
        footerCenterSpread: Math.max(...centers) - Math.min(...centers),
        above, below, height: poster.scrollHeight, width: poster.scrollWidth,
        footerFits: footer.scrollWidth === footer.clientWidth,
        footerRows: getComputedStyle(footer).gridTemplateRows,
        footerUnwrapped: [lenses, brands, ...(note ? [note] : [])].every((item) => getComputedStyle(item).whiteSpace === "nowrap"),
        noteOnOwnRow: !note || note.getBoundingClientRect().top >= Math.max(...[lenses, brands].map((item) => item.getBoundingClientRect().bottom)),
      };
    });
    expect(layout.above).toBeGreaterThan(0);
    expect(layout.below).toBeGreaterThan(0);
    expect([layout.width, layout.height]).toEqual([1080, 1440]);
    expect(layout.footerFits).toBe(true);
    expect(Math.abs(layout.statsOffset)).toBeLessThan(1);
    expect(layout.footerRuleWidth).toBe("0px");
    expect(layout.footerCenterSpread).toBeLessThan(1);
    expect(layout.footerRows.split(" ")).toHaveLength(2);
    expect(layout.footerRows).toMatch(/ 28px$/);
    expect(layout.footerUnwrapped).toBe(true);
    expect(layout.noteOnOwnRow).toBe(true);
  });
}

test("offers focal-range, single-focal-length and budget decks", { tag: "@local-only" }, async ({ page }) => {
  await page.goto("/admin/promo?collection=travel-zoom");
  const cover = page.getByRole("article");
  const options = page.getByLabel("镜头合集");
  await expect(cover.getByRole("heading", { name: "一镜走天下" })).toBeVisible();
  await expect(cover.locator("figcaption")).toHaveText([/腾龙.*18–300mm/, /适马.*16–300mm/, /富士.*18–120mm/]);
  await page.getByRole("button", { name: /一镜走天下/ }).first().click();
  await expect(cover.getByText("焦段范围", { exact: true })).toBeVisible();
  await expect(cover.getByText(/^\d+–\d+ mm$/).first()).toBeVisible();
  await options.selectOption("23mm");
  await page.getByRole("button", { name: /23mm 定焦镜头/ }).first().click();
  await expect(cover.getByText("最大光圈", { exact: true })).toBeVisible();
  await expect(cover.getByText("重量", { exact: true })).toBeVisible();
  await options.selectOption("under-200");
  await expect(cover.locator("figcaption > span")).toHaveText(["铭匠", "唯卓仕", "七工匠"]);
  await expect(cover.getByText("千元以下也有好镜头*", { exact: true })).toBeVisible();
  const notice = "所列价格仅供参考，实际价格请在购买前核实。";
  await expect(cover.locator("footer")).toContainText(notice);
  for (const label of ["AF 自动对焦", "MF 手动对焦"]) {
    await page.getByRole("button", { name: new RegExp(label) }).first().click();
    await expect(cover.getByRole("heading", { name: label })).toBeVisible();
    await expect(cover.getByText("参考价", { exact: true })).toBeVisible();
    await expect(cover.getByText(/^¥[\d,]+$/).first()).toBeVisible();
    await expect(cover.getByText(/^参考价 ¥/)).toHaveCount(0);
    await expect(cover.locator("footer")).toContainText(notice);
  }
});

test("previews a collection and exports its numbered PNG deck", { tag: "@local-only" }, async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "The archive assertions run on Chromium.");
  await page.goto("/admin");
  await page.getByRole("link", { name: /Promo Studio/ }).click();
  const collection = page.getByLabel("镜头合集");
  await collection.selectOption("fisheye");
  await expect(collection).toHaveValue("fisheye");
  await expect(page.getByRole("heading", { name: "鱼眼镜头" })).toBeVisible();
  await page.getByRole("button", { name: "等效 6–15 mm" }).click();
  const fisheye = page.getByRole("article");
  await expect(fisheye.getByText("视角", { exact: true })).toBeVisible();
  await expect(fisheye.getByText("180°–175°", { exact: true })).toBeVisible();
  await expect(fisheye.getByText("镜身长度", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "等效 11–15 mm" }).click();
  const upperWeight = fisheye.getByText("≤ 370 g", { exact: true });
  const fullWeight = fisheye.getByText("343–370 g", { exact: true });
  await expect(upperWeight).toHaveCSS("font-size", "28px");
  await expect(fullWeight).toHaveCSS("font-size", "20px");
  const upperBounds = await upperWeight.boundingBox();
  const fullBounds = await fullWeight.boundingBox();
  expect(fullBounds!.y).toBeGreaterThan(upperBounds!.y);
  const endStyle = page.getByLabel("末页样式");
  await expect(endStyle).toHaveValue("optical");
  await page.getByRole("button", { name: "末页" }).click();
  await expect(fisheye.getByRole("heading", { name: "atlens.app" })).toBeVisible();
  await expect(fisheye.getByText(/^\d+ 个品牌 · \d+ 支镜头$/)).toBeVisible();
  await expect(fisheye.getByText(/^共 \d+ 个$/)).toBeVisible();
  await expect(fisheye.getByRole("table")).toHaveCount(0);
  await expect(fisheye).not.toContainText("04 / 04");
  await endStyle.selectOption("detailed");
  await expect(fisheye.getByRole("heading", { name: "不止鱼眼镜头" })).toBeVisible();
  await expect(fisheye.getByRole("heading", { name: "主题合集" })).toBeVisible();
  await expect(fisheye.getByText(/^共 \d+ 个$/)).toBeVisible();
  await expect(fisheye.getByText("饼干头", { exact: true })).toBeVisible();
  await expect(fisheye.getByText("轻量化镜头", { exact: true })).toBeVisible();
  await expect(fisheye.getByText("精选两组")).toHaveCount(0);
  await expect(fisheye.getByText("结合镜头规格和评测观点，", { exact: true })).toHaveCSS("white-space", "nowrap");
  await expect(fisheye.getByText("XF 23mm F1.4 R LM WR", { exact: true })).toHaveCSS("white-space", "nowrap");
  expect(await fisheye.evaluate((node) => node.scrollHeight)).toBe(1440);
  await collection.selectOption("pancake");
  await page.getByRole("button", { name: "封面" }).click();
  const scope = page.getByRole("article").locator("footer").getByText(/不含鱼眼、微距和移轴等特殊镜头/);
  await expect(scope).toBeVisible();
  await page.getByRole("button", { name: "等效 27 mm" }).click();
  const preview = page.getByRole("article");
  await expect(preview.getByText("33.7 mm")).toBeVisible();
  await expect(preview.getByText("116 g")).toBeVisible();
  await expect(preview.locator("footer")).toContainText("03 / 06");
  await page.getByRole("button", { name: "等效 15–21 mm" }).click();
  await expect(preview.getByText("等效 15 mm", { exact: false })).toHaveCount(0);
  await expect(preview.getByText("等效 21 mm", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "等效 35–38 mm" }).click();
  for (const value of ["16.7 mm", "166–189 g"]) {
    const cell = preview.getByText(value, { exact: true });
    await expect(cell).toBeVisible();
    expect(await cell.evaluate((node) => getComputedStyle(node).whiteSpace === "nowrap" && node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  await expect(preview.getByRole("heading")).toHaveCSS("font-family", /Geist/);
  await endStyle.selectOption("detailed");
  await expect(preview.getByRole("heading", { name: "不止饼干头" })).toBeVisible();
  await expect(preview.getByText("AI", { exact: true })).toBeVisible();
  await expect(preview.getByText("想找一支轻便的夜拍镜头，有推荐吗？")).toBeVisible();
  await expect(preview.getByText("富士 18 和 23，哪支更适合扫街？")).toBeVisible();
  const comparison = preview.getByRole("table");
  await expect(comparison.getByRole("columnheader", { name: "XF 23mm F1.4 R LM WR" })).toBeVisible();
  await expect(comparison.getByRole("columnheader", { name: "XF 23mm F2 R WR" })).toBeVisible();
  await expect(comparison.getByRole("cell", { name: "77.8 mm" })).toBeVisible();
  await expect(comparison.getByRole("cell", { name: "180 g" })).toBeVisible();
  await expect(preview.getByText("atlens.app", { exact: true })).toBeVisible();
  await expect(preview).not.toContainText("06 / 06");
  expect(await preview.evaluate((node) => node.scrollHeight)).toBe(1440);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载整套/ }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("pancake-xiaohongshu.zip");
  const archive = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(archive)).toEqual(Array.from({ length: 6 }, (_, i) => `0${i + 1}-pancake.png`));
  for (const image of Object.values(archive)) {
    const png = new DataView(image.buffer, image.byteOffset, image.byteLength);
    expect(png.getUint32(0)).toBe(0x89504e47);
    expect([png.getUint32(16), png.getUint32(20)]).toEqual([1080, 1440]);
  }
  const hasInkInCoverPageNumberArea = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(990, 1270, 18, 80);
    return data.some((value, index) => index % 4 === 0 && value < 160);
  }, Buffer.from(archive["01-pancake.png"]).toString("base64"));
  expect(hasInkInCoverPageNumberArea).toBe(false);
});
