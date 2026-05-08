function SkeletonLensColumn() {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 border-l border-zinc-200 dark:border-zinc-800">
      {/* Image */}
      <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      {/* Brand */}
      <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      {/* Model name */}
      <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      <div className="h-4 w-14 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    </div>
  );
}

const SPEC_ROW_COUNTS = [3, 4, 3, 5, 3];

export default function CompareLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Back button */}
        <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        {/* Title */}
        <div className="hidden sm:block h-8 w-28 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        {/* Share button — right-aligned */}
        <div className="ml-auto h-9 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Column headers */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {/* Row label column */}
          <div className="w-28 sm:w-36 shrink-0 border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 sm:px-4 sm:py-3">
            <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
          <SkeletonLensColumn />
          <SkeletonLensColumn />
        </div>

        {/* Spec group rows */}
        {SPEC_ROW_COUNTS.map((rowCount, groupIdx) => (
          <div key={groupIdx}>
            {/* Group header */}
            <div className="border-b border-zinc-100 bg-zinc-100/80 dark:border-zinc-800/60 dark:bg-zinc-800/60 px-3 py-2 sm:px-4">
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </div>
            {/* Spec rows */}
            {Array.from({ length: rowCount }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="flex border-b border-zinc-100 dark:border-zinc-800/60 last:border-b-0"
              >
                {/* Row label */}
                <div className="w-28 sm:w-36 shrink-0 border-r border-zinc-100 dark:border-zinc-800 px-3 py-2.5 sm:px-4">
                  <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
                {/* Cell 1 */}
                <div className="flex-1 border-l border-zinc-100 dark:border-zinc-800 px-3 py-2.5 sm:px-4">
                  <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
                {/* Cell 2 */}
                <div className="flex-1 border-l border-zinc-100 dark:border-zinc-800 px-3 py-2.5 sm:px-4">
                  <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
