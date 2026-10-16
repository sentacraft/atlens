// Slices a collection page screenshot into share-ready segments, cut between cards.
//
// Usage:
//   node scripts/collection-poster.mjs --slug pancake --locale zh
//   node scripts/collection-poster.mjs --slug pancake --locale zh --max 1600 --dpr 3
//
// Output: poster-out/<slug>-<locale>/segment-NN.png

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { SITE } from "../src/config/site.ts";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SLUG = arg("slug", "pancake");
const LOCALE = arg("locale", "zh");
const MOUNT = arg("mount", "x");
const BASE = arg("base", SITE.url);
const WIDTH = Number(arg("width", "390"));
const DPR = Number(arg("dpr", "3"));
const MAX_SEG = Number(arg("max", "1100"));

const url = `${BASE}/${LOCALE}/lenses/${MOUNT}/collections/${SLUG}`;
const outDir = path.resolve("poster-out", `${SLUG}-${LOCALE}`);

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 844 },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();

  console.log(`→ ${url}`);
  // 'load', not 'networkidle': the dev server's HMR websocket never idles.
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Short hops from Node: a re-render can destroy a long-lived in-page loop.
  const docHeight = await page.evaluate(() => document.body.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < docHeight; y += vh) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? Promise.resolve() : img.decode().catch(() => {}),
      ),
    ),
  );

  await page.evaluate(() => {
    for (const el of document.querySelectorAll("*")) {
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") {
        if (el.getBoundingClientRect().top > 80) {
          el.style.display = "none";
        }
      }
    }
  });

  const layout = await page.evaluate(() => {
    const grid = [...document.querySelectorAll("main div.grid")].find((el) =>
      el.className.includes("grid-cols-1"),
    );
    if (!grid) {
      return null;
    }
    const sy = window.scrollY;
    const cards = [...grid.children].map((c) => {
      const r = c.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy };
    });
    const gridBottom = grid.getBoundingClientRect().bottom + sy;
    return { cards, gridBottom };
  });

  if (!layout || layout.cards.length === 0) {
    throw new Error("Could not locate the lens grid / cards on the page.");
  }
  const { cards, gridBottom } = layout;

  const segments = [];
  let segStart = 0;
  let i = 0;
  while (i < cards.length) {
    let j = i;
    while (
      j + 1 < cards.length &&
      cards[j + 1].bottom - segStart <= MAX_SEG
    ) {
      j++;
    }
    const segEnd =
      j === cards.length - 1
        ? gridBottom
        : (cards[j].bottom + cards[j + 1].top) / 2;
    segments.push({ start: segStart, end: segEnd, cardCount: j - i + 1 });
    segStart = segEnd;
    i = j + 1;
  }

  const buf = await page.screenshot({ fullPage: true, type: "png" });
  const meta = await sharp(buf).metadata();

  let n = 0;
  for (const seg of segments) {
    n++;
    const top = Math.round(seg.start * DPR);
    const height = Math.min(
      Math.round((seg.end - seg.start) * DPR),
      meta.height - top,
    );
    const file = path.join(
      outDir,
      `segment-${String(n).padStart(2, "0")}.png`,
    );
    await sharp(buf)
      .extract({ left: 0, top, width: meta.width, height })
      .png()
      .toFile(file);
    console.log(
      `  segment ${n}: ${seg.cardCount} card(s)  css[${Math.round(
        seg.start,
      )}–${Math.round(seg.end)}]  ${meta.width}×${height}px  → ${path.relative(
        process.cwd(),
        file,
      )}`,
    );
  }

  await browser.close();
  console.log(
    `\n✓ ${segments.length} segment(s), ${cards.length} cards total → ${path.relative(
      process.cwd(),
      outDir,
    )}/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
