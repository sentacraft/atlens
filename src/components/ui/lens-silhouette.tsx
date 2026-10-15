import { cn } from "@/lib/utils";

/** A generic lens in side view, matching the angle of the catalog's product photos. */
export function LensSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className={cn("fill-zinc-300 dark:fill-zinc-700", className)}>
      <rect x="5" y="16" width="4" height="12" rx="1" />
      <rect x="9" y="12" width="21" height="20" rx="2.5" />
      <rect x="30" y="10" width="9" height="24" rx="2.5" />
      <rect x="14" y="12" width="1.5" height="20" className="fill-zinc-200 dark:fill-zinc-800" />
      <rect x="18" y="12" width="1.5" height="20" className="fill-zinc-200 dark:fill-zinc-800" />
      <rect x="22" y="12" width="1.5" height="20" className="fill-zinc-200 dark:fill-zinc-800" />
    </svg>
  );
}
