#!/usr/bin/env tsx
// Run via pnpm run assets:icons when icon inputs change.

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";

import Iris from "../src/components/iris/Iris.tsx";
import { IRIS_NAV, R_HOUSING, type IrisConfig } from "../src/config/iris-config.ts";
import { SPLASH_DEVICES, SPLASH_BG, splashUrl } from "../src/config/splash.ts";
import { buildDerivedConfig } from "../src/lib/iris/kinematics.ts";

const INPUT_FILES = [
  resolve("scripts/gen-icons.tsx"),
  resolve("src/components/iris/Iris.tsx"),
  resolve("src/config/iris-config.ts"),
  resolve("src/config/splash.ts"),
  resolve("src/lib/iris/kinematics.ts"),
];

const HASH_PATH = resolve(".gen-icons-hash");

function computeInputHash(): string {
  const h = createHash("sha256");
  for (const f of INPUT_FILES) {
    h.update(readFileSync(f));
  }
  return h.digest("hex");
}

const inputHash = computeInputHash();
const storedHash = existsSync(HASH_PATH) ? readFileSync(HASH_PATH, "utf-8").trim() : "";

if (inputHash === storedHash) {
  console.log("✓ Icon inputs unchanged — skipping generation.");
  process.exit(0);
}

function resolvePackageFile(pkg: string, relPath: string): string {
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, "node_modules", pkg, relPath);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Cannot find ${pkg}/${relPath} in any node_modules`);
    }
    dir = parent;
  }
}

const geistBoldPath    = resolvePackageFile("geist", "dist/fonts/geist-sans/Geist-Bold.ttf");
const geistRegularPath = resolvePackageFile("geist", "dist/fonts/geist-sans/Geist-Regular.ttf");

// fill_ratio = clipR / padR = 1 - 2 * padding. Maskable stays inside Android's 80% safe zone.

const dc = buildDerivedConfig(IRIS_NAV, R_HOUSING);
const clipR = R_HOUSING - dc.bladeWidth; // visible iris radius in SVG units

// Must match the vbHalf formula in Iris.tsx.
const vbHalf = clipR + 2;
const tightViewBox = `viewBox="${-vbHalf} ${-vbHalf} ${vbHalf * 2} ${vbHalf * 2}"`;

const PADDING = {
  favicon:  0.05,   // → ~90% fill
  standard: 0.175,  // → ~65% fill
  maskable: 0.225,  // → ~55% fill
} as const;

function padR(padding: number): number {
  return clipR / (1 - padding * 2);
}

function paddedViewBox(padding: number): string {
  const r = padR(padding);
  return `viewBox="${-r} ${-r} ${r * 2} ${r * 2}"`;
}

function irisToSvg(size: number, padding: number, background?: string): string {
  const html = renderToStaticMarkup(
    createElement(Iris, { config: IRIS_NAV, uid: "gen", size })
  );
  const match = html.match(/<svg[\s\S]*<\/svg>/);
  if (!match) {
    throw new Error("gen-icons: no <svg> found in rendered Iris output");
  }
  let result = match[0]
    .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `)
    .replace(tightViewBox, paddedViewBox(padding));
  // Absolute coordinates: resvg mis-resolves "100%" when the viewBox origin is negative.
  if (background) {
    const r = padR(padding);
    result = result.replace(
      /(<svg[^>]*>)/,
      `$1<rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" fill="${background}"/>`
    );
  }
  return result;
}

function svgToPng(svg: string, size: number, opts?: ResvgRenderOptions): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size }, ...opts });
  return Buffer.from(resvg.render().asPng());
}

// Nested <svg> keeps masks and clipPaths, which resvg supports and Satori does not.

function irisEmbedSvg(
  x: number,
  y: number,
  size: number,
  padding: number,
  config: IrisConfig = IRIS_NAV,
  uid = "og",
): string {
  const html = renderToStaticMarkup(
    createElement(Iris, { config, uid, size })
  );
  const match = html.match(/<svg[\s\S]*<\/svg>/);
  if (!match) {
    throw new Error("gen-icons: no <svg> found in Iris render");
  }
  return match[0]
    .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" `)
    .replace(tightViewBox, paddedViewBox(padding));
}

