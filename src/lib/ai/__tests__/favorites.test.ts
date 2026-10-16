import { describe, expect, it } from "vitest";
import { evalFavorites } from "../favorites";

describe("evalFavorites", () => {
  it("reads a JSON array of ids, and ignores a missing or malformed header", () => {
    expect(evalFavorites('["a","b"]')).toEqual(["a", "b"]);
    expect(evalFavorites(null)).toBeUndefined();
    expect(evalFavorites("not json")).toBeUndefined();
    expect(evalFavorites('{"a":1}')).toBeUndefined();
  });
});
