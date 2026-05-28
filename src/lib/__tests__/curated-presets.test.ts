import { describe, it, expect } from "vitest";
import { getPresetBySlug, findPresetByIds, curatedPresets } from "../curated-presets";

describe("getPresetBySlug", () => {
  it("returns undefined for non-existent slug", () => {
    expect(getPresetBySlug("does-not-exist")).toBeUndefined();
  });

  it("finds a preset by slug", () => {
    const first = curatedPresets[0];
    if (!first) {
      return;
    }
    const result = getPresetBySlug(first.slug);
    expect(result).toBeDefined();
    expect(result!.slug).toBe(first.slug);
  });
});

describe("findPresetByIds", () => {
  it("returns undefined for empty ids", () => {
    expect(findPresetByIds([])).toBeUndefined();
  });

  it("returns undefined when ids contain duplicates", () => {
    expect(findPresetByIds(["a", "a", "b"])).toBeUndefined();
  });

  it("matches a preset regardless of id order", () => {
    const preset = curatedPresets[0];
    if (!preset) {
      return;
    }
    const reversed = [...preset.lensIds].reverse();
    expect(findPresetByIds(reversed)).toEqual(preset);
  });

  it("does not match when ids are a subset of a preset", () => {
    const preset = curatedPresets[0];
    if (!preset || preset.lensIds.length < 2) {
      return;
    }
    const subset = preset.lensIds.slice(0, -1);
    expect(findPresetByIds(subset)).not.toEqual(preset);
  });

  it("does not match when ids are a superset of a preset", () => {
    const preset = curatedPresets[0];
    if (!preset) {
      return;
    }
    const superset = [...preset.lensIds, "extra-lens-id"];
    expect(findPresetByIds(superset)).not.toEqual(preset);
  });

  it("returns undefined for unrecognized ids", () => {
    expect(findPresetByIds(["fake-a", "fake-b", "fake-c"])).toBeUndefined();
  });
});
