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
  await collection.selectOption("pancake");
  await page.getByRole("button", { name: "等效 27 mm" }).click();
  const preview = page.getByRole("article");
  await expect(preview.getByText("33.7 mm")).toBeVisible();
  await expect(preview.getByText("116 g")).toBeVisible();
  await page.getByRole("button", { name: "等效 15–21 mm" }).click();
  await expect(preview.getByText("等效 15 mm", { exact: false })).toHaveCount(0);
  await expect(preview.getByText("等效 21 mm", { exact: false })).toHaveCount(0);
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
