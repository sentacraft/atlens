import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PosterFeatureItemProps {
  present: boolean | "partial" | null | undefined;
  label: string;
  /** Optional sub-label appended when present, e.g. "5-stop" for OIS. */
  sub?: string;
  /** Footnote superscript number to render after the label. */
  sup?: number;
  /** Optional Lucide icon rendered between the state symbol and the label. */
  icon?: LucideIcon;
}

export function PosterFeatureItem({ present, label, sub, sup, icon: Icon }: PosterFeatureItemProps) {
  const isPresent = present === true || present === "partial";
  const isPartial = present === "partial";

  return (
    <div className="flex items-center gap-1.5">
      {/* State indicator: ✓ / ~ / — */}
      <span
        className={cn(
          "w-3 shrink-0 text-center text-sm font-semibold tabular-nums leading-none",
          isPresent ? "text-zinc-900" : "text-zinc-300"
        )}
      >
        {isPresent ? (isPartial ? "~" : "✓") : "—"}
      </span>

      {/* Feature icon */}
      {Icon && (
        <Icon
          size={11}
          strokeWidth={1.75}
          className={cn("shrink-0", isPresent ? "text-zinc-500" : "text-zinc-300")}
        />
      )}

      {/* Label text */}
      <span
        className={cn("text-xs leading-tight", isPresent ? "text-zinc-700" : "text-zinc-400")}
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
        {sub && isPresent && (
          <span className="text-zinc-400"> · {sub}</span>
        )}
        {sup !== undefined && (
          <span className="text-zinc-400" style={{ fontSize: "0.7em", verticalAlign: "super", marginLeft: 1 }}>
            {sup}
          </span>
        )}
      </span>
    </div>
  );
}
