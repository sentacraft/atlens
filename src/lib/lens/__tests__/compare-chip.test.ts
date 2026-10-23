import { describe, expect, it } from "vitest";
import { compareChipState } from "@/lib/lens/lens";

describe("compareChipState", () => {
  it("shows a lens already compared as selected even when the list is full", () => {
    expect(compareChipState(true, false)).toBe("selected");
    expect(compareChipState(true, true)).toBe("selected");
    expect(compareChipState(false, true)).toBe("full");
    expect(compareChipState(false, false)).toBe("idle");
  });
});
