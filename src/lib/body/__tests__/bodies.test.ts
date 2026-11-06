import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bodiesData from "@/data/bodies.json";
import { bodies, getBodyById } from "../data";
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

describe("body spec fields", () => {
  it("states IBIS stops only for stabilized bodies", () => {
    for (const body of bodies) {
      if (body.ibisStops !== undefined) {expect(body.ibis).toBe(true);}
    }
    expect(getBodyById("fujifilm-x-h2")?.ibisStops).toBeGreaterThan(0);
    expect(getBodyById("fujifilm-x-t30-ii")?.ibisStops).toBeUndefined();
  });

  it("leaves a rate out when the body has no such shutter or no figure", () => {
    expect(getBodyById("fujifilm-x-pro1")?.burstFps).toEqual({ mechanical: 6 });
    expect(getBodyById("fujifilm-x-a20")?.burstFps).toBeUndefined();
  });

  it("has a viewfinder entry for every body, and an EVF has its resolution", () => {
    for (const body of bodies) {
      if (body.viewfinder.type === "evf") {expect(body.viewfinder.dotsMillion).toBeGreaterThan(0);}
    }
  });

  it("uses 1 or 2 card slots", () => {
    for (const body of bodies) {
      if (body.cardSlots !== undefined) {expect([1, 2]).toContain(body.cardSlots);}
    }
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

  it("rejects ibisStops on a body without IBIS", () => {
    expect(bodyCatalogSchema.safeParse(catalog([{ ...valid, ibis: false, ibisStops: 5 }])).success).toBe(false);
  });

  it("rejects a GFX series body on the X mount", () => {
    expect(bodyCatalogSchema.safeParse(catalog([{ ...valid, series: "GFX" }])).success).toBe(false);
  });
});
