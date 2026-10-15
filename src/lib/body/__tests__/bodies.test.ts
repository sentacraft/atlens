import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bodiesData from "@/data/bodies.json";
import { bodies, getBodyById, searchBodies } from "../data";
import { bodyCatalogJsonSchema, bodyCatalogSchema } from "../schema";

describe("bodies.json", () => {
  it("passes the schema", () => {
    expect(bodyCatalogSchema.safeParse(bodiesData).success).toBe(true);
  });

  it("derives every id from the model name", () => {
    for (const body of bodies) {
      expect(body.id).toBe(`fujifilm-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    }
  });

  it("matches the committed JSON Schema", () => {
    const committed = JSON.parse(readFileSync("src/data/bodies.schema.json", "utf8")) as unknown;
    expect(committed).toEqual(bodyCatalogJsonSchema());
  });

  it("looks bodies up by id", () => {
    expect(getBodyById("fujifilm-gfx100s-ii")?.name).toBe("GFX100S II");
    expect(getBodyById("fujifilm-x100vi")).toBeUndefined();
  });
});

describe("bodyCatalogSchema", () => {
  const valid = bodies[0];
  const catalog = (list: unknown[]) => ({
    lineupCheckedAt: "2026-10-14",
    lineupSource: "https://www.fujifilm-x.com/global/products/cameras/",
    bodies: list,
  });

  it("rejects duplicate ids", () => {
    expect(bodyCatalogSchema.safeParse(catalog([valid, valid])).success).toBe(false);
  });

  it("rejects a GFX series body on the X mount", () => {
    expect(bodyCatalogSchema.safeParse(catalog([{ ...valid, series: "GFX" }])).success).toBe(false);
  });
});

describe("searchBodies", () => {
  it("matches names ignoring case, spaces and hyphens, exact matches first", () => {
    expect(searchBodies("xt5").map((body) => body.name)).toEqual(["X-T5", "X-T50"]);
    expect(searchBodies("x-t50").map((body) => body.name)).toEqual(["X-T50"]);
    expect(searchBodies("gfx 100s ii").map((body) => body.name)).toEqual(["GFX100S II"]);
  });

  it("matches aliases and returns every body for an empty query", () => {
    expect(searchBodies("gfx eterna").map((body) => body.name)).toEqual(["GFX ETERNA 55"]);
    expect(searchBodies("  ")).toHaveLength(bodies.length);
  });
});
