import { describe, expect, it, vi } from "vitest";
import type { LensImageAsset } from "@/lib/types";
import { lensDetailImages } from "../lens-detail-images";

vi.mock("@/lib/lens/image", () => ({
  getLensImageUrl: (lensId: string, imageId?: string) => `https://img.test/${lensId}/${imageId ?? "primary"}`,
  hasPrimaryLensImage: () => false,
}));

const asset = (id: string, role: LensImageAsset["role"], extra: Partial<LensImageAsset> = {}): LensImageAsset => ({ id, role, ...extra });
const lens = (images: LensImageAsset[]) => ({ id: "fake-lens-x", mount: "X" as const, images });
const pad = (n: number) => String(n).padStart(3, "0");
const many = (count: number, role: LensImageAsset["role"], start = 1) => Array.from({ length: count }, (_, i) => asset(pad(start + i), role));

describe("lensDetailImages selection", () => {
  it("displays every eligible image of a requested role", () => {
    const out = lensDetailImages(lens([...many(6, "mtf"), ...many(7, "product", 10), asset("030", "optical-construction")]), "r", "Lens", [
      { role: "mtf" }, { role: "product" }, { role: "optical-construction" },
    ]);
    expect(out.displayImages.filter(({ image }) => image.role === "mtf")).toHaveLength(6);
    expect(out.displayImages.filter(({ image }) => image.role === "product")).toHaveLength(7);
    expect(out.displayImages).toHaveLength(14);
    expect(out.results.map(({ status }) => status)).toEqual(["selected", "selected", "selected"]);
  });

  it("displays every conditions-unconfirmed fallback image", () => {
    const out = lensDetailImages(lens(many(4, "mtf")), "r", "Lens", [{ role: "mtf", apertureFNumber: 2.8 }]);
    expect(out.displayImages).toHaveLength(4);
    expect(out.results[0]).toMatchObject({ status: "conditions-unconfirmed" });
  });

  it("stops at 24 images per call and lists the rest, with refs, as not shown", () => {
    const out = lensDetailImages(lens(many(30, "mtf")), "r", "Lens", [{ role: "mtf" }], 24);
    expect(out.displayImages).toHaveLength(24);
    expect(out.results[0]).toMatchObject({ status: "selected", selected: out.displayImages.map(({ imageRef }) => imageRef) });
    expect((out.results[0] as { notShown?: string[] }).notShown).toEqual(many(6, "mtf", 25).map(({ id }) => `r:image-${id}`));
  });

  it("reports a role whose images were all cut by the cap as limit, not unavailable", () => {
    const out = lensDetailImages(lens(many(3, "mtf")), "r", "Lens", [{ role: "mtf" }], 0);
    expect(out.displayImages).toEqual([]);
    expect(out.results[0]).toMatchObject({ status: "limit" });
    expect((out.results[0] as { notShown?: string[] }).notShown).toHaveLength(3);
  });

  it("counts roles the tool cannot serve, derived from the roles it serves", () => {
    const out = lensDetailImages(lens([asset("001", "mtf"), ...many(2, "accessory", 2), asset("004", "spec-sheet")]), "r", "Lens", [{ role: "mtf" }]);
    expect(out.unservedImages).toEqual([{ role: "spec-sheet", count: 1 }, { role: "accessory", count: 2 }]);
    expect(lensDetailImages(lens([asset("001", "mtf")]), "r", "Lens", [{ role: "mtf" }]).unservedImages).toEqual([]);
  });
});
