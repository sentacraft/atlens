import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";

test("previews a collection and exports its numbered PNG deck", async ({ page, browserName }) => {
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
  await collection.selectOption("pancake");
  await page.getByRole("button", { name: "等效 27 mm" }).click();
  const preview = page.getByRole("article");
  await expect(preview.getByText("33.7 mm")).toBeVisible();
  await expect(preview.getByText("116 g")).toBeVisible();
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
  await page.getByRole("button", { name: "末页" }).click();
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
});
