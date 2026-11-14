import { describe, it, expect } from "vitest";
import { serializeFilters, parseFilters, FILTER_PARAM_KEYS } from "../url/filter-params";
import { defaultFilters, type FilterState } from "../lens/lens";

describe("serializeFilters", () => {
  it("produces empty params for default filters", () => {
    const p = serializeFilters(defaultFilters);
    expect(p.toString()).toBe("");
  });

  it("serializes brands as comma-separated", () => {
    const p = serializeFilters({ ...defaultFilters, brands: ["fujifilm", "sigma"] });
    expect(p.get("b")).toBe("fujifilm,sigma");
  });

  it("serializes typeFilter", () => {
    const p = serializeFilters({ ...defaultFilters, typeFilter: "prime" });
    expect(p.get("t")).toBe("prime");
  });

  it("serializes focusFilter", () => {
    const p = serializeFilters({ ...defaultFilters, focusFilter: "manual" });
    expect(p.get("f")).toBe("manual");
  });

  it("serializes opticalTrait", () => {
    const p = serializeFilters({ ...defaultFilters, opticalTrait: "macro" });
    expect(p.get("ot")).toBe("macro");
  });

  it("serializes focusMotorClass", () => {
    const p = serializeFilters({ ...defaultFilters, focusMotorClass: "linear" });
    expect(p.get("m")).toBe("linear");
  });

  it("serializes features as comma-separated", () => {
    const p = serializeFilters({ ...defaultFilters, features: ["wr", "ois"] });
    expect(p.get("feat")).toBe("wr,ois");
  });

  it("serializes focalCategories as comma-separated", () => {
    const p = serializeFilters({ ...defaultFilters, focalCategories: ["wide", "mediumTele"] });
    expect(p.get("fc")).toBe("wide,mediumTele");
  });

  it("serializes sort only when non-default", () => {
    expect(serializeFilters(defaultFilters).has("sort")).toBe(false);
    expect(serializeFilters({ ...defaultFilters, sort: "weightG" }).get("sort")).toBe("weightG");
  });

  it("serializes sortDir only when non-default", () => {
    expect(serializeFilters(defaultFilters).has("dir")).toBe(false);
    expect(serializeFilters({ ...defaultFilters, sortDir: "desc" }).get("dir")).toBe("desc");
  });
});

describe("parseFilters", () => {
  it("returns defaults for empty params", () => {
    const result = parseFilters(new URLSearchParams());
    expect(result).toEqual(defaultFilters);
  });

  it("parses brands", () => {
    const result = parseFilters(new URLSearchParams("b=fujifilm,sigma"));
    expect(result.brands).toEqual(["fujifilm", "sigma"]);
  });

  it("filters empty brand segments", () => {
    const result = parseFilters(new URLSearchParams("b=fujifilm,,sigma"));
    expect(result.brands).toEqual(["fujifilm", "sigma"]);
  });

  it("validates typeFilter against allowed values", () => {
    expect(parseFilters(new URLSearchParams("t=prime")).typeFilter).toBe("prime");
    expect(parseFilters(new URLSearchParams("t=zoom")).typeFilter).toBe("zoom");
    expect(parseFilters(new URLSearchParams("t=invalid")).typeFilter).toBeNull();
  });

  it("validates focusFilter against allowed values", () => {
    expect(parseFilters(new URLSearchParams("f=auto")).focusFilter).toBe("auto");
    expect(parseFilters(new URLSearchParams("f=manual")).focusFilter).toBe("manual");
    expect(parseFilters(new URLSearchParams("f=laser")).focusFilter).toBeNull();
  });

  it("ignores the retired photo/cine param", () => {
    expect(parseFilters(new URLSearchParams("u=cine"))).toEqual(defaultFilters);
  });

  it("validates opticalTrait", () => {
    expect(parseFilters(new URLSearchParams("ot=macro")).opticalTrait).toBe("macro");
    expect(parseFilters(new URLSearchParams("ot=nope")).opticalTrait).toBeNull();
  });

  it("validates focusMotorClass", () => {
    expect(parseFilters(new URLSearchParams("m=linear")).focusMotorClass).toBe("linear");
    expect(parseFilters(new URLSearchParams("m=dc")).focusMotorClass).toBe("dc");
    expect(parseFilters(new URLSearchParams("m=ultrasonic")).focusMotorClass).toBeNull();
  });

  it("filters invalid feature keys", () => {
    const result = parseFilters(new URLSearchParams("feat=wr,bogus,ois"));
    expect(result.features).toEqual(["wr", "ois"]);
  });

  it("filters invalid focalCategories", () => {
    const result = parseFilters(new URLSearchParams("fc=wide,bogus,superTele"));
    expect(result.focalCategories).toEqual(["wide", "superTele"]);
  });

  it("validates sortKey", () => {
    expect(parseFilters(new URLSearchParams("sort=weightG")).sort).toBe("weightG");
    expect(parseFilters(new URLSearchParams("sort=price")).sort).toBe("focalLength");
  });

  it("parses sortDir with fallback to asc", () => {
    expect(parseFilters(new URLSearchParams("dir=desc")).sortDir).toBe("desc");
    expect(parseFilters(new URLSearchParams("dir=random")).sortDir).toBe("asc");
    expect(parseFilters(new URLSearchParams()).sortDir).toBe("asc");
  });
});

