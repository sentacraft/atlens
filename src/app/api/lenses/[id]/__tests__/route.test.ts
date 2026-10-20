import { describe, expect, it } from "vitest";
import { GET } from "../route";

const call = (id: string, query = "") =>
  GET(new Request(`http://localhost/api/lenses/${id}${query}`), { params: Promise.resolve({ id }) });

describe("GET /api/lenses/[id]", () => {
  it("returns the lens's record", async () => {
    const response = await call("7artisans-4mm-f28-x", "?locale=zh");
    const body = (await response.json()) as { lens: { id: string; model: string } };

    expect(response.status).toBe(200);
    expect(body.lens).toMatchObject({ id: "7artisans-4mm-f28-x", model: "MF 4mm F2.8" });
    expect(response.headers.get("Cache-Control")).toContain("max-age");
  });

  it("falls back to the default locale for one it does not know", async () => {
    expect((await call("7artisans-4mm-f28-x", "?locale=xx")).status).toBe(200);
  });

  it("is a 404 for an unknown lens", async () => {
    expect((await call("no-such-lens")).status).toBe(404);
  });
});
