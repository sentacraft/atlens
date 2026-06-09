import { describe, it, expect } from "vitest";
import type { IrisMechanismConfig } from "../iris/kinematics";
import {
  solveAllBlades,
  thetaRange,
  bladeShapePath,
  computeBladeCurvature,
  computeThetaOpen,
  buildDerivedConfig,
  tNormToTheta,
  apertureInradius,
  findThetaForInradius,
  findThetaForFStop,
  DEFAULT_IRIS_CONFIG,
} from "../iris/kinematics";

// Representative 7-blade config derived from DEFAULT_IRIS_CONFIG at housingRadius=100.
const cfg7: IrisMechanismConfig = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);

// ---------------------------------------------------------------------------
// thetaRange
// ---------------------------------------------------------------------------
describe("thetaRange", () => {
  it("returns finite range for typical config", () => {
    const r = thetaRange(cfg7);
    expect(r.min).toBeLessThan(r.max);
    expect(isFinite(r.min)).toBe(true);
    expect(isFinite(r.max)).toBe(true);
  });

  it("returns half-period range when d >= Rp", () => {
    // DEFAULT_IRIS_CONFIG has d=88, Rp=85 at h=100 → d > Rp
    const r = thetaRange(cfg7);
    const delta = cfg7.slotOffset;
    expect(r.min).toBeCloseTo(-delta, 6);
    expect(r.max).toBeCloseTo(-delta + Math.PI, 6);
  });

  it("constrains range when d < Rp", () => {
    const tight: IrisMechanismConfig = {
      ...cfg7,
      pinDistance: 50,   // d=50 < Rp≈85
      pivotRadius: 85,
    };
    const r = thetaRange(tight);
    expect(r.max - r.min).toBeLessThan(Math.PI);
  });
});

