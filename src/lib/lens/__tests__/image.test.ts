import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/lens-images.generated", () => ({
  LENS_IMAGE_HASHES: { "example-x": "0123456789ab", "example-x/001": "abcdef012345" },
}));

import { getLensImageUrl } from "../image";

const fixtures: string[] = [];
const script = resolve("scripts/build-lens-image-manifest.mts");

function manifest(root: string) {
  execFileSync(process.execPath, ["--experimental-strip-types", script], { cwd: root });
  return readFileSync(resolve(root, "src/data/lens-images.generated.ts"), "utf8");
}

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "atlens-image-manifest-"));
  fixtures.push(root);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("getLensImageUrl", () => {
  it("versions the image URL with its content hash", () => {
    expect(getLensImageUrl("example-x")).toBe("/lenses/example-x.webp?v=0123456789ab");
  });

  it("versions supplemental images with their own content hash", () => {
    expect(getLensImageUrl("example-x", "001")).toBe("/lenses/example-x/001.webp?v=abcdef012345");
    expect(getLensImageUrl("example-x", "002")).toBe("/lenses/example-x/002.webp");
  });

  it("does not append an undefined version for missing images", () => {
    expect(getLensImageUrl("missing-x")).toBe("/lenses/missing-x.webp");
  });
});

describe("image manifest generation", () => {
  it("changes only the replaced image's hash and keeps unchanged builds stable", () => {
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

  it("hashes supplemental images independently of the primary image", () => {
    const root = fixture();
    const images = resolve(root, "public/lenses");
    mkdirSync(resolve(images, "one-x"), { recursive: true });
    writeFileSync(resolve(images, "one-x.webp"), "primary image");
    writeFileSync(resolve(images, "one-x/001.webp"), "supplemental image");
    const hash = (content: string) => createHash("sha256").update(content).digest("hex").slice(0, 12);
    const before = manifest(root);
    expect(before).toContain(`"one-x": "${hash("primary image")}"`);
    expect(before).toContain(`"one-x/001": "${hash("supplemental image")}"`);
    expect(manifest(root)).toBe(before);
    writeFileSync(resolve(images, "one-x/001.webp"), "replacement image");
    const after = manifest(root);
    expect(after).toContain(`"one-x/001": "${hash("replacement image")}"`);
    expect(after).not.toContain(hash("supplemental image"));
    expect(after).toContain(`"one-x": "${hash("primary image")}"`);
  });

  it("writes an empty hash map when no image directory exists", () => {
    expect(manifest(fixture())).toContain("export const LENS_IMAGE_HASHES: Readonly<Record<string, string>> = {};");
  });
});
