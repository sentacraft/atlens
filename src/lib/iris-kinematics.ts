// Physical iris diaphragm mechanism — kinematic engine.
//
// Models a 2-point constrained iris: each blade has a fixed pivot pin on the
// base plate, and a guide pin that slides inside a radial slot on the rotating
// actuator ring. A single actuator rotation angle theta drives all N blades
// simultaneously through this constraint.
//
// Coordinate convention: SVG space, origin at iris center, +x right, +y down.
// Angles increase clockwise (SVG convention).
//
// Key distinction from src/lib/aperture.ts:
//   aperture.ts  — parametric / physical-approximation model for the logo mark.
//   iris-kinematics.ts — full 3-body kinematic model: base plate (fixed) +
//                       actuator ring (rotates) + N rigid blades (constrained).

// ── Types ─────────────────────────────────────────────────────────────────────

/** Full configuration for the iris mechanism and blade visual shape. */
export interface IrisMechanismConfig {
  // Mechanism topology
  /** Number of blades (5–9). */
  N: number;
  /** Radius of the pivot-pin circle on the base plate (px). */
  pivotRadius: number;
  /** Rigid distance from pivot hole to guide-pin hole on each blade (px). */
  pinDistance: number;
  /**
   * Angular offset δ of the actuator-ring slot relative to its corresponding
   * pivot pin direction (rad). Controls the coupling ratio and range of motion.
   *
   * The slot for blade i points in world-frame direction φ_i + δ + θ,
   * where φ_i = i·2π/N is the pivot's angular position and θ is the actuator
   * ring rotation. δ ≠ 0 ensures the slot is not collinear with the pivot,
   * which would produce degenerate (zero-coupling) motion.
   */
  slotOffset: number;

  // Blade visual shape
  /** Total blade length from pivot to tip (px). Should be > pinDistance. */
  bladeLength: number;
  /** Blade body width at its widest point (px). */
  bladeWidth: number;
  /**
   * Curvature of the blade's inner (aperture-facing) edge.
   * 0 = straight edges (polygonal aperture), 1 = maximally curved.
   */
  bladeCurvature: number;
}

/** Kinematic state of a single blade at a given actuator angle. */
export interface BladeState {
  /** Blade index (0 … N-1). */
  index: number;
  /** Fixed pivot-pin world position. */
  pivotPos: { x: number; y: number };
  /** Guide-pin world position (lies on the actuator-ring slot). */
  guidePinPos: { x: number; y: number };
  /**
   * Blade orientation angle in world frame (rad).
   * Defined as atan2(guidePinPos - pivotPos), i.e. the direction the blade
   * points from pivot toward guide pin (and onward to the tip).
   */
  bladeAngle: number;
}

// ── Kinematic solver ──────────────────────────────────────────────────────────

/**
 * Solve the guide-pin radial position r for blade 0 given actuator angle theta.
 *
 * The actuator ring carries N radial slots. Slot i points in world direction
 *   β_i = φ_i + δ + θ
 * where φ_i = i·2π/N and δ = config.slotOffset.
 *
 * The guide pin G must simultaneously:
 *   (a) lie on the slot: G = r · (cos β, sin β)
 *   (b) maintain rigid distance d from pivot P: |G - P|² = d²
 *
 * Substituting (a) into (b) yields the quadratic:
 *   r² - 2r · Rp · cos(δ + θ) + Rp² - d² = 0
 *
 * Solution (larger root — physically meaningful):
 *   Δ = d² - Rp² · sin²(δ + θ)
 *   r = Rp · cos(δ + θ) + √Δ
 *
 * Returns null when Δ < 0 (theta outside valid range).
 */
function solveGuidePinRadius(
  theta: number,
  config: IrisMechanismConfig
): number | null {
  const { pivotRadius: Rp, pinDistance: d, slotOffset: delta } = config;
  const angle = delta + theta; // β - φ_i  (same for all blades)
  const discriminant = d * d - Rp * Rp * Math.sin(angle) * Math.sin(angle);
  if (discriminant < 0) return null;
  return Rp * Math.cos(angle) + Math.sqrt(discriminant);
}

/**
 * Compute the kinematic state for all N blades at actuator angle theta.
 * Returns an empty array if theta is outside the valid range.
 */
