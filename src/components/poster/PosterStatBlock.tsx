import { cn } from "@/lib/utils";

interface PosterStatBlockProps {
  value: string | null | undefined;
  label: string;
  valueClassName?: string;
  /** Footnote superscript number to render after the value. */
  sup?: number;
}

/**
 * A single centered stat: large value + small label beneath.
 * Renders an empty div when value is absent to maintain grid structure.
 */
export function PosterStatBlock({ value, label, valueClassName, sup }: PosterStatBlockProps) {
  if (!value) {
    return (
      <div className="flex flex-col items-center text-center gap-1">
        <span className={cn("font-semibold tabular-nums leading-tight text-zinc-300", valueClassName)}>
          —
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-300">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-1">
      <span className={cn("font-semibold tabular-nums text-zinc-900 leading-tight", valueClassName)}>
        {value}
        {sup !== undefined && (
          <span className="text-zinc-400" style={{ fontSize: "0.55em", verticalAlign: "super", marginLeft: 1, fontWeight: 500 }}>
            {sup}
          </span>
        )}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</span>
    </div>
  );
}
