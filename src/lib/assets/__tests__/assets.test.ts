import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/public-assets.generated", () => ({
  PUBLIC_ASSET_URLS: { "manuals/example/en": "https://assets.example.com/manuals/example.hash.pdf" },
}));
import { getPublicAssetUrl } from "../url";

const roots: string[] = [];
const sha = "a".repeat(64);
const script = resolve("scripts/build-public-assets.mts");
function fixture(assets: Record<string, unknown> = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "public-assets-"));
  roots.push(root);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  writeFileSync(resolve(root, "src/data/public-assets.json"), JSON.stringify({ version: 1, assets }));
  writeFileSync(resolve(root, "wrangler.toml"), '[vars]\nPUBLIC_ASSETS_URL = "https://assets.example.com"\n[previews.vars]\nPUBLIC_ASSETS_URL = "https://assets-preview.example.com"\n');
  return root;
}
function build(root: string, branch = "main", origin?: string) {
  const env: Record<string, string | undefined> = { ...process.env, WORKERS_CI_BRANCH: branch };
  delete env.PUBLIC_ASSETS_URL;
  if (origin !== undefined) {env.PUBLIC_ASSETS_URL = origin;}
  execFileSync(process.execPath, ["--experimental-strip-types", script], { cwd: root, env: env as NodeJS.ProcessEnv, stdio: "pipe" });
  return readFileSync(resolve(root, "src/data/public-assets.generated.ts"), "utf8");
}
afterEach(() => { for (const root of roots.splice(0)) {rmSync(root, { recursive: true, force: true });} });

describe("public asset URLs", () => {
  it("resolves non-image assets through the same entry point", () => {
    expect(getPublicAssetUrl("manuals/example/en")).toBe("https://assets.example.com/manuals/example.hash.pdf");
    expect(() => getPublicAssetUrl("manuals/missing/en")).toThrow(/Missing public asset/);
  });
  it("generates image, PDF and font URLs without coupling IDs to storage keys", () => {
    const root = fixture({
      "lens-images/example-x/001": { key: `supplemental/example-x/001.${sha}.webp`, sha256: sha },
      "manuals/example/en": { key: `documents/example-en.${sha}.pdf`, sha256: sha },
      "brand-assets/example/font": { key: `fonts/example.${sha}.woff2`, sha256: sha },
    });
    const result = build(root);
    expect(result).toContain(`https://assets.example.com/documents/example-en.${sha}.pdf`);
    expect(result).toContain(`https://assets.example.com/supplemental/example-x/001.${sha}.webp`);
    expect(result).toContain(`https://assets.example.com/fonts/example.${sha}.woff2`);
    expect(build(root, "publish/test")).toContain("https://assets-preview.example.com/");
  });
  it.each(["../manuals/en", "manuals/../en", "/manuals/en", "https://example.com/en", "manuals//en"])("rejects unsafe resource ID %s", id => {
    expect(() => build(fixture({ [id]: { key: `docs/en.${sha}.pdf`, sha256: sha } }))).toThrow();
  });
  it.each([
    { key: `../en.${sha}.pdf`, sha256: sha },
    { key: `docs/en.${"b".repeat(64)}.pdf`, sha256: sha },
    { key: `docs/en.${sha}.pdf?token=x`, sha256: sha },
    { key: `docs/en.${sha}.pdf`, sha256: sha, sourceUrl: "https://private.example.com" },
  ])("rejects private fields, unsafe keys and inconsistent hashes: %j", entry => {
    expect(() => build(fixture({ "manuals/example/en": entry }))).toThrow();
  });
  it.each(["http://assets.example.com", "https://assets.example.com/path", "https://user:password@assets.example.com"])("rejects invalid origin %s", origin => {
    expect(() => build(fixture(), "main", origin)).toThrow();
  });
  it("rejects the removed image-only manifest shape", () => {
    const root = fixture();
    writeFileSync(resolve(root, "src/data/public-assets.json"), JSON.stringify({ version: 1, images: {} }));
    expect(() => build(root)).toThrow();
  });
});
