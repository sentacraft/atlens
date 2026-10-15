import { describe, expect, it } from "vitest";
import { getLensSummaries } from "@/lib/lens/data";
import { resolveGearHints } from "../gear-hints";

const lenses = getLensSummaries("zh");

describe("resolveGearHints", () => {
  it("preselects bodies however the user spells them", () => {
    expect(resolveGearHints({ bodies: ["X-T5", "xt5", "富士 X-T30 II"] }, lenses)).toEqual({
      bodies: ["fujifilm-x-t5", "fujifilm-x-t30-ii"],
      lenses: [],
      unresolved: [],
    });
  });

  it("preselects a lens only when one catalog model matches", () => {
    expect(resolveGearHints({ lenses: ["XF 18-55", "18-55"] }, lenses)).toEqual({
      bodies: [],
      lenses: ["fujifilm-xf-18-55mmf28-4-r-lm-ois-x"],
      unresolved: ["18-55"],
    });
  });

  it("leaves models outside the catalog for the user to enter", () => {
    expect(resolveGearHints({ bodies: ["X100V"], lenses: ["Helios 44"] }, lenses).unresolved).toEqual(["X100V", "Helios 44"]);
  });
});