export function solveAllBlades(
  theta: number,
  config: IrisMechanismConfig
): BladeState[] {
  const { N, pivotRadius: Rp, slotOffset: delta } = config;
  const r = solveGuidePinRadius(theta, config);
  if (r === null || r <= 0) return [];

  const step = (2 * Math.PI) / N;
  const slotDir = delta + theta; // β_0 = φ_0 + δ + θ = 0 + δ + θ (blade 0)

  return Array.from({ length: N }, (_, i) => {
    const phi = i * step; // pivot angular position for blade i

    // Pivot pin — fixed on base plate
    const pivotPos = {
      x: Rp * Math.cos(phi),
      y: Rp * Math.sin(phi),
    };

    // Guide pin — on slot (β_i = phi + delta + theta = phi + slotDir)
    const beta = phi + slotDir;
    const guidePinPos = {
      x: r * Math.cos(beta),
      y: r * Math.sin(beta),
    };

    // Blade orientation: direction from pivot to guide pin
    const bladeAngle = Math.atan2(
      guidePinPos.y - pivotPos.y,
      guidePinPos.x - pivotPos.x
    );

    return { index: i, pivotPos, guidePinPos, bladeAngle };
  });
}

// ── Range of motion ───────────────────────────────────────────────────────────

/**
 * Compute the valid theta range based on the discriminant condition:
 *   Δ = d² - Rp² · sin²(δ + θ) ≥ 0
 *   ⟹  |sin(δ + θ)| ≤ d / Rp
 *
 * If d ≥ Rp, the full [−π, π] circle is valid (no constraint from Δ).
 * Otherwise the valid interval centred on δ + θ = 0 is:
 *   θ ∈ [−δ − arcsin(d/Rp), −δ + arcsin(d/Rp)]
 *
 * The returned range is then further clipped so that:
 *   - theta_min produces a near-closed aperture (blade tip near center)
 *   - theta_max produces a near-open aperture (blade tip near housing edge)
 */
export function thetaRange(config: IrisMechanismConfig): {
  min: number;
  max: number;
} {
  const { pivotRadius: Rp, pinDistance: d, slotOffset: delta } = config;
  const ratio = d / Rp;

  // Theoretical limits from discriminant
  if (ratio >= 1) {
    // d ≥ Rp: discriminant d²−Rp²sin²(δ+θ) ≥ d²−Rp² > 0 everywhere — never negative.
    // The iris closes monotonically as θ increases from −δ (guide pin at max radius
    // Rp+d, blades radially outward) to −δ+π (guide pin at min radius d−Rp ≥ 0,
    // blades pointing nearly inward at ~180°). Use the full closing half-period.
    return { min: -delta, max: -delta + Math.PI };
  }

  const halfSpan = Math.asin(Math.min(1, ratio));
  return {
    min: -delta - halfSpan,
    max: -delta + halfSpan,
  };
}

// ── Blade shape ───────────────────────────────────────────────────────────────

/**
 * Generate the SVG path d-string for a single blade in local coordinates.
 *
 * Local frame: pivot hole at origin (0, 0), guide pin direction along +x axis.
 * Blade extends from (0,0) to (bladeLength, 0) along the centerline.
 *
 * Shape: TRUE circular arc-strip — both long edges are concentric circular arcs,
 * capped by exact semicircles at each end. Matches the original MechanicalIris
 * blade geometry where inner, outer and midline edges are all arcs of concentric
 * circles sharing the same center.
 *
 * The shared arc center sits below the chord (positive y in SVG), so the strip
 * bows in the −y direction (upward on screen). This produces the crescent shape
 * characteristic of real iris diaphragm blades.
 *
 * Derivation (chord = L, half-chord cx = L/2, half-width hw = W/2):
 *   sagitta   s = C × hw × 1.2           (arc bow at midpoint, scales with curvature)
 *   arc radius  R = (cx² + s²) / (2s)    (chord-sagitta formula)
 *   center y   cy = R − s                (positive, below chord)
 *   scale factor f = hw / R
 *
 * Outer-arc endpoints (radius R + hw):
 *   tail = (−cx·f,  −cy·f)      inner-arc endpoints (radius R − hw):
 *   tip  = ( cx·(2+f), −cy·f)       tail = (cx·f,  cy·f)
 *                                    tip  = (cx·(2−f), cy·f)
 *
 * End caps: semicircles (radius hw) centered at pivot (0,0) and tip (L,0).
 *
 * SVG arc directions (derived from angular positions of endpoints relative to center):
 *   outer arc tail→tip:  sweep=1 (clockwise,       bows through −y top)
 *   tip cap outer→inner: sweep=1 (clockwise,       caps around the tip)
 *   inner arc tip→tail:  sweep=0 (counterclockwise, bows through −y top)
 *   tail cap inner→outer: sweep=0 (counterclockwise, caps around the tail)
 */
