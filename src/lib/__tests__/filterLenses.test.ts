import { describe, it, expect } from "vitest";
import {
  filterLenses,
  getAvailableFilterOptions,
  defaultFilters,
  type FilterState,
} from "../lens/lens";
import { getAllLenses } from "../lens/data";

// Completeness net for filterLenses (kept as a readable if-chain rather than a
// registry-driven loop). The filter dimensions are enumerated in several places
// — filterLenses, getAvailableFilterOptions, serialize/parse — and the risk is
// adding a FilterState field but forgetting to wire it into filterLenses, so the
// filter silently does nothing.
//
// `Refinement` is every FilterState field except the sort axis and the usage
// view (usage is never "off", so "activating it narrows" doesn't apply — it gets
// its own partition test below). Typing SAMPLES as Record<Refinement, …> makes a
// new FilterState field a COMPILE error here until it gets a sample; the test
// then runs that sample through filterLenses, so a dimension that isn't wired in
// fails at RUNTIME too.
type Refinement = Exclude<keyof FilterState, "sort" | "sortDir" | "usage">;

const all = getAllLenses("en");
const baseline = filterLenses(all, defaultFilters);
const opts = getAvailableFilterOptions(baseline);

// One value per dimension that is actually present in the catalog (so filtering
// by it drops the lenses that lack it). Values come from the live data rather
// than hard-coded constants, so they track the dataset.
const SAMPLES: Record<Refinement, Partial<FilterState>> = {
  brands: { brands: [opts.brands[0]] },
  typeFilter: { typeFilter: opts.types[0] },
  focusFilter: { focusFilter: opts.focusModes[0] },
  opticalTrait: { opticalTrait: opts.opticalTraits[0] },
  focusMotorClass: { focusMotorClass: opts.focusMotorClasses[0] },
  features: { features: [opts.features[0]] },
  focalCategories: { focalCategories: [opts.focalCategories[0]] },
};

describe("filterLenses wires up every refinement dimension", () => {
  it.each(Object.keys(SAMPLES) as Refinement[])(
    "%s narrows the default view",
    (key) => {
      const filtered = filterLenses(all, { ...defaultFilters, ...SAMPLES[key] });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(baseline.length);
    },
  );

  it("usage partitions photo and cine", () => {
    const photo = filterLenses(all, { ...defaultFilters, usage: "photo" });
    const cine = filterLenses(all, { ...defaultFilters, usage: "cine" });
    expect(photo.length).toBeGreaterThan(0);
    expect(cine.length).toBeGreaterThan(0);
    expect(photo.length + cine.length).toBeLessThanOrEqual(all.length);
  });
});
