#!/usr/bin/env tsx
// Regression test for all generated icons.
// Verifies that every PNG produced by scripts/gen-icons.tsx matches the
// contract expected by its downstream consumer — the PWA manifest, the iOS
// apple-touch-* conventions, and the Next.js file-convention favicon.
//
// This prevents the "fix one, break another" seesaw by pinning each icon's
// background and dimensions as a testable invariant. Runs as part of `build`.
//
// Manual: `npm run verify:icons`

import { readFileSync, existsSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";

import { SPLASH_DEVICES, SPLASH_BG, splashUrl, type SplashScheme } from "../src/config/splash.ts";

// ── Minimal PNG decoder (8-bit RGBA only — matches resvg output) ────────────

interface Png {
  width: number;
  height: number;
  data: Buffer;
}

function decodePng(path: string): Png {
  const buf = readFileSync(path);
  if (!buf.slice(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw new Error("not a PNG");
  }
  let i = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.slice(i + 4, i + 8).toString("ascii");
    const body = buf.slice(i + 8, i + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body.readUInt8(8);
      colorType = body.readUInt8(9);
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") break;
    i += 8 + len + 4;
  }
  if (colorType !== 6 || bitDepth !== 8) {
    throw new Error(`unsupported PNG format (colorType=${colorType} bitDepth=${bitDepth})`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp + 1;
  const out = Buffer.alloc(width * height * bpp);
  let prev = Buffer.alloc(width * bpp);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const row = Buffer.from(raw.slice(y * stride + 1, y * stride + stride));
    for (let x = 0; x < row.length; x++) {
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x];
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      let recon: number;
      switch (filter) {
        case 0: recon = 0; break;
        case 1: recon = left; break;
        case 2: recon = up; break;
        case 3: recon = (left + up) >> 1; break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          recon = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          break;
        }
        default: throw new Error(`unknown PNG filter ${filter}`);
      }
      row[x] = (row[x] + recon) & 0xff;
    }
    row.copy(out, y * width * bpp);
    prev = row;
  }
  return { width, height, data: out };
}

type Rgba = [number, number, number, number];

function pixel(img: Png, x: number, y: number): Rgba {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

function hexToRgba(hex: string): Rgba {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

function rgbaEq(a: Rgba, b: Rgba): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// ── Contract definitions ────────────────────────────────────────────────────
//
// Each icon declares its background contract — what the four corners of the
// PNG must contain. "mark" means the image must have a non-trivial amount of
// opaque pixels (sanity check against a fully-blank render).

type BgContract = "transparent" | "opaque-white" | Rgba;

interface Expectation {
  path: string;
  width: number;
  height: number;
  bg: BgContract;
  mark: boolean;
}

function expectedCorner(bg: BgContract): Rgba {
  if (bg === "transparent") return [0, 0, 0, 0];
  if (bg === "opaque-white") return [255, 255, 255, 255];
  return bg;
}

const ICON_EXPECTATIONS: Expectation[] = [
  // PWA manifest purpose="any" — transparent, so Chrome's omnibox install
  // chip, the macOS Dock, and Windows taskbar render the bare mark without
  // a white square around it.
  { path: "public/icons/icon-192.png",  width: 192,  height: 192,  bg: "transparent", mark: true },
  { path: "public/icons/icon-512.png",  width: 512,  height: 512,  bg: "transparent", mark: true },
  { path: "public/icons/icon-1024.png", width: 1024, height: 1024, bg: "transparent", mark: true },

  // iOS apple-touch-icon — must be opaque. iOS fills transparent pixels with
  // an uncontrolled color on the home screen, so we ship a baked white
  // background specifically for this surface.
  { path: "public/icons/icon-192-white.png",  width: 192,  height: 192,  bg: "opaque-white", mark: true },
  { path: "public/icons/icon-512-white.png",  width: 512,  height: 512,  bg: "opaque-white", mark: true },
  { path: "public/icons/icon-1024-white.png", width: 1024, height: 1024, bg: "opaque-white", mark: true },

  // Android maskable — transparent canvas, Android supplies its own adaptive
  // background. Mark lives inside the 80% safe zone (enforced by the padding
  // constant in gen-icons.tsx, validated here by the mark presence).
  { path: "public/icons/icon-maskable-192.png", width: 192, height: 192, bg: "transparent", mark: true },
  { path: "public/icons/icon-maskable-512.png", width: 512, height: 512, bg: "transparent", mark: true },

  // Next.js file-convention browser favicon (src/app/icon.png).
  { path: "src/app/icon.png", width: 32, height: 32, bg: "transparent", mark: true },
];

const SPLASH_EXPECTATIONS: Expectation[] = SPLASH_DEVICES.flatMap((device) =>
  (["light", "dark"] as const).map<Expectation>((scheme: SplashScheme) => ({
    path: "public" + splashUrl(device.label, scheme),
    width: device.w,
    height: device.h,
    bg: hexToRgba(SPLASH_BG[scheme]),
    mark: true,
  }))
);

// Non-PNG artifacts — existence + size sanity only.
const EXISTENCE_ONLY: Array<{ path: string; minBytes: number }> = [
  { path: "public/favicon.ico", minBytes: 500 },
  { path: "public/opengraph-image.png", minBytes: 2000 },
];

// ── Run checks ──────────────────────────────────────────────────────────────

const errors: string[] = [];

function fail(file: string, msg: string): void {
  errors.push(`  ✗ ${file}: ${msg}`);
}

function hasMark(img: Png): boolean {
  // "Mark present" = at least 1% of pixels have non-zero alpha. Blank
  // renders (e.g. SVG rendered against a viewBox mismatch) would fail this.
  let opaque = 0;
  const total = img.width * img.height;
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] > 0) opaque++;
  }
  return opaque / total > 0.01;
}

