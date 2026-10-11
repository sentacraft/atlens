import { describe, it, expect } from "vitest";
import { lensRef, buildRefIndex, LENS_REF_LENGTH, escapeLensLinkLabels } from "../lens-ref";
import { getAllLenses } from "@/lib/lens/data";

const lenses = getAllLenses("zh");

describe("lensRef", () => {
  it("gives every catalogue lens a distinct ref", () => {
    // The guard that matters: refs are a hash, so a future pipeline addition could in
    // principle collide with an existing lens and silently point a link at the wrong
    // one. This fails the build if that ever happens.
    const refs = lenses.map((lens) => lensRef(lens.id));
    expect(new Set(refs).size).toBe(lenses.length);
  });

  it("is deterministic and fixed-width", () => {
    for (const lens of lenses.slice(0, 20)) {
      expect(lensRef(lens.id)).toBe(lensRef(lens.id));
      expect(lensRef(lens.id)).toHaveLength(LENS_REF_LENGTH);
      expect(lensRef(lens.id)).toMatch(/^[0-9a-z]+$/);
    }
  });

  it("scatters ids that differ only by a suffix", () => {
    // The near-name case this scheme exists to survive: two catalogue entries whose
    // names differ by one marker must not land on neighbouring refs.
    expect(lensRef("fujifilm-xf-56mmf12-r-x")).not.toBe(lensRef("fujifilm-xf-56mmf12-r-apd-x"));
    const a = lensRef("fujifilm-xf-56mmf12-r-x");
    const b = lensRef("fujifilm-xf-56mmf12-r-apd-x");
    expect(a[0]).not.toBe(b[0]);
  });

  it("indexes back to the lens it came from", () => {
    const index = buildRefIndex(lenses);
    const sample = lenses[0];
    expect(index.get(lensRef(sample.id))?.id).toBe(sample.id);
    expect(index.get("zzzzz")).toBeUndefined();
  });
});

describe("escapeLensLinkLabels", () => {
  it("escapes a pipe and other punctuation inside a lens link label", () => {
    expect(escapeLensLinkLabels("| [Sigma 12mm F1.4 DC | Contemporary](lens:c01n5) | 12mm |")).toBe(
      "| [Sigma 12mm F1\\.4 DC \\| Contemporary](lens:c01n5) | 12mm |",
    );
  });

  it("leaves already-escaped punctuation alone", () => {
    const text = "[Sigma 12mm F1\\.4 DC \\| Contemporary](lens:c01n5)";
    expect(escapeLensLinkLabels(text)).toBe(text);
  });

  it("does not touch pipes outside lens links", () => {
    const text = "| a | [Official | site](https://example.com) | b |";
    expect(escapeLensLinkLabels(text)).toBe(text);
  });

  it("escapes emphasis, strikethrough and code markers in a lens link label", () => {
    expect(escapeLensLinkLabels("[A *B* ~C~ `D`](lens:abcde)")).toBe(
      "[A \\*B\\* \\~C\\~ \\`D\\`](lens:abcde)",
    );
  });
});
