import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllLenses } from "@/lib/lens/data";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  loadLensReviews: vi.fn(),
  limit: vi.fn(),
  hasAccountSession: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.getCloudflareContext }));
vi.mock("@/lib/lens/reviews-repository", () => ({ loadLensReviews: mocks.loadLensReviews }));
vi.mock("@/lib/auth-session", () => ({ hasAccountSession: mocks.hasAccountSession }));

const { GET } = await import("../route");

const lensId = getAllLenses("en")[0].id;
const call = (id: string, locale = "zh") =>
  GET(new Request(`http://localhost/api/lenses/${id}/reviews?locale=${locale}`, { headers: { "cf-connecting-ip": "10.0.0.1" } }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ success: true });
  mocks.getCloudflareContext.mockReturnValue({ env: { CATALOG_DB: {}, RL_LENS_REVIEWS: { limit: mocks.limit } } });
  mocks.loadLensReviews.mockResolvedValue(new Map());
  mocks.hasAccountSession.mockResolvedValue(true);
});

describe("GET /api/lenses/[id]/reviews", () => {
  it("returns the lens's findings in the requested language only", async () => {
    mocks.loadLensReviews.mockResolvedValue(
      new Map([
        [
          lensId,
          {
            sources: [{ id: "a", url: "https://example.com/a", site: "A", lang: "en", kind: "measured", publisher: "A" }],
            claims: [{ aspect: "bokeh", polarity: "positive", agreement: "single_source", text: "Smooth.", textZh: "柔和。", sources: ["a"], reviewCount: 1, outletCount: 1 }],
          },
        ],
      ]),
    );
    const response = await call(lensId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { claims: { text: string }[]; sources: object[] };
    expect(body.claims[0].text).toBe("柔和。");
    expect(JSON.stringify(body)).not.toContain("Smooth.");
    expect(body.sources[0]).not.toHaveProperty("publisher");
  });

  it("gives a guest only the overall verdict, and an account all of the findings", async () => {
    const claim = (aspect: string, polarity: string, sources: string[]) => ({
      aspect, polarity, agreement: "single_source", text: aspect, textZh: aspect, sources, reviewCount: sources.length, outletCount: sources.length,
      details: [{ id: sources[0], text: "Detail.", textZh: "细节。" }],
    });
    mocks.loadLensReviews.mockResolvedValue(
      new Map([
        [
          lensId,
          {
            sources: ["a", "b"].map((id) => ({ id, url: `https://example.com/${id}`, site: id, lang: "en", kind: "measured", publisher: id })),
            claims: [claim("overall", "positive", ["a"]), claim("bokeh", "positive", ["a"]), claim("vignetting", "mixed", ["b"])],
          },
        ],
      ]),
    );

    mocks.hasAccountSession.mockResolvedValue(false);
    const guest = await call(lensId);
    expect(guest.headers.get("Cache-Control")).toContain("private");
    const preview = (await guest.json()) as { claims: { aspect: string; details: object[] }[]; sources: { id: string }[]; locked: object };
    expect(preview.claims.map((c) => c.aspect)).toEqual(["overall"]);
    expect(preview.claims[0].details).toEqual([]);
    expect(preview.sources.map((s) => s.id)).toEqual(["a"]);
    expect(preview.locked).toEqual({ sourceCount: 2, groups: [{ group: "image", count: 2, aspects: ["bokeh", "vignetting"] }] });

    mocks.hasAccountSession.mockResolvedValue(true);
    const full = (await (await call(lensId)).json()) as { claims: object[]; locked?: object };
    expect(full.claims).toHaveLength(3);
    expect(full.locked).toBeUndefined();
  });

  it("returns an empty set for a lens without findings", async () => {
    expect(await (await call(lensId)).json()).toEqual({ sources: [], claims: [] });
  });

  it("refuses an unknown lens or locale before reading the store", async () => {
    expect((await call("no-such-lens")).status).toBe(404);
    expect((await call(lensId, "fr")).status).toBe(400);
    expect(mocks.loadLensReviews).not.toHaveBeenCalled();
  });

  it("answers 429 past the per-IP rate", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    expect((await call(lensId)).status).toBe(429);
    expect(mocks.loadLensReviews).not.toHaveBeenCalled();
  });
});
