import { describe, expect, it } from "vitest";
import { readSource, stripSource, withSource } from "../source";

describe("withSource", () => {
  it("adds the tag and keeps other params and the hash", () => {
    expect(withSource("https://atlens.app/en/lenses?mount=X#top", "share_copy")).toBe(
      "https://atlens.app/en/lenses?mount=X&src=share_copy#top",
    );
  });

  it("replaces a tag the URL already carried", () => {
    expect(withSource("https://atlens.app/en?src=hn&utm_campaign=launch", "poster")).toBe(
      "https://atlens.app/en?src=poster",
    );
  });
});

describe("readSource", () => {
  it("reads src, falling back to utm_source, and utm_campaign", () => {
    expect(readSource("?src=poster")).toEqual({ src: "poster" });
    expect(readSource("?utm_source=hn&utm_campaign=launch")).toEqual({ src: "hn", campaign: "launch" });
    expect(readSource("?mount=X")).toEqual({});
  });
});

describe("stripSource", () => {
  it("drops tags and keeps everything else", () => {
    expect(stripSource("https://atlens.app/en?mount=X&src=poster&utm_medium=qr#top")).toBe("https://atlens.app/en?mount=X#top");
  });

  it("is null for an untagged URL", () => {
    expect(stripSource("https://atlens.app/en?mount=X")).toBeNull();
  });
});
