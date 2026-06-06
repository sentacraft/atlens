import { describe, it, expect } from "vitest";
import { serializeFilters, parseFilters } from "../filter-params";
import { defaultFilters, type FilterState } from "../lens";

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

  it("serializes usage only when non-default", () => {
    expect(serializeFilters(defaultFilters).has("u")).toBe(false);
    expect(serializeFilters({ ...defaultFilters, usage: "cine" }).get("u")).toBe("cine");
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

  it("parses usage correctly", () => {
    expect(parseFilters(new URLSearchParams("u=all")).usage).toBe("photo");
    expect(parseFilters(new URLSearchParams("u=cine")).usage).toBe("cine");
    expect(parseFilters(new URLSearchParams("u=photo")).usage).toBe("photo");
    expect(parseFilters(new URLSearchParams("u=bogus")).usage).toBe("photo");
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

describe("round-trip", () => {
  it("serialize → parse preserves default filters", () => {
    const result = parseFilters(serializeFilters(defaultFilters));
    expect(result).toEqual(defaultFilters);
  });

  it("serialize → parse preserves complex filter state", () => {
    const state: FilterState = {
      brands: ["fujifilm", "viltrox"],
      typeFilter: "prime",
      focusFilter: "auto",
      usage: "cine",
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

  it("serialize → parse preserves usage=cine", () => {
    const state: FilterState = { ...defaultFilters, usage: "cine" };
    const result = parseFilters(serializeFilters(state));
    expect(result.usage).toBe("cine");
  });
});
