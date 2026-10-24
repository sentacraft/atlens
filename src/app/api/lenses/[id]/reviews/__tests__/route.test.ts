import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllLenses } from "@/lib/lens/data";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  loadLensReviews: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.getCloudflareContext }));
vi.mock("@/lib/lens/reviews-repository", () => ({ loadLensReviews: mocks.loadLensReviews }));

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
