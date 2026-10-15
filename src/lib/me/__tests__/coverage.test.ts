import { describe, expect, it } from "vitest";
import { axisPosition, coverageAxis, coverageRows, equivalentFocal, wideGap } from "../coverage";

const lens = (id: string, focalMinMm: number, focalMaxMm: number, mount: "X" | "G" = "X") => ({
  id,
  label: id,
  mount,
  focalMinMm,
  focalMaxMm,
  manual: false,
});

describe("coverage", () => {
  it("converts to full-frame equivalents by mount", () => {
    expect(equivalentFocal(18, "X")).toBe(27);
    expect(equivalentFocal(63, "G")).toBe(50);
  });

  it("sorts rows from the widest lens", () => {
    const rows = coverageRows([lens("tele", 70, 300), lens("std", 18, 55), lens("prime", 33, 33)]);

    expect(rows.map((row) => [row.id, row.equivalentMin, row.equivalentMax])).toEqual([
      ["std", 27, 83],
      ["prime", 50, 50],
      ["tele", 105, 450],
    ]);
  });

  it("spans 15mm to at least 135mm and always labels its end", () => {
    expect(coverageAxis(coverageRows([lens("prime", 33, 33)]))).toEqual({
      min: 15,
      max: 135,
      ticks: [15, 24, 35, 50, 85, 135],
    });
    expect(coverageAxis(coverageRows([lens("tele", 70, 300)])).ticks.slice(-2)).toEqual([200, 450]);
    expect(coverageAxis(coverageRows([lens("wide", 8, 16)])).min).toBe(12);
  });

  it("places focal lengths on a log scale", () => {
    const axis = { min: 15, max: 135, ticks: [] };

    expect(axisPosition(15, axis)).toBe(0);
    expect(axisPosition(135, axis)).toBeCloseTo(1);
    expect(axisPosition(45, axis)).toBeCloseTo(0.5);
  });

  it("reports the uncovered wide end", () => {
    const rows = coverageRows([lens("std", 18, 55)]);

    expect(wideGap(rows, coverageAxis(rows))).toBe(27);
    expect(wideGap([], coverageAxis([]))).toBeUndefined();
  });
});