describe("custom browse URL params", () => {
  it.each(["actual", "equivalent"] as const)("round-trips custom focal values in %s", (reference) => {
    for (const value of [null, 40.5]) {
      const state = { ...defaultFilters, focalLength: { value, reference }, maxAperture: 2.8, weightLimit: 275.5 };
      const params = serializeFilters(state);
      expect(params.get("fmm")).toBe(value === null ? "custom" : String(value));
      expect(params.get("fr")).toBe(reference);
      expect(params.get("ap")).toBe("2.8");
      expect(params.get("w")).toBe("275.5");
      expect(parseFilters(params)).toEqual(state);
      for (const key of params.keys()) {
        expect([...FILTER_PARAM_KEYS]).toContain(key);
      }
    }
  });

  it.each(["custom", "40.5"])("lets valid custom mode %s override categories", (fmm) => {
    const params = new URLSearchParams({ fmm, fr: "invalid", fc: "wide" });
    expect(parseFilters(params)).toMatchObject({
      focalLength: { value: fmm === "custom" ? null : 40.5, reference: "equivalent" },
      focalCategories: [],
    });
    params.delete("fr");
    expect(parseFilters(params).focalLength?.reference).toBe("equivalent");
    const serialized = serializeFilters({ ...defaultFilters, focalCategories: ["wide"],
      focalLength: { value: null, reference: "actual" } });
    expect(serialized.has("fc")).toBe(false);
  });

  it.each(["", "0", "-2", "NaN", "Infinity", "1e309", "abc"])("ignores invalid custom value %s without losing categories", (fmm) => {
    expect(parseFilters(new URLSearchParams({ fmm, fc: "wide,bogus", fr: "actual", ap: fmm, w: fmm })))
      .toMatchObject({ focalLength: null, focalCategories: ["wide"], maxAperture: null, weightLimit: null });
  });

  it("accepts aperture stops only and positive custom weight limits", () => {
    for (const stop of [1.4, 2, 2.8, 3.5, 4, 5.6]) {
      expect(parseFilters(new URLSearchParams({ ap: String(stop) })).maxAperture).toBe(stop);
    }
    expect(parseFilters(new URLSearchParams("ap=1.8&w=275.5")).maxAperture).toBeNull();
    expect(parseFilters(new URLSearchParams("ap=1.8&w=275.5")).weightLimit).toBe(275.5);
    expect(parseFilters(new URLSearchParams("fr=actual")).focalLength).toBeNull();
  });

  it.each([0, -1, NaN, Infinity])("does not serialize invalid maxima %s", (value) => {
    const params = serializeFilters({ ...defaultFilters, maxAperture: value, weightLimit: value });
    expect(params.has("ap")).toBe(false);
    expect(params.has("w")).toBe(false);
  });
});

describe("round-trip", () => {
  it("serialize → parse preserves default filters", () => {
    const result = parseFilters(serializeFilters(defaultFilters));
    expect(result).toEqual(defaultFilters);
  });

  it("serialize → parse preserves complex filter state", () => {
    const state: FilterState = {
      ...defaultFilters,
      brands: ["fujifilm", "viltrox"],
      typeFilter: "prime",
      focusFilter: "auto",
      opticalTrait: "macro",
      focusMotorClass: "stepping",
      features: ["wr", "ois"],
      focalCategories: ["wide", "standard"],
      sort: "maxAperture",
      sortDir: "desc",
    };
    const result = parseFilters(serializeFilters(state));
    expect(result).toEqual(state);
  });

});

describe("FILTER_PARAM_KEYS", () => {
  it("covers every key serializeFilters can emit", () => {
    // A maximal state that activates every dimension, so serializeFilters emits
    // all of its keys. The URL-sync merge deletes FILTER_PARAM_KEYS before
    // re-writing; a key it can emit but does not list would never get cleared.
    const maximal: FilterState = {
      ...defaultFilters,
      brands: ["fujifilm"],
      typeFilter: "prime",
      focusFilter: "auto",
      opticalTrait: "macro",
      focusMotorClass: "linear",
      features: ["ois"],
      focalCategories: ["wide"],
      sort: "maxAperture",
      sortDir: "desc",
    };
    for (const key of serializeFilters(maximal).keys()) {
      expect([...FILTER_PARAM_KEYS]).toContain(key);
    }
  });
});
