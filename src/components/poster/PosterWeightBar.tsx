// Per-lens bar colors matching PosterFocalRuler
const LENS_COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8"];

interface PosterWeightBarProps {
  weightG: number | [number, number] | undefined;
  maxWeightG: number;
  lensIndex: number;
}

/**
 * A thin horizontal bar normalised against the heaviest lens in the set.
 */
export function PosterWeightBar({
  weightG,
  maxWeightG,
  lensIndex,
}: PosterWeightBarProps) {
  if (!weightG || maxWeightG <= 0) return null;

  const primary = Array.isArray(weightG) ? weightG[0] : weightG;
  const fraction = Math.min(1, primary / maxWeightG);
  const color = LENS_COLORS[lensIndex] ?? LENS_COLORS[LENS_COLORS.length - 1];

  return (
    <div
      className="bg-zinc-100"
      style={{
        width: "100%",
        height: 3,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(4, fraction * 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
        }}
      />
    </div>
  );
}