export function bladeShapePath(config: IrisMechanismConfig): string {
  const { bladeLength: L, bladeWidth: W, bladeCurvature: C } = config;

  const hw = W / 2;
  const fmt = (n: number) => n.toFixed(3);

  if (C < 0.005) {
    // Degenerate: straight rectangular strip with semicircle caps.
    return [
      `M 0 ${fmt(-hw)}`,
      `L ${fmt(L)} ${fmt(-hw)}`,
      `A ${fmt(hw)} ${fmt(hw)} 0 0 1 ${fmt(L)} ${fmt(hw)}`,
      `L 0 ${fmt(hw)}`,
      `A ${fmt(hw)} ${fmt(hw)} 0 0 1 0 ${fmt(-hw)}`,
      "Z",
    ].join(" ");
  }

  const cx = L / 2;                                        // half-chord = arc center x
  const s  = C * hw * 1.2;                                 // sagitta
  const R  = (cx * cx + s * s) / (2 * s);                 // arc radius
  const cy = R - s;                                        // arc center y (below chord)
  const f  = hw / R;                                       // radial fraction
  const Ro = R + hw;                                       // outer arc radius
  const Ri = R - hw;                                       // inner arc radius

  // Outer arc endpoints (above chord: negative y)
  const OTailX = -cx * f,        OTailY = -cy * f;
  const OTipX  =  cx * (2 + f),  OTipY  = OTailY;

  // Inner arc endpoints (below chord: positive y)
  const ITailX =  cx * f,        ITailY =  cy * f;
  const ITipX  =  cx * (2 - f),  ITipY  = ITailY;

  return [
    `M ${fmt(OTailX)} ${fmt(OTailY)}`,
    // Outer arc tail→tip (CW, bows through −y)
    `A ${fmt(Ro)} ${fmt(Ro)} 0 0 1 ${fmt(OTipX)} ${fmt(OTipY)}`,
    // Tip semicircle cap outer→inner (CW, bulges outward at tip)
    `A ${fmt(hw)} ${fmt(hw)} 0 0 1 ${fmt(ITipX)} ${fmt(ITipY)}`,
    // Inner arc tip→tail (CCW, bows through −y)
    `A ${fmt(Ri)} ${fmt(Ri)} 0 0 0 ${fmt(ITailX)} ${fmt(ITailY)}`,
    // Tail semicircle cap inner→outer (CW, bulges outward at tail)
    `A ${fmt(hw)} ${fmt(hw)} 0 0 1 ${fmt(OTailX)} ${fmt(OTailY)}`,
    "Z",
  ].join(" ");
}

// ── Derived-config helpers ────────────────────────────────────────────────────

/**
 * The subset of IrisMechanismConfig that is stored in brand.ts / config files.
 * Derived parameters (pivotRadius, bladeCurvature) are always computed at use
 * time via buildDerivedConfig and are never persisted.
 */
export interface StoredIrisParams {
  /** Number of blades (5–9). */
  N: number;
  /** Rigid distance from pivot hole to guide-pin hole on each blade (px). */
  pinDistance: number;
  /** Angular offset δ of the actuator-ring slot relative to pivot (rad, decimal). */
  slotOffset: number;
  /** Total blade length from pivot to tip (px). */
  bladeLength: number;
  /** Blade body width at its widest point (px). */
  bladeWidth: number;
  /**
   * F-stop at the fully-open (maximum aperture) position.
   * Anchors the entire f-stop scale: f(r) = openFStop × (r_open / r).
   * e.g. 1.4 for a fast prime, 2.8 for a standard zoom.
   */
  openFStop: number;
  /**
   * Default aperture openness expressed as an f-stop number (e.g. 5.6).
   * Must be ≥ openFStop. Used as the static / initial aperture position for
   * non-interactive renders, and as the Auto-mode aperture position.
   */
  defaultFStop: number;
}

