import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";
import { SITE } from "@/config/site";
import xLensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";

type DatedLens = { id: string; brand: string; isCine?: boolean; createdAt?: string; updatedAt?: string };

const X = xLensesData as DatedLens[];
const G = gfxLensesData as DatedLens[];

const lastChanged = (l: DatedLens) => [l.createdAt, l.updatedAt].filter(Boolean).sort().at(-1);
const latest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1);

const entries = sitemap();
const entry = (path: string) => entries.find((e) => e.url === `${SITE.url}${path}`);

describe("sitemap", () => {
  it("leaves out changefreq and priority, which Google ignores", () => {
    for (const e of entries) {
      expect(e).not.toHaveProperty("changeFrequency");
      expect(e).not.toHaveProperty("priority");
    }
  });

  it("dates a lens page by that lens's own last change", () => {
    const lens = X.find((l) => l.updatedAt && l.updatedAt !== l.createdAt)!;
    expect(entry(`/en/lenses/x/${lens.id}`)?.lastModified).toBe(lastChanged(lens));
    expect(entry(`/zh/lenses/x/${lens.id}`)?.lastModified).toBe(lastChanged(lens));
  });

  it("dates the lens library by the latest change among the mount's lenses", () => {
    expect(entry("/en/lenses/x/browse")?.lastModified).toBe(latest(X.map(lastChanged)));
    expect(entry("/en/lenses/gfx/browse")?.lastModified).toBe(latest(G.map(lastChanged)));
  });

  it("dates a brand page by that brand's photo lenses only", () => {
    const sigma = X.filter((l) => l.brand === "sigma" && !l.isCine);
    expect(entry("/en/lenses/x/brands/sigma")?.lastModified).toBe(latest(sigma.map(lastChanged)));
  });

  it("dates the home and recently-added pages by the newest addition", () => {
    const newest = latest([...X, ...G].map((l) => l.createdAt));
    expect(entry("/en")?.lastModified).toBe(newest);
    expect(entry("/en/recently-added")?.lastModified).toBe(newest);
  });

  it("gives no date to pages whose content doesn't come from the catalog", () => {
    expect(entry("/en/about")).toBeDefined();
    expect(entry("/en/about")?.lastModified).toBeUndefined();
  });
});
