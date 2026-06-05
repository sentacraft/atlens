// Collection poster slicer.
//
// Renders a collection page at a mobile viewport, captures one full-page
// screenshot, then slices it into share-ready segments cut at the gaps
// between lens cards (never through a card). Range is the page top down to
// the bottom of the lens grid — the "report an issue" CTA and the "related
// collections" footer below it are excluded.
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

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SLUG = arg("slug", "pancake");
const LOCALE = arg("locale", "zh");
const MOUNT = arg("mount", "x");
// Default to production: no dev indicator / HMR artifacts, real optimized
// images. Point --base at a local dev server to preview unreleased copy.
const BASE = arg("base", "https://atlens.app");
const WIDTH = Number(arg("width", "390"));
const DPR = Number(arg("dpr", "3"));
// Max CSS height per segment. A single card taller than this still ships
// whole (never split) — the cap only governs how many cards we pack together.
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
  // 'load' not 'networkidle': the Next dev server keeps an HMR websocket open,
  // so the page never reaches network idle. Settle with a fixed pause instead.
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Trigger lazy-loaded card images: step-scroll to the bottom, then back up.
  // Driven from Node in short hops (not one long in-page loop) so a stray
  // re-render can't destroy a long-lived execution context mid-scroll.
  const docHeight = await page.evaluate(() => document.body.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < docHeight; y += vh) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  // Wait for every <img> to finish decoding so no card renders half-loaded.
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? Promise.resolve() : img.decode().catch(() => {}),
      ),
    ),
  );

  // Hide bottom-anchored fixed/sticky chrome (back-to-top, compare bar, etc.)
  // so it doesn't get baked into the last segment. The top Nav (anchored at
  // y≈0) is kept — it appears once at the page top in segment 1.
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

  // Measure card boundaries and the grid bottom (the hard end of the range).
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

  // Pack whole cards into segments up to MAX_SEG; cut at the midpoint of the
  // gap between the last card of one segment and the first of the next.
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

  // One full-page capture; slice it with sharp at device-pixel coordinates.
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
