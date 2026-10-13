// No React: also used by server renderers (OG image, apple-icon).

export const R = 100;

export interface IrisPhenoParams {
  N: number;
  /**
   * Half-spread of the two inner blade tips around the arc midpoint.
   * The arc midpoint is always at step/2 (= 180°/N). With halfSpread h:
   *   trailing tip = step/2 − h×step
   *   leading  tip = step/2 + h×step
   *
   * Both visible side edges end up with the same angular span:
   *   (0.5 + overlap − halfSpread) × step
   * …so all N blade gaps are mathematically identical regardless of N or t.
   *
   * Range: [0, overlap + 0.5)
   *   0   → symmetric / no-sweep (both tips merge at arc midpoint)
   *   0.5 → moderate sweep, largest equal gaps
   *   →max → maximum sweep, gaps shrink toward zero
   */
  halfSpread: number;
  overlap: number;
  curve: number;
  twist: number;
}

function fmt(x: number, y: number) {
  return `${x.toFixed(3)},${y.toFixed(3)}`;
}

export function bladePath(t: number, p: IrisPhenoParams): string {
  const { N, halfSpread, overlap: OVERLAP, curve: CURVE, twist: TWIST } = p;
  const step = (2 * Math.PI) / N;
  const rInner = R * (0.08 + 0.72 * t);
  const arcStart = -OVERLAP * step;
  const arcEnd = step * (1 + OVERLAP);
  const largeArc = arcEnd - arcStart > Math.PI ? 1 : 0;
  const ax0 = R * Math.cos(arcStart);
  const ay0 = R * Math.sin(arcStart);
  const ax1 = R * Math.cos(arcEnd);
  const ay1 = R * Math.sin(arcEnd);
  const off = TWIST * (1 - t) * step;
  const p3Angle = step / 2 - halfSpread * step + off;
  const p2Angle = step / 2 + halfSpread * step + off;
  const p2x = rInner * Math.cos(p2Angle);
  const p2y = rInner * Math.sin(p2Angle);
  const p3x = rInner * Math.cos(p3Angle);
  const p3y = rInner * Math.sin(p3Angle);
  const pull = 1 + CURVE * 0.85;
  const cpTx = ((ax1 + p2x) / 2) * pull;
  const cpTy = ((ay1 + p2y) / 2) * pull;
  const cpLx = ((p3x + ax0) / 2) * pull;
  const cpLy = ((p3y + ay0) / 2) * pull;
  return [
    `M ${fmt(ax0, ay0)}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${fmt(ax1, ay1)}`,
    `Q ${fmt(cpTx, cpTy)} ${fmt(p2x, p2y)}`,
    `L ${fmt(p3x, p3y)}`,
    `Q ${fmt(cpLx, cpLy)} ${fmt(ax0, ay0)}`,
    `Z`,
  ].join(" ");
}

// Physical model: one rotation angle drives both aperture size and twist, as in a real lens.

export interface PhysicalIrisParams {
  N: number;
  /** Pivot pin radius as a fraction of R. Pivots sit on a circle of this radius. */
  pivotRadius: number;
  /** Blade length from pivot, as a fraction of R. >pivotRadius means blade reaches past center. */
  bladeReach: number;
  /** Angular half-width of blade at the outer ring, as a fraction of one step (360/N). >0.5 for overlap. */
  bladeSpan: number;
  /** Angular half-width of the inner blade tip, as a fraction of one step. Controls the "sweep" / petal shape. */
  tipWidth: number;
  /** Curvature of blade side edges: 0 = straight (polygonal aperture), 1 = maximally curved (rounder). */
  bladeCurve: number;
}

/** Maximum rotation angle (rad) — the angle at which the blade tip reaches the outer ring. */
export function physicalPhiMax(p: PhysicalIrisParams): number {
  const Rp = p.pivotRadius * R;
  const L = p.bladeReach * R;
  // From triangle (origin, pivot, tip): |tip| = R when fully open
  // R² = Rp² + L² − 2·Rp·L·cos(φmax)
  const cosVal = (Rp * Rp + L * L - R * R) / (2 * Rp * L);
  return Math.acos(Math.max(-1, Math.min(1, cosVal)));
}

