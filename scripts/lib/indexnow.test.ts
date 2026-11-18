import { describe, expect, it } from "vitest";
import { changedPages, deployedRange, submissionUrls, type SiteSnapshot } from "./indexnow";

describe("production deployment range", () => {
  const revisions = ["newer", "event", "failed", "previous"];
  const deployed = async (revision: string) => revision !== "failed";

  it("compares the event's deployment to the previous success, not the parent or current main", async () => {
    await expect(deployedRange(revisions, deployed, "event")).resolves.toEqual({ before: "previous", after: "event" });
    await expect(deployedRange(revisions, deployed)).resolves.toEqual({ before: "event", after: "newer" });
  });

  it("fails without a verified baseline instead of submitting the full site", async () => {
    await expect(deployedRange(["event", "failed"], deployed, "event")).rejects.toThrow(/two successful/);
    await expect(deployedRange(revisions, deployed, "failed")).rejects.toThrow(/not confirmed/);
    await expect(deployedRange(revisions, deployed, "unknown")).rejects.toThrow(/not in recent main/);
  });
});

const lens = { id: "first", brand: "fujifilm", weight: 200 };
const snapshot = (overrides: Partial<SiteSnapshot> = {}): SiteSnapshot => ({
  lenses: { X: [lens, { id: "stable", brand: "other" }], G: [{ id: "gfx", brand: "fujifilm" }] },
  brands: {},
  collections: [],
  messages: {},
  ...overrides,
});

const base = "https://atlens.app";
const lensPath = (id: string, locale = "en") => `/${locale}/lenses/x/${id}`;

// Use the production routes in expectations, not the functions that build the result.
describe("IndexNow deployment delta", () => {
  it("skips an unchanged catalog, regardless of object key order", () => {
    const before = snapshot();
    const after = snapshot({ lenses: { ...before.lenses, X: [{ weight: 200, brand: "fujifilm", id: "first" }, before.lenses.X[1]] } });
    expect(changedPages(before, after)).toEqual({ live: [], removed: [] });
  });

  it("keeps added, changed, and removed lenses, not other detail pages", () => {
    const before = snapshot({ lenses: { X: [lens, { id: "old", brand: "fujifilm" }, { id: "stable", brand: "other" }], G: [] } });
    const after = snapshot({ lenses: { X: [{ ...lens, weight: 210 }, { id: "new", brand: "fujifilm" }, before.lenses.X[2]], G: [] } });
    const { live, removed } = changedPages(before, after);
    expect(live).toEqual(expect.arrayContaining([lensPath("first"), lensPath("first", "zh"), lensPath("new"), lensPath("browse")]));
    expect(live).not.toContain(lensPath("stable"));
    expect(removed).toEqual([lensPath("old"), lensPath("old", "zh")]);
  });

  it("skips UI-only copy, but updates changed search metadata in its locale", () => {
    const before = snapshot({ messages: { en: { LensDetail: { galleryClose: "Close" }, LensList: { metaDescX: "Old" } } } });
    const after = snapshot({ messages: { en: { LensDetail: { galleryClose: "Done" }, LensList: { metaDescX: "New" } } } });
    expect(changedPages(before, after)).toEqual({ live: [lensPath("browse")], removed: [] });
  });

  it("marks only the affected brand and collection pages", () => {
    const before = snapshot({ brands: { stable: {}, modified: { description: "old" } }, collections: [{ slug: "old" }] });
    const after = snapshot({ brands: { stable: {}, modified: { description: "new" } }, collections: [{ slug: "new" }] });
    expect(changedPages(before, after)).toEqual({
      live: ["en", "zh"].flatMap((locale) => ["brands/modified", "collections", "collections/new"].map((path) => `/${locale}/lenses/x/${path}`)),
      removed: ["/en/lenses/x/collections/old", "/zh/lenses/x/collections/old"],
    });
  });

  it("filters against the production sitemap without suppressing removed pages", () => {
    const kept = lensPath("first");
    const restored = lensPath("old");
    const removed = lensPath("removed");
    const sitemap = `<urlset><url><loc>${base}${kept}</loc></url><url><loc>${base}${restored}</loc></url></urlset>`;
    expect(submissionUrls(base, sitemap, { live: [kept, kept, lensPath("new")], removed: [restored, removed] })).toEqual([
      `${base}${kept}`, `${base}${removed}`,
    ]);
    expect(() => submissionUrls(base, "<urlset/>", { live: [], removed: [removed] })).toThrow(/no URLs/);
  });
});