// ---------------------------------------------------------------------------
// solveAllBlades
// ---------------------------------------------------------------------------
describe("solveAllBlades", () => {
  it("returns N blades at a valid theta", () => {
    const r = thetaRange(cfg7);
    const theta = (r.min + r.max) / 2;
    const blades = solveAllBlades(theta, cfg7);
    expect(blades).toHaveLength(cfg7.N);
  });

  it("returns empty array when theta is outside valid range", () => {
    // cfg7 uses d >= Rp so discriminant is always non-negative. Use a tight
    // config (d < Rp) which has a constrained thetaRange, then probe outside it.
    const tight: IrisMechanismConfig = { ...cfg7, pinDistance: 50 };
    const r = thetaRange(tight);
    const blades = solveAllBlades(r.max + 1, tight);
    expect(blades).toHaveLength(0);
  });

  it("each blade has correct index and finite positions", () => {
    const r = thetaRange(cfg7);
    const blades = solveAllBlades(r.min, cfg7);
    blades.forEach((b, i) => {
      expect(b.index).toBe(i);
      expect(isFinite(b.pivotPos.x)).toBe(true);
      expect(isFinite(b.pivotPos.y)).toBe(true);
      expect(isFinite(b.guidePinPos.x)).toBe(true);
      expect(isFinite(b.guidePinPos.y)).toBe(true);
      expect(isFinite(b.bladeAngle)).toBe(true);
    });
  });

  it("pivot pins lie on the pivot circle", () => {
    const r = thetaRange(cfg7);
    const blades = solveAllBlades(r.min, cfg7);
    for (const b of blades) {
      const dist = Math.hypot(b.pivotPos.x, b.pivotPos.y);
      expect(dist).toBeCloseTo(cfg7.pivotRadius, 4);
    }
  });

  it("guide pins maintain rigid distance from pivot", () => {
    const r = thetaRange(cfg7);
    const theta = (r.min + r.max) / 2;
    const blades = solveAllBlades(theta, cfg7);
    for (const b of blades) {
      const dist = Math.hypot(
        b.guidePinPos.x - b.pivotPos.x,
        b.guidePinPos.y - b.pivotPos.y
      );
      expect(dist).toBeCloseTo(cfg7.pinDistance, 4);
    }
  });

  it("blades are evenly distributed angularly", () => {
    const r = thetaRange(cfg7);
    const blades = solveAllBlades(r.min, cfg7);
    const step = (2 * Math.PI) / cfg7.N;
    blades.forEach((b, i) => {
      const expectedAngle = i * step;
      const pivotAngle = Math.atan2(b.pivotPos.y, b.pivotPos.x);
      // Normalize to [0, 2π)
      const normalised = ((pivotAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(normalised).toBeCloseTo(expectedAngle, 4);
    });
  });
});

// ---------------------------------------------------------------------------
// computeBladeCurvature
// ---------------------------------------------------------------------------
describe("computeBladeCurvature", () => {
  it("returns a positive curvature for valid inputs", () => {
    const C = computeBladeCurvature(115, 30, 100);
    expect(C).toBeGreaterThan(0);
    expect(C).toBeLessThan(10);
  });

  it("returns 0 when housingRadius is too small (disc < 0)", () => {
    // L=200, W=10 → cx=100, hw=5, Rt=housingRadius-5; need Rt² < cx²=10000
    // housingRadius=50 → Rt=45, Rt²=2025 < 10000? No, disc=2025-10000<0 → return 0
    const C = computeBladeCurvature(200, 10, 50);
    expect(C).toBe(0);
  });

  it("produces curvature consistent with buildDerivedConfig", () => {
    const derived = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);
    const expected = computeBladeCurvature(
      DEFAULT_IRIS_CONFIG.bladeLength,
      DEFAULT_IRIS_CONFIG.bladeWidth,
      100
    );
    expect(derived.bladeCurvature).toBeCloseTo(expected, 8);
  });
});

// ---------------------------------------------------------------------------
// buildDerivedConfig
// ---------------------------------------------------------------------------
describe("buildDerivedConfig", () => {
  it("copies stored fields verbatim", () => {
    const dc = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);
    expect(dc.N).toBe(DEFAULT_IRIS_CONFIG.N);
    expect(dc.pinDistance).toBe(DEFAULT_IRIS_CONFIG.pinDistance);
    expect(dc.slotOffset).toBe(DEFAULT_IRIS_CONFIG.slotOffset);
    expect(dc.bladeLength).toBe(DEFAULT_IRIS_CONFIG.bladeLength);
    expect(dc.bladeWidth).toBe(DEFAULT_IRIS_CONFIG.bladeWidth);
  });

  it("derives pivotRadius as housingRadius - bladeWidth/2", () => {
    const dc = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);
    expect(dc.pivotRadius).toBeCloseTo(100 - DEFAULT_IRIS_CONFIG.bladeWidth / 2, 8);
  });

  it("derives bladeCurvature from geometry", () => {
    const dc = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);
    expect(dc.bladeCurvature).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// tNormToTheta
// ---------------------------------------------------------------------------
describe("tNormToTheta", () => {
  it("t=0 returns thetaOpen", () => {
    expect(tNormToTheta(0, 0.5, 1.5)).toBeCloseTo(0.5, 8);
  });

  it("t=1 returns thetaMax", () => {
    expect(tNormToTheta(1, 0.5, 1.5)).toBeCloseTo(1.5, 8);
  });

  it("t=0.5 returns midpoint", () => {
    expect(tNormToTheta(0.5, 0.0, 2.0)).toBeCloseTo(1.0, 8);
  });

  it("is linear between open and max", () => {
    const open = 0.3, max = 1.8;
    const t1 = tNormToTheta(0.25, open, max);
    const t2 = tNormToTheta(0.50, open, max);
    const t3 = tNormToTheta(0.75, open, max);
    expect(t2 - t1).toBeCloseTo(t3 - t2, 8);
  });
});

// ---------------------------------------------------------------------------
// apertureInradius
// ---------------------------------------------------------------------------
describe("apertureInradius", () => {
  it("returns a positive inradius at a mid-range theta", () => {
    const r = thetaRange(cfg7);
    const thetaMid = (r.min + r.max) * 0.6;
    const inr = apertureInradius(thetaMid, cfg7);
    expect(inr).toBeGreaterThan(0);
  });

  it("inradius decreases monotonically from thetaOpen to thetaMax", () => {
    // apertureInradius is 0 at the fully-open position (blades don't yet
    // overlap the aperture polygon), then peaks once blades start intersecting,
    // then decreases monotonically as the iris closes further. The monotone
    // region starts at thetaOpen (computeThetaOpen), not at thetaRange.min.
    const r = thetaRange(cfg7);
    const thetaOpen = computeThetaOpen(cfg7, 100);
    const samples = 8;
    const thetas = Array.from({ length: samples }, (_, i) =>
      thetaOpen + (i / (samples - 1)) * (r.max - thetaOpen) * 0.95
    );
    const radii = thetas.map((th) => apertureInradius(th, cfg7));
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeLessThanOrEqual(radii[i - 1] + 1e-6);
    }
  });

  it("returns 0 when blades have no valid solution (tight config, out-of-range theta)", () => {
    // cfg7 has d >= Rp so it has no invalid theta. Use a tight config instead.
    const tight: IrisMechanismConfig = { ...cfg7, pinDistance: 50 };
    const r = thetaRange(tight);
    expect(apertureInradius(r.max + 1, tight)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findThetaForInradius
// ---------------------------------------------------------------------------
describe("findThetaForInradius", () => {
  it("returned theta produces inradius close to the target", () => {
    const r = thetaRange(cfg7);
    const range = { min: r.min, max: r.max * 0.9 };
    const openR = apertureInradius(range.min, cfg7);
    const targetR = openR * 0.5;
    const theta = findThetaForInradius(targetR, cfg7, range);
    expect(apertureInradius(theta, cfg7)).toBeCloseTo(targetR, 1);
  });
});

// ---------------------------------------------------------------------------
// findThetaForFStop
// ---------------------------------------------------------------------------
describe("findThetaForFStop", () => {
  it("f-stop at open position equals openFStop", () => {
    const r = thetaRange(cfg7);
    const range = { min: r.min, max: r.max };
    // At thetaOpen the iris is fully open; f-stop should be ≈ openFStop
    const openFStop = 1.4;
    const theta = findThetaForFStop(openFStop, cfg7, range, openFStop);
    // theta should be very close to range.min
    expect(theta).toBeCloseTo(range.min, 1);
  });

  it("closing f-stop produces a smaller inradius", () => {
    const r = thetaRange(cfg7);
    const range = { min: r.min, max: r.max };
    const thetaOpen = findThetaForFStop(1.4, cfg7, range, 1.4);
    const thetaClosed = findThetaForFStop(5.6, cfg7, range, 1.4);
    expect(apertureInradius(thetaClosed, cfg7)).toBeLessThan(
      apertureInradius(thetaOpen, cfg7)
    );
  });
});

// ---------------------------------------------------------------------------
// computeThetaOpen
// ---------------------------------------------------------------------------
describe("computeThetaOpen", () => {
  it("returns a theta within the valid range", () => {
    const r = thetaRange(cfg7);
    const thetaOpen = computeThetaOpen(cfg7, 100);
    expect(thetaOpen).toBeGreaterThanOrEqual(r.min - 1e-6);
    expect(thetaOpen).toBeLessThanOrEqual(r.max + 1e-6);
  });
});

// ---------------------------------------------------------------------------
// bladeShapePath
// ---------------------------------------------------------------------------
describe("bladeShapePath", () => {
  it("returns a non-empty SVG path string", () => {
    const path = bladeShapePath(cfg7);
    expect(typeof path).toBe("string");
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("degenerate path (C≈0) is a straight rectangle with semicircle caps", () => {
    const straight: IrisMechanismConfig = { ...cfg7, bladeCurvature: 0 };
    const path = bladeShapePath(straight);
    // Degenerate branch uses L (lineto) commands, not A arcs for the long edges
    expect(path).toContain("L");
  });

  it("curved path uses arc commands for long edges", () => {
    const path = bladeShapePath(cfg7);
    // Should contain multiple A commands for arcs
    const arcCount = (path.match(/\bA\b/g) || []).length;
    expect(arcCount).toBeGreaterThanOrEqual(4);
  });

  it("path coordinates are finite numbers", () => {
    const path = bladeShapePath(cfg7);
    const numbers = path.replace(/[A-Z]/g, " ").trim().split(/\s+/).map(Number);
    for (const n of numbers) {
      expect(isFinite(n)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_IRIS_CONFIG sanity
// ---------------------------------------------------------------------------
describe("DEFAULT_IRIS_CONFIG", () => {
  it("has a positive blade count", () => {
    expect(DEFAULT_IRIS_CONFIG.N).toBeGreaterThan(0);
  });

  it("can be used to derive a valid config", () => {
    const dc = buildDerivedConfig(DEFAULT_IRIS_CONFIG, 100);
    expect(dc.pivotRadius).toBeGreaterThan(0);
    expect(dc.bladeCurvature).toBeGreaterThanOrEqual(0);
  });
});
