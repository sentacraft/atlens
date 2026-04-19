#!/usr/bin/env tsx
// Generates static icon PNGs and the OG image from the live <Iris> component.
// Uses react-dom/server to render the SVG, then resvg-js to convert to PNG.
// Run automatically before every build via the "build" npm script,
// or manually: npm run gen:icons

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";

import Iris from "../src/components/Iris.tsx";
import { IRIS_NAV, R_HOUSING, type IrisConfig } from "../src/config/iris-config.ts";
import { SPLASH_DEVICES, SPLASH_BG, splashUrl, type SplashScheme } from "../src/config/splash.ts";
import { buildDerivedConfig } from "../src/lib/iris-kinematics.ts";

// ── Font resolution ───────────────────────────────────────────────────────────
//
// Walk up the directory tree to find a package file inside node_modules.
// Matches the same strategy used by the (now-removed) opengraph-image.tsx.

function resolvePackageFile(pkg: string, relPath: string): string {
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, "node_modules", pkg, relPath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot find ${pkg}/${relPath} in any node_modules`);
    dir = parent;
  }
}

const geistBoldPath    = resolvePackageFile("geist", "dist/fonts/geist-sans/Geist-Bold.ttf");
const geistRegularPath = resolvePackageFile("geist", "dist/fonts/geist-sans/Geist-Regular.ttf");

// ── ViewBox computation ───────────────────────────────────────────────────────
//
// The Iris component has a hardcoded viewBox larger than R_HOUSING*2 so the
// blades have room to breathe. We read the actual viewBox from a test render
// instead of computing it from R_HOUSING, then replace it with a padded one
// that gives the desired logo fill ratio on the final canvas.
//
// padding: fraction of the canvas width added as breathing room on each side
// relative to clipR, the visible iris radius.
//   fill_ratio = clipR / padR = 1 - 2 * padding
//
// Industry references:
//   standard  0.175 → 65 % fill — prominent on transparent bg, matches major
//                      app icons (Chrome, WhatsApp, etc.)
//   maskable  0.225 → 55 % fill — comfortably inside Android's safe zone
//                      (inner 80 % circle = 40 % radius from centre)

const dc = buildDerivedConfig(IRIS_NAV, R_HOUSING);
const clipR = R_HOUSING - dc.bladeWidth; // visible iris radius in SVG units

// The tight viewBox written by Iris.tsx: ±(clipR + 2) with a 2-unit pad.
// This must stay in sync with the vbHalf formula in Iris.tsx.
const vbHalf = clipR + 2;
const tightViewBox = `viewBox="${-vbHalf} ${-vbHalf} ${vbHalf * 2} ${vbHalf * 2}"`;

const PADDING = {
  // favicon: maximise fill for small sizes (32px tab icon) where breathing
  // room is imperceptible and the icon must compete with other tab favicons.
  favicon:  0.05,   // → ~90% fill
  // standard: comfortable breathing room for large transparent-bg PWA icons.
  standard: 0.175,  // → ~65% fill
  // maskable: keeps the mark inside Android's safe zone (inner 80% circle).
  maskable: 0.225,  // → ~55% fill
} as const;

function padR(padding: number): number {
  return clipR / (1 - padding * 2);
}

function paddedViewBox(padding: number): string {
  const r = padR(padding);
  return `viewBox="${-r} ${-r} ${r * 2} ${r * 2}"`;
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

function irisToSvg(size: number, padding: number, background?: string): string {
  // Iris renders a wrapper div; extract just the inner <svg> element.
  const html = renderToStaticMarkup(
    createElement(Iris, { config: IRIS_NAV, uid: "gen", size })
  );
  const match = html.match(/<svg[\s\S]*<\/svg>/);
  if (!match) throw new Error("gen-icons: no <svg> found in rendered Iris output");
  let result = match[0]
    .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `)
    .replace(tightViewBox, paddedViewBox(padding));
  // Inject a background rect as the first child of <svg> when needed.
  // Uses absolute viewBox coordinates instead of percentages because resvg
  // does not resolve "100%" correctly when the viewBox has negative origins.
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

