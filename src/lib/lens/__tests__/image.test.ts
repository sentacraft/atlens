import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/lens-images.generated", () => ({ LENS_IMAGE_HASHES: { "example-x": "0123456789ab" } }));
vi.mock("@/data/public-assets.generated", () => ({
  PUBLIC_ASSET_URLS: { "lens-images/example-x/001": `https://images.example.com/lens-images/example-x/001.${"a".repeat(64)}.webp` },
}));
import { getLensGalleryImageIds, getLensImageUrl } from "../image";

const roots: string[] = [];
const script = resolve("scripts/build-lens-image-manifest.mts");
const sha = "a".repeat(64);
function fixture(assets: Record<string, unknown> = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "lens-image-manifest-"));
  roots.push(root);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  writeFileSync(resolve(root, "src/data/public-assets.json"), JSON.stringify({ version: 1, assets }));
  return root;
}
function manifest(root: string) {
  execFileSync(process.execPath, ["--experimental-strip-types", script], { cwd: root, stdio: "pipe" });
  return readFileSync(resolve(root, "src/data/lens-images.generated.ts"), "utf8");
}
afterEach(() => { for (const root of roots.splice(0)) { rmSync(root, { recursive: true, force: true }); } });

describe("getLensImageUrl", () => {
  it("keeps primary images local and content-versioned", () => {
    expect(getLensImageUrl("example-x")).toBe("/lenses/example-x.webp?v=0123456789ab");
  });
  it("resolves classified images through the public asset registry", () => {
    expect(getLensImageUrl("example-x", "001")).toBe(`https://images.example.com/lens-images/example-x/001.${sha}.webp`);
  });
  it("rejects missing resources rather than falling back to Git", () => {
    expect(() => getLensImageUrl("example-x", "002")).toThrow(/Missing public asset/);
  });
  it("does not append an undefined version for missing primary images", () => {
    expect(getLensImageUrl("missing-x")).toBe("/lenses/missing-x.webp");
  });
});
describe("gallery image selection", () => {
  it("uses only classified product images", () => {
    expect(getLensGalleryImageIds({ images: [{ id: "001", role: "mtf" }, { id: "002", role: "product" }, { id: "003", role: "optical-construction" }] })).toEqual(["002"]);
    expect(getLensGalleryImageIds({})).toEqual([]);
  });
});
describe("lens image manifest generation", () => {
  it("changes only the replaced primary hash and keeps unchanged builds stable", () => {
    const root = fixture();
    const images = resolve(root, "public/lenses");
    mkdirSync(images, { recursive: true });
    writeFileSync(resolve(images, "one-x.webp"), "original");
    writeFileSync(resolve(images, "two-x.webp"), "unchanged");
    const before = manifest(root);
    expect(manifest(root)).toBe(before);
    writeFileSync(resolve(images, "one-x.webp"), "replacement");
    const after = manifest(root);
    const hash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12);
    expect(after).toContain(`"one-x": "${hash("replacement")}"`);
    expect(after).not.toContain(hash("original"));
    expect(after).toContain(`"two-x": "${hash("unchanged")}"`);
  });
  it("rejects non-primary image directories in public Git", () => {
    const root = fixture();
    mkdirSync(resolve(root, "public/lenses/one-x"), { recursive: true });
    expect(() => manifest(root)).toThrow();
  });
  it("validates only its own namespace without rejecting other public resources", () => {
    const root = fixture({
      "lens-images/one-x/001": { key: `lens-images/one-x/001.${sha}.webp`, sha256: sha },
      "manuals/one/en": { key: `manuals/one.${sha}.pdf`, sha256: sha },
    });
    writeFileSync(resolve(root, "src/data/lenses.json"), JSON.stringify([{ id: "one-x", images: [{ id: "001", role: "mtf" }] }]));
    expect(() => manifest(root)).not.toThrow();
  });
  it("rejects missing and orphaned lens image resources", () => {
    const root = fixture();
    writeFileSync(resolve(root, "src/data/lenses.json"), JSON.stringify([{ id: "one-x", images: [{ id: "001", role: "mtf" }] }]));
    expect(() => manifest(root)).toThrow(/pinned lens catalog/);
    writeFileSync(resolve(root, "src/data/lenses.json"), "[]");
    writeFileSync(resolve(root, "src/data/public-assets.json"), JSON.stringify({ version: 1, assets: { "lens-images/one-x/001": { key: `lens-images/one-x/001.${sha}.webp`, sha256: sha } } }));
    expect(() => manifest(root)).toThrow(/pinned lens catalog/);
  });
  it.each([{ alternateImages: [] }, { alternateImages: ["001"] }])("rejects removed image fields: %j", fields => {
    const root = fixture();
    writeFileSync(resolve(root, "src/data/lenses.json"), JSON.stringify([{ id: "one-x", ...fields }]));
    expect(() => manifest(root)).toThrow(/Unsupported image field/);
  });
  it("writes an empty primary map when no primary files exist", () => {
    expect(manifest(fixture())).toContain("export const LENS_IMAGE_HASHES: Readonly<Record<string, string>> = {};");
  });
});