/**
 * SVG path for blade 0 of a physically-modeled iris at openness t ∈ [0, 1].
 * Other blades: apply `rotate(i × 360/N)` around the origin.
 *
 * The blade is a rigid petal shape that rotates around pivot P₀ = (Rp, 0).
 * Path structure matches the parametric bladePath:
 *   M arcStart → A arcEnd → Q cp p2 → L p3 → Q cp arcStart → Z
 * with arc endpoints on circle R (pre-rotation), Bézier-curved side edges,
 * and two inner tips (p2 leading, p3 trailing).
 *
 * After rotation by φ around the pivot, arc endpoints drift off circle R,
 * so the outer arc uses a slightly inflated radius to ensure the blade
 * extends past the caller's clipPath (circle R) in every direction.
 */
export function physicalBladePath(t: number, p: PhysicalIrisParams): string {
  const { N, pivotRadius, bladeReach, bladeSpan, bladeCurve } = p;
  const step = (2 * Math.PI) / N;
  const Rp = pivotRadius * R;
  const L = bladeReach * R;

  const phi = t * physicalPhiMax(p);

  const tipX = Rp - L * Math.cos(phi);
  const tipY = -L * Math.sin(phi);

  // Outer arc endpoints stay on circle R, never rotated by the pivot.
  const halfA = bladeSpan * step;
  const largeArc = 2 * halfA > Math.PI ? 1 : 0;
  const ax0x = R * Math.cos(-halfA), ax0y = R * Math.sin(-halfA);
  const ax1x = R * Math.cos(+halfA), ax1y = R * Math.sin(+halfA);

  if (bladeCurve <= 0) {
    return [
      `M ${fmt(ax0x, ax0y)}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${fmt(ax1x, ax1y)}`,
      `L ${fmt(tipX, tipY)}`,
      `L ${fmt(ax0x, ax0y)}`,
      `Z`,
    ].join(" ");
  }

  // Each side edge is ONE cubic Bézier (C) from outer arc to tip.
  // Two CPs at 1/3 and 2/3 along the edge, displaced perpendicular to
  // the edge direction (outward from blade interior). This distributes
  // curvature uniformly along the entire edge — no straight segments.

  const ldx = tipX - ax1x, ldy = tipY - ax1y;
  const llen = Math.sqrt(ldx * ldx + ldy * ldy);
  // CW perpendicular = outward normal (exterior of CCW-wound path)
  const lnx = ldy / llen, lny = -ldx / llen;
  const lbulge = bladeCurve * llen * 0.3;

  const cp1Lx = ax1x + ldx / 3 + lnx * lbulge;
  const cp1Ly = ax1y + ldy / 3 + lny * lbulge;
  const cp2Lx = ax1x + 2 * ldx / 3 + lnx * lbulge;
  const cp2Ly = ax1y + 2 * ldy / 3 + lny * lbulge;

  const tdx = ax0x - tipX, tdy = ax0y - tipY;
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
  const tnx = tdy / tlen, tny = -tdx / tlen;
  const tbulge = bladeCurve * tlen * 0.3;

  const cp1Tx = tipX + tdx / 3 + tnx * tbulge;
  const cp1Ty = tipY + tdy / 3 + tny * tbulge;
  const cp2Tx = tipX + 2 * tdx / 3 + tnx * tbulge;
  const cp2Ty = tipY + 2 * tdy / 3 + tny * tbulge;

  return [
    `M ${fmt(ax0x, ax0y)}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${fmt(ax1x, ax1y)}`,
    `C ${fmt(cp1Lx, cp1Ly)} ${fmt(cp2Lx, cp2Ly)} ${fmt(tipX, tipY)}`,
    `C ${fmt(cp1Tx, cp1Ty)} ${fmt(cp2Tx, cp2Ty)} ${fmt(ax0x, ax0y)}`,
    `Z`,
  ].join(" ");
}

/**
 * Cover polygon points for a physical iris at openness t.
 * Connects the trailing inner tips (p3) of all N blades — used to hide shadow bleed.
 */
export function physicalCoverPoints(t: number, p: PhysicalIrisParams): string {
  const { N, pivotRadius, bladeReach } = p;
  const step = (2 * Math.PI) / N;
  const Rp = pivotRadius * R;
  const L = bladeReach * R;
  const phi = t * physicalPhiMax(p);

  const tipX = Rp - L * Math.cos(phi);
  const tipY = -L * Math.sin(phi);

  return Array.from({ length: N }, (_, i) => {
    const a = i * step;
    const x = tipX * Math.cos(a) - tipY * Math.sin(a);
    const y = tipX * Math.sin(a) + tipY * Math.cos(a);
    return `${x.toFixed(3)},${y.toFixed(3)}`;
  }).join(" ");
}