// ── OG image helpers ──────────────────────────────────────────────────────────
//
// Embeds the iris as a nested <svg x y> inside a larger canvas SVG, keeping
// full mask/clipPath support (resvg handles these natively — Satori cannot).

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
  if (!match) throw new Error("gen-icons: no <svg> found in Iris render");
  return match[0]
    .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" `)
    .replace(tightViewBox, paddedViewBox(padding));
}

// Iris config with inverted colours for dark-background splash screens.
const IRIS_NAV_DARK: IrisConfig = {
  ...IRIS_NAV,
  bladeColor:  "#e8e8e8",
  strokeColor: "#0a0a0a",
};

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

  // SVG text y = baseline. Block layout mirrors the original flex column:
  //   title (96px, lineHeight 1) + 24px gap + subtitle (26px, lineHeight 1)
  // Ascent ≈ 80 % of font-size for Geist.
  const titleSize    = 96;
  const subtitleSize = 26;
  const blockH    = titleSize + 24 + subtitleSize;
  const blockTop  = Math.round((canvasH - blockH) / 2); // 242
  const titleY    = blockTop + Math.round(titleSize    * 0.80); // ~319
  const subtitleY = blockTop + titleSize + 24 + Math.round(subtitleSize * 0.80); // ~383

  // letter-spacing in SVG is in absolute units (px-equivalent), not em.
  const titleLS    = (-0.02 * titleSize).toFixed(2);    // -1.92
  const subtitleLS = ( 0.12 * subtitleSize).toFixed(2); //  3.12

  const irisSvg = irisEmbedSvg(irisX, irisY, irisSize, PADDING.standard);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">
  <rect width="${canvasW}" height="${canvasH}" fill="#FAFAF9"/>
  ${irisSvg}
  <line x1="${dividerX}" y1="${dividerY1}" x2="${dividerX}" y2="${dividerY2}" stroke="#E5E5E5" stroke-width="1"/>
  <text x="${textX}" y="${titleY}" font-family="Geist" font-weight="700" font-size="${titleSize}" fill="#1A1A1A" letter-spacing="${titleLS}">X-Glass</text>
  <text x="${textX}" y="${subtitleY}" font-family="Geist" font-weight="400" font-size="${subtitleSize}" fill="#8A8A8A" letter-spacing="${subtitleLS}">LENS DATA, NORMALIZED.</text>