/**
 * Derive bladeCurvature so the outer arc radius exactly equals housingRadius.
 *
 * Constraint: Ro = R + hw = housingRadius  →  R = housingRadius - hw
 * Chord-sagitta: R = (cx² + s²) / (2s), s = C · hw · 1.2
 *
 * Solving for C (smaller root = less extreme curvature):
 *   C = (Rt - √(Rt² - cx²)) / (hw · 1.2)
 *   where Rt = housingRadius - hw, cx = L / 2
 *
 * Returns 0 if the constraint is not satisfiable (Rt < cx).
 */
export function computeBladeCurvature(
  L: number,
  W: number,
  housingRadius: number
): number {
  const hw = W / 2;
  const cx = L / 2;
  const Rt = housingRadius - hw;
  const disc = Rt * Rt - cx * cx;
  if (disc < 0) return 0;
  return (Rt - Math.sqrt(disc)) / (hw * 1.2);
}

/**
 * Find θ_open: the largest theta at which the outer arc apex (OMid) is still
 * flush with the housing circle.
 *
 * OMid = (cx, cy−Ro) is the topmost point of the outer arc in local blade frame.
 * apexRadius is monotonically decreasing on [−δ, kinRange.max].
 * Binary search finds the crossover point where apexRadius = housingRadius.
 */
export function computeThetaOpen(
  config: IrisMechanismConfig,
  housingRadius: number
): number {
  const { bladeLength: L, bladeWidth: W, bladeCurvature: C } = config;
  const hw = W / 2;
  const cx = L / 2;
  const s = C * hw * 1.2;
  const Rarc = (cx * cx + s * s) / (2 * s);
  const cy = Rarc - s;
  const Ro = Rarc + hw;

  const OMidX = cx;
  const OMidY = cy - Ro;

  function apexRadius(theta: number): number {
    const blades = solveAllBlades(theta, config);
    if (!blades.length) return 0;
    const b = blades[0];
    const ca = Math.cos(b.bladeAngle), sa = Math.sin(b.bladeAngle);
    const wx = b.pivotPos.x + ca * OMidX - sa * OMidY;
    const wy = b.pivotPos.y + sa * OMidX + ca * OMidY;
    return Math.sqrt(wx * wx + wy * wy);
  }

  const kinRange = thetaRange(config);
  const lo = -config.slotOffset;
  const hi = kinRange.max;

  if (apexRadius(lo) < housingRadius) return lo;
  if (apexRadius(hi) >= housingRadius) return hi;

  let a = lo, b = hi;
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    if (apexRadius(m) >= housingRadius) a = m; else b = m;
  }
  return a;
}

/**
 * Build a fully-populated IrisMechanismConfig from the stored (free-parameter)
 * subset, deriving pivotRadius and bladeCurvature from housingRadius.
 *
 * Accepts any object that contains the five free parameters — this includes
 * both StoredIrisParams (which also has `t`) and IrisMechanismConfig (which
 * also has pivotRadius/bladeCurvature). The `t` and derived fields are ignored.
 */
export function buildDerivedConfig(
  stored: Pick<StoredIrisParams, "N" | "pinDistance" | "slotOffset" | "bladeLength" | "bladeWidth">,
  housingRadius: number
): IrisMechanismConfig {
  const bladeCurvature = computeBladeCurvature(
    stored.bladeLength,
    stored.bladeWidth,
    housingRadius
  );
  return {
    N: stored.N,
    pivotRadius: housingRadius - stored.bladeWidth / 2,
    pinDistance: stored.pinDistance,
    slotOffset: stored.slotOffset,
    bladeLength: stored.bladeLength,
    bladeWidth: stored.bladeWidth,
    bladeCurvature,
  };
}

/**
 * Map a normalised openness value t ∈ [0, 1] to an actuator angle theta.
 *   t = 0 → theta = thetaOpen  (fully open, blades at housing wall)
 *   t = 1 → theta = thetaMax   (kinematic limit, most closed)
 */
