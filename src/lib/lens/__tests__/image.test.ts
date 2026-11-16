import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/lens-images.generated", () => ({
  LENS_IMAGE_HASHES: { "example-x": "0123456789ab" },
  LENS_SUPPLEMENTAL_IMAGES: { "example-x/001": `https://images.example.com/supplemental/example-x/001.${"a".repeat(64)}.webp` },
}));

import { getLensGalleryImageIds, getLensImageUrl } from "../image";

const fixtures: string[] = [];
const script = resolve("scripts/build-lens-image-manifest.mts");
const sha = "a".repeat(64);

function manifest(root: string, branch = "main") {
  execFileSync(process.execPath, ["--experimental-strip-types", script], {
    cwd: root,
    env: { ...process.env, WORKERS_CI_BRANCH: branch },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return readFileSync(resolve(root, "src/data/lens-images.generated.ts"), "utf8");
}

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "atlens-image-manifest-"));
  fixtures.push(root);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  writeFileSync(resolve(root, "wrangler.toml"), '[vars]\nSUPPLEMENTAL_IMAGES_URL = "https://images.example.com"\n[previews.vars]\nSUPPLEMENTAL_IMAGES_URL = "https://images-preview.example.com"\n');
  writeFileSync(resolve(root, "src/data/lens-supplemental-images.json"), JSON.stringify({ version: 1, images: {} }));
  return root;
}

function supplemental(root: string, entries: Record<string, unknown> = { "one-x/001": { key: `supplemental/one-x/001.${sha}.webp`, sha256: sha } }) {
  writeFileSync(resolve(root, "src/data/lens-supplemental-images.json"), JSON.stringify({ version: 1, images: entries }));
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("getLensImageUrl", () => {
  it("keeps primary images local and content-versioned", () => {
    expect(getLensImageUrl("example-x")).toBe("/lenses/example-x.webp?v=0123456789ab");
  });

  it("resolves supplemental images exclusively from the remote resource map", () => {
    expect(getLensImageUrl("example-x", "001")).toBe(`https://images.example.com/supplemental/example-x/001.${sha}.webp`);
  });

  it("rejects missing supplemental assets instead of falling back to public Git files", () => {
    expect(() => getLensImageUrl("example-x", "002")).toThrow(/supplemental/i);
  });

  it("does not append an undefined version for missing primary images", () => {
    expect(getLensImageUrl("missing-x")).toBe("/lenses/missing-x.webp");
  });
});

describe("gallery image selection", () => {
  it("uses only classified product images in the product gallery", () => {
    expect(getLensGalleryImageIds({ images: [{ id: "001", role: "mtf" }, { id: "002", role: "product" }, { id: "003", role: "optical-construction" }] })).toEqual(["002"]);
  });

  it("preserves the actual legacy image consumers until their records are classified", () => {
    expect(getLensGalleryImageIds({ alternateImages: ["003", "1000"] })).toEqual(["003", "1000"]);
    expect(getLensGalleryImageIds({})).toEqual([]);
  });
});

describe("image manifest generation", () => {
  it("changes only the replaced primary image's hash and keeps unchanged builds stable", () => {
    const root = fixture();
    const images = resolve(root, "public/lenses");
    mkdirSync(images, { recursive: true });
    writeFileSync(resolve(images, "one-x.webp"), "original image");
    writeFileSync(resolve(images, "two-x.webp"), "unchanged image");
    const before = manifest(root);
    expect(manifest(root)).toBe(before);
    const hash = (content: string) => createHash("sha256").update(content).digest("hex").slice(0, 12);
    expect(before).toContain(`"one-x": "${hash("original image")}"`);
    expect(before).toContain(`"two-x": "${hash("unchanged image")}"`);
    writeFileSync(resolve(images, "one-x.webp"), "replacement image");
    const after = manifest(root);
    expect(after).toContain(`"one-x": "${hash("replacement image")}"`);
    expect(after).not.toContain(hash("original image"));
    expect(after).toContain(`"two-x": "${hash("unchanged image")}"`);
  });

  it("builds immutable remote URLs without copying supplemental pixels", () => {
    const root = fixture();
    supplemental(root);
    expect(manifest(root)).toContain(`https://images.example.com/supplemental/one-x/001.${sha}.webp`);
    expect(manifest(root, "publish/test")).toContain(`https://images-preview.example.com/supplemental/one-x/001.${sha}.webp`);
  });

  it("rejects supplemental directories left in public Git output", () => {
    const root = fixture();
    mkdirSync(resolve(root, "public/lenses/one-x"), { recursive: true });
    writeFileSync(resolve(root, "public/lenses/one-x/001.webp"), "supplemental image");
    expect(() => manifest(root)).toThrow();
  });

  it.each([
    { key: `supplemental/one-x/001.${sha}.webp`, sha256: sha, sourceUrl: "https://private.example.com" },
    { key: "../private.webp", sha256: sha },
    { key: `supplemental/one-x/001.${"b".repeat(64)}.webp`, sha256: sha },
  ])("rejects private fields and inconsistent resource identities: %j", entry => {
    const root = fixture();
    supplemental(root, { "one-x/001": entry });
    expect(() => manifest(root)).toThrow();
  });

  it("fails a build if the pinned catalog references a missing supplemental resource", () => {
    const root = fixture();
    writeFileSync(resolve(root, "src/data/lenses.json"), JSON.stringify([{ id: "one-x", images: [{ id: "001", role: "mtf" }] }]));
    expect(() => manifest(root)).toThrow();
  });

  it("writes empty maps when the catalog has no images", () => {
    expect(manifest(fixture())).toContain("export const LENS_IMAGE_HASHES: Readonly<Record<string, string>> = {};");
  });
});