/**
 * SVG <path> d-string for the cover shape of a physical iris at openness t.
 * Each side is a cubic Bézier whose CPs are derived from the blade edge
 * tangent vectors at each tip — guaranteeing the cover boundary is tangent
 * to the blade edges, so the aperture opening curves match exactly.
 */
export function physicalCoverPath(t: number, p: PhysicalIrisParams): string {
  const { N, pivotRadius, bladeReach, bladeSpan, bladeCurve } = p;
  const step = (2 * Math.PI) / N;
  const Rp = pivotRadius * R;
  const L = bladeReach * R;
  const phi = t * physicalPhiMax(p);

  const tipX = Rp - L * Math.cos(phi);
  const tipY = -L * Math.sin(phi);

  const tips: [number, number][] = Array.from({ length: N }, (_, i) => {
    const a = i * step;
    return [
      tipX * Math.cos(a) - tipY * Math.sin(a),
      tipX * Math.sin(a) + tipY * Math.cos(a),
    ];
  });

  if (bladeCurve <= 0) {
    return tips.map(([x, y], i) =>
      i === 0 ? `M ${fmt(x, y)}` : `L ${fmt(x, y)}`
    ).join(" ") + " Z";
  }

  // Must match physicalBladePath's control points exactly.
  const halfA = bladeSpan * step;
  const ax0x = R * Math.cos(-halfA), ax0y = R * Math.sin(-halfA);
  const ax1x = R * Math.cos(+halfA), ax1y = R * Math.sin(+halfA);

  const ldx = tipX - ax1x, ldy = tipY - ax1y;
  const llen = Math.sqrt(ldx * ldx + ldy * ldy);
  const lnx = ldy / llen, lny = -ldx / llen;
  const lbulge = bladeCurve * llen * 0.3;

  const tdx = ax0x - tipX, tdy = ax0y - tipY;
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
  const tnx = tdy / tlen, tny = -tdx / tlen;
  const tbulge = bladeCurve * tlen * 0.3;

  const trailTanX = tdx / 3 + tnx * tbulge;
  const trailTanY = tdy / 3 + tny * tbulge;

  const leadArrX = -ldx / 3 + lnx * lbulge;
  const leadArrY = -ldy / 3 + lny * lbulge;

  // Slightly over 0.5 so the cover extends just past the blade edge.
  const k = 0.6;

  const parts: string[] = [`M ${fmt(tips[0][0], tips[0][1])}`];
  for (let i = 0; i < N; i++) {
    const [tx0, ty0] = tips[i];
    const [tx1, ty1] = tips[(i + 1) % N];

    const ai = i * step;
    const cosI = Math.cos(ai), sinI = Math.sin(ai);
    const cp1x = tx0 + k * (trailTanX * cosI - trailTanY * sinI);
    const cp1y = ty0 + k * (trailTanX * sinI + trailTanY * cosI);

    const ai1 = ((i + 1) % N) * step;
    const cosI1 = Math.cos(ai1), sinI1 = Math.sin(ai1);
    const cp2x = tx1 + k * (leadArrX * cosI1 - leadArrY * sinI1);
    const cp2y = ty1 + k * (leadArrX * sinI1 + leadArrY * cosI1);

    parts.push(`C ${fmt(cp1x, cp1y)} ${fmt(cp2x, cp2y)} ${fmt(tx1, ty1)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

export function coverPoints(t: number, p: IrisPhenoParams): string {
  const { N, halfSpread, twist: TWIST } = p;
  const step = (2 * Math.PI) / N;
  const rInner = R * (0.08 + 0.72 * t);
  const off = TWIST * (1 - t) * step;
  // Vertex i = trailing tip of blade i = step/2 − halfSpread×step + i×step + off
  return Array.from({ length: N }, (_, i) => {
    const a = i * step + (0.5 - halfSpread) * step + off;
    return `${(rInner * Math.cos(a)).toFixed(3)},${(rInner * Math.sin(a)).toFixed(3)}`;
  }).join(" ");
}
