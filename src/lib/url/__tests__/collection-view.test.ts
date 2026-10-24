import { describe, expect, it } from "vitest";
import { readCollectionView, writeCollectionView } from "../collection-view";

describe("collection view param", () => {
  it("reads the weight view and falls back to cards", () => {
    expect(readCollectionView("weight")).toBe("weight");
    expect(readCollectionView(["weight", "cards"])).toBe("weight");
    expect(readCollectionView("chart")).toBe("cards");
    expect(readCollectionView(null)).toBe("cards");
  });

  it("writes the weight view and drops the param for cards", () => {
    const url = new URL("https://atlens.test/en/lenses/x/collections/35mm?ref=share");
    writeCollectionView(url, "weight");
    expect(url.searchParams.get("view")).toBe("weight");
    writeCollectionView(url, "cards");
    expect(url.search).toBe("?ref=share");
  });
});