</svg>`;
}

// Build a multi-size ICO file by embedding PNG data directly.
// Modern ICO (Vista+) supports PNG payloads, so we don't need to convert
// to BMP DIB format. The caller provides each image's size explicitly,
// avoiding fragile manual parsing of PNG binary headers.
function buildIco(images: Array<{ size: number; png: Buffer }>): Buffer {
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + dirEntrySize * images.length;

  // Header: reserved(2) + type=1(2) + count(2)
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

// ── Output definitions ────────────────────────────────────────────────────────

const appDir  = resolve("src/app");
const iconsDir = resolve("public/icons");
mkdirSync(iconsDir, { recursive: true });

const outputs: Array<{
  path: string;
  size: number;
  padding: number;
  background?: string;
}> = [
  // Next.js file-convention icon (browser tab favicon)
  { path: `${appDir}/icon.png`,        size: 32,  padding: PADDING.favicon   },
  // PWA manifest icons — maskable (Android safe zone)
  { path: `${iconsDir}/icon-maskable-192.png`,  size: 192,  padding: PADDING.maskable },
  { path: `${iconsDir}/icon-maskable-512.png`,  size: 512,  padding: PADDING.maskable },
  // PWA manifest icons — transparent background (purpose: "any").
  // Chrome renders these as-is in the omnibox install chip, the Mac dock, and
  // the Windows taskbar. A transparent canvas lets the host UI chrome (e.g.
  // Chrome's gray pill) show through, matching how native-feeling PWAs look.
  { path: `${iconsDir}/icon-192.png`,   size: 192,  padding: PADDING.standard },
  { path: `${iconsDir}/icon-512.png`,   size: 512,  padding: PADDING.standard },
  { path: `${iconsDir}/icon-1024.png`,  size: 1024, padding: PADDING.standard },
  // Opaque white-background variants — iOS apple-touch-icon only. iOS fills
  // transparent pixels with an uncontrolled color (often black), so the
  // apple-touch-icon must ship a solid background baked into the PNG.
  { path: `${iconsDir}/icon-192-white.png`,   size: 192,  padding: PADDING.standard, background: "white" },
  { path: `${iconsDir}/icon-512-white.png`,   size: 512,  padding: PADDING.standard, background: "white" },
  { path: `${iconsDir}/icon-1024-white.png`,  size: 1024, padding: PADDING.standard, background: "white" },
];

for (const { path, size, padding, background } of outputs) {
  writeFileSync(path, svgToPng(irisToSvg(size, padding, background), size));
  const label = path.replace(resolve(".") + "/", "");
  console.log(`✓ ${label} (${size}×${size})`);
}

// ── Favicon ICO ──────────────────────────────────────────────────────────────
// Generated directly from SVG at each target size (16/32/48) with tight
// padding, so every pixel is rendered at native resolution — no downscaling.

const faviconSizes = [16, 32, 48];
const faviconImages = faviconSizes.map((size) => ({
  size,
  png: svgToPng(irisToSvg(size, PADDING.favicon), size),
}));
writeFileSync(resolve("public/favicon.ico"), buildIco(faviconImages));
console.log(`✓ public/favicon.ico (${faviconSizes.join("+")}px)`);

// ── OG image (social sharing card) ───────────────────────────────────────────
// Replaces the old opengraph-image.tsx (Satori) which couldn't render SVG masks.
// resvg handles masks and clipPaths correctly, producing a sharper iris mark.

const ogFontOpts: ResvgRenderOptions = {
  font: {
    fontFiles: [geistBoldPath, geistRegularPath],
    loadSystemFonts: false,
  },
};
writeFileSync(resolve("public/opengraph-image.png"), svgToPng(generateOgSvg(), 1200, ogFontOpts));
console.log(`✓ public/opengraph-image.png (1200×630)`);

// ── iOS PWA splash screens ────────────────────────────────────────────────────
// One PNG per device × color-scheme combination.  iOS Safari shows the matching
// image during the WebKit startup gap, eliminating the white-screen flash.
//
// Layout: full-screen background + Iris centered horizontally, placed at 40 %
// from the top (slightly above centre — matches the iOS native aesthetic).
// Icon size: 28 % of the shorter dimension so it reads well on all screen sizes.

function generateSplashSvg(canvasW: number, canvasH: number, scheme: SplashScheme): string {
  const bg     = SPLASH_BG[scheme];
  const config = scheme === "dark" ? IRIS_NAV_DARK : IRIS_NAV;
  const iconSize = Math.round(Math.min(canvasW, canvasH) * 0.28);
  const x = Math.round((canvasW - iconSize) / 2);
  const y = Math.round(canvasH * 0.40 - iconSize / 2);
  const iris = irisEmbedSvg(x, y, iconSize, PADDING.standard, config, "splash");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`,
    `  <rect width="${canvasW}" height="${canvasH}" fill="${bg}"/>`,
    `  ${iris}`,
    `</svg>`,
  ].join("\n");
}

const splashDir = resolve("public/splash");
mkdirSync(splashDir, { recursive: true });

for (const device of SPLASH_DEVICES) {
  for (const scheme of ["light", "dark"] as const) {
    const outPath = resolve(splashDir, `splash-${device.label}-${scheme}.png`);
    writeFileSync(outPath, svgToPng(generateSplashSvg(device.w, device.h, scheme), device.w));
    // Use splashUrl to ensure filename convention stays in sync with the config.
    console.log(`✓ public${splashUrl(device.label, scheme)} (${device.w}×${device.h}) — ${device.devices}`);
  }
}

console.log("\nDone.");
