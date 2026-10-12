import { describe, expect, it } from "vitest";
import { firstSearchParam } from "../search-params";

describe("firstSearchParam", () => {
  it("returns a single value as is and the first of a repeated key", () => {
    expect(firstSearchParam("a")).toBe("a");
    expect(firstSearchParam(["a", "b"])).toBe("a");
    expect(firstSearchParam(undefined)).toBeUndefined();
  });
});