function checkCorner(img: Png, expected: Rgba, path: string): void {
  const corners: Array<[number, number]> = [
    [0, 0],
    [img.width - 1, 0],
    [0, img.height - 1],
    [img.width - 1, img.height - 1],
  ];
  for (const [x, y] of corners) {
    const got = pixel(img, x, y);
    if (!rgbaEq(got, expected)) {
      fail(path, `corner (${x},${y}) expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
      return; // one corner failure is enough — don't spam
    }
  }
}

function checkExpectation(exp: Expectation): void {
  const abs = resolve(exp.path);
  if (!existsSync(abs)) {
    fail(exp.path, `missing — run \`npm run gen:icons\``);
    return;
  }
  let img: Png;
  try {
    img = decodePng(abs);
  } catch (e) {
    fail(exp.path, `PNG decode failed: ${(e as Error).message}`);
    return;
  }
  if (img.width !== exp.width || img.height !== exp.height) {
    fail(exp.path, `expected ${exp.width}×${exp.height}, got ${img.width}×${img.height}`);
  }
  checkCorner(img, expectedCorner(exp.bg), exp.path);
  if (exp.mark && !hasMark(img)) {
    fail(exp.path, `no visible mark — image appears blank`);
  }
}

for (const exp of [...ICON_EXPECTATIONS, ...SPLASH_EXPECTATIONS]) {
  checkExpectation(exp);
}

for (const { path, minBytes } of EXISTENCE_ONLY) {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    fail(path, `missing — run \`npm run gen:icons\``);
    continue;
  }
  const size = statSync(abs).size;
  if (size < minBytes) {
    fail(path, `suspiciously small (${size}B < ${minBytes}B minimum)`);
  }
}

const totalChecked = ICON_EXPECTATIONS.length + SPLASH_EXPECTATIONS.length + EXISTENCE_ONLY.length;

if (errors.length > 0) {
  console.error(`\n✗ Icon verification failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n`);
  for (const line of errors) console.error(line);
  console.error("");
  process.exit(1);
}

console.log(`✓ Icon verification passed (${totalChecked} artifacts).`);
