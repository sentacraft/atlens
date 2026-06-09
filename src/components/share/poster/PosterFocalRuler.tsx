import type { Lens } from "@/lib/types";

// Per-lens bar colors (zinc-900 → zinc-500 → zinc-400 → zinc-300)
const LENS_COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8"];

// Standard focal length reference ticks
const TICK_CANDIDATES = [10, 14, 18, 24, 35, 50, 70, 100, 135, 200, 300, 400];

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Right-side label column dimensions
const LABEL_W = 158;
const LABEL_GAP = 14;

// Row dimensions — tall enough to fit a two-line label
const ROW_H = 32;
const BAR_H = 6;
const TICK_AREA = 24;

export interface FocalLensLabel {
  brand: string;
  focal: string;
}

interface PosterFocalRulerProps {
  lenses: Lens[];
  lensLabels: FocalLensLabel[];
  /** Total width available (matches poster content width). */
  width?: number;
}

export function PosterFocalRuler({ lenses, lensLabels, width = 670 }: PosterFocalRulerProps) {
  const n = lenses.length;
  const TRACK_W = width - LABEL_W - LABEL_GAP;

  const rawMin = Math.min(...lenses.map((l) => l.focalLengthMin));
  const rawMax = Math.max(...lenses.map((l) => l.focalLengthMax));
  const viewMin = Math.max(1, rawMin * 0.85);
  const viewMax = rawMax * 1.08;
  const logMin = Math.log10(viewMin);
  const logMax = Math.log10(viewMax);

  const toX = (mm: number) =>
    ((Math.log10(Math.max(1, mm)) - logMin) / (logMax - logMin)) * TRACK_W;

  const barsH = n * ROW_H;
  const totalH = barsH + 6 + TICK_AREA; // 6px gap before tick area

  const visibleTicks = TICK_CANDIDATES.filter(
    (mm) => mm >= viewMin * 0.92 && mm <= viewMax * 1.05
  );

  return (
    <svg
      width={width}
      height={totalH}
      viewBox={`0 0 ${width} ${totalH}`}
      style={{ overflow: "visible" }}
    >
      {/* Per-lens rows */}
      {lenses.map((lens, i) => {
        const rowY = i * ROW_H;
        // Bar vertically centered in the row
        const barY = rowY + (ROW_H - BAR_H) / 2;
        const x1 = toX(lens.focalLengthMin);
        const x2 = toX(lens.focalLengthMax);
        const color = LENS_COLORS[i] ?? LENS_COLORS[LENS_COLORS.length - 1];
        const isPrime = lens.focalLengthMin === lens.focalLengthMax;
        const labelX = TRACK_W + LABEL_GAP;
        const { brand, focal } = lensLabels[i] ?? { brand: "", focal: "" };

        return (
          <g key={i}>
            {/* Focal range bar */}
            {isPrime ? (
              <rect
                x={Math.max(0, x1 - 1.5)}
                y={barY}
                width={3}
                height={BAR_H}
                rx={1.5}
                fill={color}
              />
            ) : (
              <rect
                x={x1}
                y={barY}
                width={Math.max(4, x2 - x1)}
                height={BAR_H}
                rx={BAR_H / 2}
                fill={color}
              />
            )}

            {/* Brand name — small-caps style, above bar */}
            <text
              x={labelX}
              y={rowY + 11}
              fontSize={8}
              className="fill-zinc-400"
              fontFamily={FONT_STACK}
              style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              {brand}
            </text>

            {/* Focal range + aperture — bold, below bar */}
            <text
              x={labelX}
              y={rowY + 24}
              fontSize={10}
              className="fill-zinc-900"
              fontFamily={FONT_STACK}
              style={{ fontWeight: 600 }}
            >
              {focal}
            </text>
          </g>
        );
      })}

      {/* Tick marks and mm labels */}
      {visibleTicks.map((mm) => {
        const x = toX(mm);
        return (
          <g key={mm}>
            <line
              x1={x}
              y1={barsH + 4}
              x2={x}
              y2={barsH + 8}
              className="stroke-zinc-300"
              strokeWidth={1}
            />
            <text
              x={x}
              y={barsH + 6 + TICK_AREA}
              textAnchor="middle"
              fontSize={9}
              className="fill-zinc-400"
              fontFamily={FONT_STACK}
            >
              {mm}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