function generateOgSvg(): string {
  const canvasW = 1200, canvasH = 630;
  const irisSize = 380;
  const irisX = 80;
  const irisY = Math.round((canvasH - irisSize) / 2);   // 125

  const dividerX  = irisX + irisSize + 48;              // 508
  const dividerH  = 200;
  const dividerY1 = Math.round((canvasH - dividerH) / 2); // 215
  const dividerY2 = dividerY1 + dividerH;                  // 415

  const textX = dividerX + 1 + 52;                      // 561

  const titleSize    = 96;
  const subtitleSize = 26;
  const blockH    = titleSize + 24 + subtitleSize;
  const blockTop  = Math.round((canvasH - blockH) / 2); // 242
  const titleY    = blockTop + Math.round(titleSize    * 0.80); // ~319
  const subtitleY = blockTop + titleSize + 24 + Math.round(subtitleSize * 0.80); // ~383

  // SVG letter-spacing is in absolute units, not em.
  const titleLS    = (-0.02 * titleSize).toFixed(2);    // -1.92
  const subtitleLS = ( 0.12 * subtitleSize).toFixed(2); //  3.12

  const irisSvg = irisEmbedSvg(irisX, irisY, irisSize, PADDING.standard);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">
  <rect width="${canvasW}" height="${canvasH}" fill="#FAFAF9"/>
  ${irisSvg}
  <line x1="${dividerX}" y1="${dividerY1}" x2="${dividerX}" y2="${dividerY2}" stroke="#E5E5E5" stroke-width="1"/>
  <text x="${textX}" y="${titleY}" font-family="Geist" font-weight="700" font-size="${titleSize}" fill="#1A1A1A" letter-spacing="${titleLS}">Atlens</text>
  <text x="${textX}" y="${subtitleY}" font-family="Geist" font-weight="400" font-size="${subtitleSize}" fill="#8A8A8A" letter-spacing="${subtitleLS}">LENS DATA, NORMALIZED.</text>
</svg>`;
}

function buildIco(images: Array<{ size: number; png: Buffer }>): Buffer {
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + dirEntrySize * images.length;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const dirEntries: Buffer[] = [];
  for (const { size, png } of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2);                       // colour palette
    entry.writeUInt8(0, 3);                       // reserved
    entry.writeUInt16LE(1, 4);                    // colour planes
    entry.writeUInt16LE(32, 6);                   // bits per pixel
    entry.writeUInt32LE(png.length, 8);           // data size
    entry.writeUInt32LE(dataOffset, 12);          // data offset
    dirEntries.push(entry);
    dataOffset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((i) => i.png)]);
}

const appDir  = resolve("src/app");
const iconsDir = resolve("public/icons");
mkdirSync(iconsDir, { recursive: true });

const outputs: Array<{
  path: string;
  size: number;
  padding: number;
  background?: string;
}> = [
  { path: `${appDir}/icon.png`,        size: 32,  padding: PADDING.favicon   },
  { path: `${iconsDir}/icon-maskable-192.png`,  size: 192,  padding: PADDING.maskable },
  { path: `${iconsDir}/icon-maskable-512.png`,  size: 512,  padding: PADDING.maskable },
  { path: `${iconsDir}/icon-192.png`,   size: 192,  padding: PADDING.standard },
  { path: `${iconsDir}/icon-512.png`,   size: 512,  padding: PADDING.standard },
  { path: `${iconsDir}/icon-1024.png`,  size: 1024, padding: PADDING.standard },
  // iOS fills transparent pixels with an uncontrolled color, so apple-touch-icon is opaque.
  { path: `${iconsDir}/icon-192-white.png`,   size: 192,  padding: PADDING.standard, background: "white" },
  { path: `${iconsDir}/icon-512-white.png`,   size: 512,  padding: PADDING.standard, background: "white" },
  { path: `${iconsDir}/icon-1024-white.png`,  size: 1024, padding: PADDING.standard, background: "white" },
];

const faviconPath = resolve("public/favicon.ico");
const splashDir = resolve("public/splash");

for (const { path, size, padding, background } of outputs) {
  writeFileSync(path, svgToPng(irisToSvg(size, padding, background), size));
  const label = path.replace(resolve(".") + "/", "");
  console.log(`✓ ${label} (${size}×${size})`);
}

const faviconSizes = [16, 32, 48];
const faviconImages = faviconSizes.map((size) => ({
  size,
  png: svgToPng(irisToSvg(size, PADDING.favicon), size),
}));
writeFileSync(faviconPath, buildIco(faviconImages));
console.log(`✓ public/favicon.ico (${faviconSizes.join("+")}px)`);

const ogFontOpts: ResvgRenderOptions = {
  font: {
    fontFiles: [geistBoldPath, geistRegularPath],
    loadSystemFonts: false,
  },
};
writeFileSync(resolve("public/opengraph-image.png"), svgToPng(generateOgSvg(), 1200, ogFontOpts));
console.log(`✓ public/opengraph-image.png (1200×630)`);

function generateSplashSvg(canvasW: number, canvasH: number): string {
  const iconSize = Math.round(Math.min(canvasW, canvasH) * 0.28);
  const x = Math.round((canvasW - iconSize) / 2);
  const y = Math.round(canvasH * 0.40 - iconSize / 2);
  const iris = irisEmbedSvg(x, y, iconSize, PADDING.standard, IRIS_NAV, "splash");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`,
    `  <rect width="${canvasW}" height="${canvasH}" fill="${SPLASH_BG}"/>`,
    `  ${iris}`,
    `</svg>`,
  ].join("\n");
}

mkdirSync(splashDir, { recursive: true });

for (const device of SPLASH_DEVICES) {
  writeFileSync(resolve("public" + splashUrl(device.label)), svgToPng(generateSplashSvg(device.w, device.h), device.w));
  console.log(`✓ public${splashUrl(device.label)} (${device.w}×${device.h}) — ${device.devices}`);
}

writeFileSync(HASH_PATH, inputHash + "\n");
console.log("\nDone.");