export function tNormToTheta(
  t: number,
  thetaOpen: number,
  thetaMax: number
): number {
  return thetaOpen + t * (thetaMax - thetaOpen);
}

// ── Aperture inradius ─────────────────────────────────────────────────────────

/**
 * Compute the aperture inradius (inscribed-circle radius of the aperture polygon)
 * by finding where two adjacent blades' inner arcs intersect. The nearer
 * intersection point to the iris centre is the aperture vertex; its distance
 * equals the inradius.
 */
export function apertureInradius(theta: number, dc: IrisMechanismConfig): number {
  const blades = solveAllBlades(theta, dc);
  if (blades.length < 2) return 0;

  const { bladeLength: L, bladeWidth: W, bladeCurvature: C } = dc;
  const hw = W / 2;
  const cx = L / 2;

  if (C < 0.005) return 0;

  const s   = C * hw * 1.2;
  const Ro  = (cx * cx + s * s) / (2 * s);
  const cyL = Ro - s;
  const Ri  = Ro - hw;

  if (Ri <= 0) return 0;

  function arcCenter(b: (typeof blades)[0]) {
    const ca = Math.cos(b.bladeAngle), sa = Math.sin(b.bladeAngle);
    return {
      x: b.pivotPos.x + cx * ca - cyL * sa,
      y: b.pivotPos.y + cx * sa + cyL * ca,
    };
  }

  const c0 = arcCenter(blades[0]);
  const c1 = arcCenter(blades[1]);
  const dx  = c1.x - c0.x;
  const dy  = c1.y - c0.y;
  const d   = Math.sqrt(dx * dx + dy * dy);

  if (d < 0.001) return Ri;
  if (d >= 2 * Ri) return 0;

  const mx = (c0.x + c1.x) / 2;
  const my = (c0.y + c1.y) / 2;
  const h  = Math.sqrt(Math.max(0, Ri * Ri - (d / 2) * (d / 2)));
  const px = (-dy / d) * h;
  const py = ( dx / d) * h;

  return Math.min(Math.hypot(mx + px, my + py), Math.hypot(mx - px, my - py));
}

/**
 * Binary-search for the theta that produces a given aperture inradius.
 * Useful for mapping physical aperture diameter to a mechanism angle.
 */
export function findThetaForInradius(
  targetR: number,
  dc: IrisMechanismConfig,
  range: { min: number; max: number },
): number {
  let lo = range.min;
  let hi = range.max;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (apertureInradius(mid, dc) > targetR) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Find the actuator angle theta that produces the given f-stop.
 *
 * Uses the relationship  f = f_ref × (r_open / r)  where f_ref = 1.4 (f/1.4 at
 * maximum open) and r_open is the inradius at the fully-open position.
 * Solves by binary search over [range.min, range.max].
 */
export function findThetaForFStop(
  targetFStop: number,
  dc: IrisMechanismConfig,
  range: { min: number; max: number },
  openFStop = 1.4,
): number {
  const rOpen = apertureInradius(range.min, dc);
  if (rOpen <= 0) return range.min;
  const targetR = (openFStop * rOpen) / targetFStop;
  let lo = range.min;
  let hi = range.max;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (apertureInradius(mid, dc) > targetR) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Default config ────────────────────────────────────────────────────────────

/**
 * Reasonable starting configuration for a 7-blade iris.
 *
 * pivotRadius is overridden by page.tsx via derivedConfig (Rp = R_HOUSING − W/2 = 85).
 * The value stored here (85) is kept consistent for reference but is not used directly.
 *
 * For the d ≥ Rp branch (full [−δ, −δ+π] closing range), pinDistance must exceed
 * the derived Rp = R_HOUSING − W/2 = 85.
 * For near-zero aperture at kinRange.max, need d − Rp < hw:
 *   d < Rp + hw = 85 + 15 = 100.
 * d=88 gives guide-pin residual radius = 3 px, aperture < hw ≈ fully closed.
 */
export const DEFAULT_IRIS_CONFIG: IrisMechanismConfig = {
  N: 7,
  pivotRadius: 85,
  pinDistance: 88,
  slotOffset: Math.PI / 5, // 36°
  bladeLength: 115,
  bladeWidth: 30,
  bladeCurvature: 0.65,
};
